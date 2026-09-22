-- =============================================================================
-- ZiquiDisfraces · 02 · Funciones: roles, triggers, disponibilidad, operaciones de negocio, vistas, reportes
--
-- Convenciones:
--   * Errores de negocio: RAISE EXCEPTION (SQLSTATE P0001) con mensaje en español apto para mostrar al usuario.
--   * Errores de permisos: SQLSTATE 42501.
--   * app_private.*_impl: lógica sin chequeo de rol (la usan los wrappers públicos y el seed).
--   * public.<rpc>: wrapper SECURITY DEFINER que verifica rol y delega en la implementación.
--   * Toda función con search_path = '' y nombres totalmente calificados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
create or replace function public.rol_actual()
returns public.app_rol
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol from public.profiles p where p.id = auth.uid() and p.activo;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rol_actual() is not null;
$$;

create or replace function app_private.exigir_staff()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'No tenés permisos para realizar esta operación' using errcode = '42501';
  end if;
end;
$$;

create or replace function app_private.exigir_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede realizar esta operación' using errcode = '42501';
  end if;
end;
$$;

-- Alta automática de perfil. El primer usuario del sistema queda como admin activo;
-- los siguientes quedan como empleado INACTIVO hasta que un admin los habilite.
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hay_admin boolean;
begin
  select exists (select 1 from public.profiles where rol = 'admin') into v_hay_admin;

  insert into public.profiles (id, email, nombre, rol, activo)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when v_hay_admin then 'empleado'::public.app_rol else 'admin'::public.app_rol end,
    not v_hay_admin
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Protección de stock: las cantidades solo cambian dentro de funciones de stock.
-- -----------------------------------------------------------------------------
create or replace function app_private.habilitar_operacion_stock()
returns void
language sql
volatile
set search_path = ''
as $$
  select set_config('app.stock_rpc', 'on', true);
$$;

create or replace function app_private.normalizar_stock_inicial()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Fuera de una función de stock, un alta siempre arranca con todo disponible.
  -- (La condición va inline: los triggers corren con el rol del usuario, sin acceso a app_private.)
  if coalesce(current_setting('app.stock_rpc', true), '') <> 'on' then
    new.cantidad_disponible := new.cantidad_total;
    new.cantidad_alquilada := 0;
    new.cantidad_mantenimiento := 0;
    new.cantidad_extraviada := 0;
  end if;
  new.codigo := upper(btrim(new.codigo));
  return new;
end;
$$;

create trigger disfraces_normalizar_stock_inicial
  before insert on public.disfraces
  for each row execute function app_private.normalizar_stock_inicial();

create or replace function app_private.proteger_cantidades()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.cantidad_total, new.cantidad_disponible, new.cantidad_alquilada,
      new.cantidad_mantenimiento, new.cantidad_extraviada)
     is distinct from
     (old.cantidad_total, old.cantidad_disponible, old.cantidad_alquilada,
      old.cantidad_mantenimiento, old.cantidad_extraviada)
     and coalesce(current_setting('app.stock_rpc', true), '') <> 'on' then
    raise exception 'Las cantidades solo pueden modificarse mediante movimientos de stock';
  end if;
  new.codigo := upper(btrim(new.codigo));
  return new;
end;
$$;

create trigger disfraces_proteger_cantidades
  before update on public.disfraces
  for each row execute function app_private.proteger_cantidades();

create or replace function app_private.registrar_alta_disfraz()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cantidad_total > 0 then
    insert into public.movimientos_stock (disfraz_id, tipo, cantidad, motivo, usuario_id)
    values (new.id, 'alta', new.cantidad_total, 'Alta inicial del disfraz', auth.uid());
  end if;
  return null;
end;
$$;

create trigger disfraces_registrar_alta
  after insert on public.disfraces
  for each row execute function app_private.registrar_alta_disfraz();

-- -----------------------------------------------------------------------------
-- Pagos → alquileres.monto_pagado
-- -----------------------------------------------------------------------------
create or replace function app_private.recalcular_monto_pagado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.alquileres a
       set monto_pagado = coalesce((select sum(p.monto) from public.pagos p where p.alquiler_id = new.alquiler_id), 0)
     where a.id = new.alquiler_id;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.alquiler_id is distinct from new.alquiler_id) then
    update public.alquileres a
       set monto_pagado = coalesce((select sum(p.monto) from public.pagos p where p.alquiler_id = old.alquiler_id), 0)
     where a.id = old.alquiler_id;
  end if;
  return null;
end;
$$;

create trigger pagos_recalcular_monto_pagado
  after insert or update or delete on public.pagos
  for each row execute function app_private.recalcular_monto_pagado();

-- -----------------------------------------------------------------------------
-- Disponibilidad por rango de fechas
--   capacidad = total − mantenimiento − extraviada
--   uso(día)  = alquileres activos que cubren el día + reservas vigentes que cubren el día
--   disponible = capacidad − máximo uso diario en el rango
-- Un alquiler vencido se considera ocupando hasta max(fecha_devolucion, hoy).
-- -----------------------------------------------------------------------------
create or replace function public.disponibilidad_rango(
  p_inicio date,
  p_fin date,
  p_excluir_reserva_id uuid default null,
  p_disfraz_ids uuid[] default null
)
returns table (disfraz_id uuid, disponible integer)
language sql
stable
set search_path = ''
as $$
  with dias as (
    select generate_series(
      greatest(p_inicio, public.hoy()),
      greatest(p_fin, public.hoy()),
      interval '1 day'
    )::date as dia
  ),
  uso as (
    select x.disfraz_id, x.dia, sum(x.cantidad) as usado
    from (
      select ai.disfraz_id, d.dia, ai.cantidad
      from dias d
      join public.alquileres a
        on a.estado = 'activo'
       and d.dia between a.fecha_alquiler and greatest(a.fecha_devolucion, public.hoy())
      join public.alquiler_items ai on ai.alquiler_id = a.id
      where p_disfraz_ids is null or ai.disfraz_id = any (p_disfraz_ids)
      union all
      select ri.disfraz_id, d.dia, ri.cantidad
      from dias d
      join public.reservas r
        on r.estado in ('pendiente', 'confirmada')
       and d.dia between r.fecha_inicio and r.fecha_fin
       and (p_excluir_reserva_id is null or r.id <> p_excluir_reserva_id)
      join public.reserva_items ri on ri.reserva_id = r.id
      where p_disfraz_ids is null or ri.disfraz_id = any (p_disfraz_ids)
    ) x
    group by x.disfraz_id, x.dia
  ),
  pico as (
    select u.disfraz_id, max(u.usado) as pico from uso u group by u.disfraz_id
  )
  select
    d.id as disfraz_id,
    (d.cantidad_total - d.cantidad_mantenimiento - d.cantidad_extraviada - coalesce(p.pico, 0))::integer as disponible
  from public.disfraces d
  left join pico p on p.disfraz_id = d.id
  where d.activo
    and (p_disfraz_ids is null or d.id = any (p_disfraz_ids));
$$;

create or replace function public.disponibilidad_disfraz(
  p_disfraz_id uuid,
  p_inicio date,
  p_fin date,
  p_excluir_reserva_id uuid default null
)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select r.disponible
       from public.disponibilidad_rango(p_inicio, p_fin, p_excluir_reserva_id, array[p_disfraz_id]) r),
    0
  );
$$;

-- -----------------------------------------------------------------------------
-- Alquileres
-- p_items: [{ "disfraz_id": "<uuid>", "cantidad": <int> }]
-- -----------------------------------------------------------------------------
create or replace function app_private.crear_alquiler_impl(
  p_cliente_id uuid,
  p_fecha_devolucion date,
  p_items jsonb,
  p_sena numeric default 0,
  p_metodo_pago public.metodo_pago default 'efectivo',
  p_observaciones text default null,
  p_fecha_alquiler date default null,
  p_reserva_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_fecha_alquiler date := coalesce(p_fecha_alquiler, public.hoy());
  v_sena numeric(12, 2) := coalesce(p_sena, 0);
  v_alquiler_id uuid;
  v_item record;
  v_disfraz public.disfraces%rowtype;
  v_reserva public.reservas%rowtype;
  v_disponible integer;
  v_total numeric(12, 2) := 0;
begin
  perform app_private.habilitar_operacion_stock();

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El alquiler debe incluir al menos un disfraz';
  end if;
  if v_fecha_alquiler > public.hoy() then
    raise exception 'La fecha de alquiler no puede ser futura: para fechas futuras registrá una reserva';
  end if;
  if p_fecha_devolucion is null or p_fecha_devolucion < v_fecha_alquiler then
    raise exception 'La fecha de devolución debe ser igual o posterior a la fecha de alquiler';
  end if;
  if v_sena < 0 then
    raise exception 'La seña no puede ser negativa';
  end if;

  perform 1 from public.clientes c where c.id = p_cliente_id and c.activo;
  if not found then
    raise exception 'El cliente no existe o está dado de baja';
  end if;

  if p_reserva_id is not null then
    select * into v_reserva from public.reservas r where r.id = p_reserva_id for update;
    if not found then
      raise exception 'La reserva no existe';
    end if;
    if v_reserva.estado not in ('pendiente', 'confirmada') then
      raise exception 'La reserva no está vigente (estado: %)', v_reserva.estado;
    end if;
    if v_reserva.cliente_id <> p_cliente_id then
      raise exception 'La reserva pertenece a otro cliente';
    end if;
  end if;

  insert into public.alquileres (cliente_id, reserva_id, fecha_alquiler, fecha_devolucion, observaciones, created_by)
  values (p_cliente_id, p_reserva_id, v_fecha_alquiler, p_fecha_devolucion, nullif(btrim(p_observaciones), ''), auth.uid())
  returning id into v_alquiler_id;

  -- Se agrupa por disfraz y se bloquea en orden de id para evitar deadlocks entre operaciones concurrentes.
  for v_item in
    select (e ->> 'disfraz_id')::uuid as disfraz_id, sum((e ->> 'cantidad')::integer) as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_item.disfraz_id is null or v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cada disfraz debe tener una cantidad mayor a cero';
    end if;

    select * into v_disfraz from public.disfraces d where d.id = v_item.disfraz_id for update;
    if not found or not v_disfraz.activo then
      raise exception 'Uno de los disfraces seleccionados no existe o está dado de baja';
    end if;

    if v_disfraz.cantidad_disponible < v_item.cantidad then
      raise exception 'Stock insuficiente para "%" (%): disponibles %, solicitados %',
        v_disfraz.nombre, v_disfraz.codigo, v_disfraz.cantidad_disponible, v_item.cantidad;
    end if;

    v_disponible := public.disponibilidad_disfraz(v_item.disfraz_id, v_fecha_alquiler, p_fecha_devolucion, p_reserva_id);
    if v_disponible < v_item.cantidad then
      raise exception 'Conflicto con reservas para "%" (%) entre el % y el %: disponibles %, solicitados %',
        v_disfraz.nombre, v_disfraz.codigo,
        to_char(v_fecha_alquiler, 'DD/MM/YYYY'), to_char(p_fecha_devolucion, 'DD/MM/YYYY'),
        greatest(v_disponible, 0), v_item.cantidad;
    end if;

    insert into public.alquiler_items (alquiler_id, disfraz_id, cantidad, precio_unitario)
    values (v_alquiler_id, v_item.disfraz_id, v_item.cantidad, v_disfraz.precio_alquiler);

    update public.disfraces d
       set cantidad_disponible = d.cantidad_disponible - v_item.cantidad,
           cantidad_alquilada = d.cantidad_alquilada + v_item.cantidad
     where d.id = v_item.disfraz_id;

    insert into public.movimientos_stock (disfraz_id, tipo, cantidad, alquiler_id, motivo, usuario_id)
    values (v_item.disfraz_id, 'alquiler', v_item.cantidad, v_alquiler_id, 'Alquiler', auth.uid());

    v_total := v_total + v_item.cantidad * v_disfraz.precio_alquiler;
  end loop;

  if v_sena > v_total then
    raise exception 'La seña (%) no puede superar el total del alquiler (%)', v_sena, v_total;
  end if;

  update public.alquileres a set monto_total = v_total, sena = v_sena where a.id = v_alquiler_id;

  if v_sena > 0 then
    insert into public.pagos (alquiler_id, fecha, monto, tipo, metodo, observaciones, created_by)
    values (v_alquiler_id, v_fecha_alquiler, v_sena, 'sena', coalesce(p_metodo_pago, 'efectivo'), 'Seña del alquiler', auth.uid());
  end if;

  if p_reserva_id is not null then
    update public.reservas r set estado = 'convertida', alquiler_id = v_alquiler_id where r.id = p_reserva_id;
  end if;

  return v_alquiler_id;
end;
$$;

create or replace function public.crear_alquiler(
  p_cliente_id uuid,
  p_fecha_devolucion date,
  p_items jsonb,
  p_sena numeric default 0,
  p_metodo_pago public.metodo_pago default 'efectivo',
  p_observaciones text default null,
  p_fecha_alquiler date default null,
  p_reserva_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_staff();
  return app_private.crear_alquiler_impl(
    p_cliente_id, p_fecha_devolucion, p_items, p_sena, p_metodo_pago,
    p_observaciones, p_fecha_alquiler, p_reserva_id
  );
end;
$$;

create or replace function app_private.cancelar_alquiler_impl(p_alquiler_id uuid, p_motivo text default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_alquiler public.alquileres%rowtype;
  v_item record;
begin
  perform app_private.habilitar_operacion_stock();

  select * into v_alquiler from public.alquileres a where a.id = p_alquiler_id for update;
  if not found then
    raise exception 'El alquiler no existe';
  end if;
  if v_alquiler.estado <> 'activo' then
    raise exception 'Solo se pueden cancelar alquileres activos';
  end if;

  for v_item in
    select ai.disfraz_id, ai.cantidad from public.alquiler_items ai
    where ai.alquiler_id = p_alquiler_id
    order by ai.disfraz_id
  loop
    perform 1 from public.disfraces d where d.id = v_item.disfraz_id for update;
    update public.disfraces d
       set cantidad_alquilada = d.cantidad_alquilada - v_item.cantidad,
           cantidad_disponible = d.cantidad_disponible + v_item.cantidad
     where d.id = v_item.disfraz_id;
    insert into public.movimientos_stock (disfraz_id, tipo, cantidad, alquiler_id, motivo, usuario_id)
    values (v_item.disfraz_id, 'cancelacion_alquiler', v_item.cantidad, p_alquiler_id,
            coalesce(nullif(btrim(p_motivo), ''), 'Cancelación de alquiler'), auth.uid());
  end loop;

  update public.alquileres a
     set estado = 'cancelado',
         observaciones = case
           when nullif(btrim(p_motivo), '') is null then a.observaciones
           else concat_ws(E'\n', a.observaciones, 'Cancelado: ' || btrim(p_motivo))
         end
   where a.id = p_alquiler_id;
end;
$$;

create or replace function public.cancelar_alquiler(p_alquiler_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_admin();
  perform app_private.cancelar_alquiler_impl(p_alquiler_id, p_motivo);
end;
$$;

-- -----------------------------------------------------------------------------
-- Pagos
-- -----------------------------------------------------------------------------
create or replace function app_private.registrar_pago_impl(
  p_alquiler_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago default 'efectivo',
  p_tipo public.tipo_pago default 'saldo',
  p_fecha date default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_alquiler public.alquileres%rowtype;
  v_pago_id uuid;
begin
  select * into v_alquiler from public.alquileres a where a.id = p_alquiler_id for update;
  if not found then
    raise exception 'El alquiler no existe';
  end if;
  if v_alquiler.estado = 'cancelado' then
    raise exception 'No se pueden registrar pagos en un alquiler cancelado';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto del pago debe ser mayor a cero';
  end if;
  if p_monto > v_alquiler.saldo_pendiente then
    raise exception 'El pago (%) supera el saldo pendiente (%)', p_monto, v_alquiler.saldo_pendiente;
  end if;

  insert into public.pagos (alquiler_id, fecha, monto, tipo, metodo, observaciones, created_by)
  values (p_alquiler_id, coalesce(p_fecha, public.hoy()), p_monto, coalesce(p_tipo, 'saldo'),
          coalesce(p_metodo, 'efectivo'), nullif(btrim(p_observaciones), ''), auth.uid())
  returning id into v_pago_id;

  return v_pago_id;
end;
$$;

create or replace function public.registrar_pago(
  p_alquiler_id uuid,
  p_monto numeric,
  p_metodo public.metodo_pago default 'efectivo',
  p_tipo public.tipo_pago default 'saldo',
  p_fecha date default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_staff();
  return app_private.registrar_pago_impl(p_alquiler_id, p_monto, p_metodo, p_tipo, p_fecha, p_observaciones);
end;
$$;

-- -----------------------------------------------------------------------------
-- Devoluciones
-- p_items: [{ "alquiler_item_id": "<uuid>", "cantidad_ok": n, "cantidad_danada": n,
--             "cantidad_faltante": n, "observaciones": "..." }]  (uno por cada item del alquiler)
-- -----------------------------------------------------------------------------
create or replace function app_private.registrar_devolucion_impl(
  p_alquiler_id uuid,
  p_items jsonb,
  p_fecha_devolucion_real date default null,
  p_costo_reparacion numeric default 0,
  p_costo_reposicion numeric default 0,
  p_observaciones text default null,
  p_monto_cobrado numeric default 0,
  p_metodo_pago public.metodo_pago default 'efectivo'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_alquiler public.alquileres%rowtype;
  v_fecha date := coalesce(p_fecha_devolucion_real, public.hoy());
  v_reparacion numeric(12, 2) := coalesce(p_costo_reparacion, 0);
  v_reposicion numeric(12, 2) := coalesce(p_costo_reposicion, 0);
  v_cobrado numeric(12, 2) := coalesce(p_monto_cobrado, 0);
  v_devolucion_id uuid;
  v_item record;
  v_total_danada integer := 0;
  v_total_faltante integer := 0;
  v_estado public.estado_devolucion;
  v_items_alquiler integer;
  v_items_recibidos integer;
begin
  perform app_private.habilitar_operacion_stock();

  select * into v_alquiler from public.alquileres a where a.id = p_alquiler_id for update;
  if not found then
    raise exception 'El alquiler no existe';
  end if;
  if v_alquiler.estado <> 'activo' then
    raise exception 'Solo se pueden devolver alquileres activos (estado actual: %)', v_alquiler.estado;
  end if;
  if v_fecha < v_alquiler.fecha_alquiler then
    raise exception 'La fecha de devolución no puede ser anterior a la fecha de alquiler';
  end if;
  if v_fecha > public.hoy() then
    raise exception 'La fecha de devolución no puede ser futura';
  end if;
  if v_reparacion < 0 or v_reposicion < 0 or v_cobrado < 0 then
    raise exception 'Los importes no pueden ser negativos';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Debe indicarse el estado de cada disfraz devuelto';
  end if;

  select count(*) into v_items_alquiler from public.alquiler_items ai where ai.alquiler_id = p_alquiler_id;
  select count(distinct (e ->> 'alquiler_item_id')) into v_items_recibidos from jsonb_array_elements(p_items) e;
  if v_items_recibidos <> v_items_alquiler or jsonb_array_length(p_items) <> v_items_alquiler then
    raise exception 'Debe informarse cada disfraz del alquiler exactamente una vez';
  end if;

  insert into public.devoluciones (alquiler_id, fecha_devolucion_real, costo_reparacion, costo_reposicion, observaciones, created_by)
  values (p_alquiler_id, v_fecha, v_reparacion, v_reposicion, nullif(btrim(p_observaciones), ''), auth.uid())
  returning id into v_devolucion_id;

  for v_item in
    select
      ai.id as alquiler_item_id,
      ai.disfraz_id,
      ai.cantidad,
      coalesce((e ->> 'cantidad_ok')::integer, 0) as ok,
      coalesce((e ->> 'cantidad_danada')::integer, 0) as danada,
      coalesce((e ->> 'cantidad_faltante')::integer, 0) as faltante,
      nullif(btrim(e ->> 'observaciones'), '') as observaciones
    from jsonb_array_elements(p_items) e
    left join public.alquiler_items ai
      on ai.id = (e ->> 'alquiler_item_id')::uuid and ai.alquiler_id = p_alquiler_id
    order by ai.disfraz_id
  loop
    if v_item.alquiler_item_id is null then
      raise exception 'Uno de los items informados no pertenece a este alquiler';
    end if;
    if v_item.ok < 0 or v_item.danada < 0 or v_item.faltante < 0 then
      raise exception 'Las cantidades devueltas no pueden ser negativas';
    end if;
    if v_item.ok + v_item.danada + v_item.faltante <> v_item.cantidad then
      raise exception 'Las cantidades informadas (% + % + %) no suman lo alquilado (%)',
        v_item.ok, v_item.danada, v_item.faltante, v_item.cantidad;
    end if;

    perform 1 from public.disfraces d where d.id = v_item.disfraz_id for update;
    update public.disfraces d
       set cantidad_alquilada = d.cantidad_alquilada - v_item.cantidad,
           cantidad_disponible = d.cantidad_disponible + v_item.ok,
           cantidad_mantenimiento = d.cantidad_mantenimiento + v_item.danada,
           cantidad_extraviada = d.cantidad_extraviada + v_item.faltante
     where d.id = v_item.disfraz_id;

    insert into public.devolucion_items
      (devolucion_id, alquiler_item_id, disfraz_id, cantidad_ok, cantidad_danada, cantidad_faltante, observaciones)
    values
      (v_devolucion_id, v_item.alquiler_item_id, v_item.disfraz_id, v_item.ok, v_item.danada, v_item.faltante, v_item.observaciones);

    if v_item.ok > 0 then
      insert into public.movimientos_stock (disfraz_id, tipo, cantidad, alquiler_id, devolucion_id, motivo, usuario_id)
      values (v_item.disfraz_id, 'devolucion', v_item.ok, p_alquiler_id, v_devolucion_id, 'Devolución en buen estado', auth.uid());
    end if;
    if v_item.danada > 0 then
      insert into public.movimientos_stock (disfraz_id, tipo, cantidad, alquiler_id, devolucion_id, motivo, usuario_id)
      values (v_item.disfraz_id, 'a_mantenimiento', v_item.danada, p_alquiler_id, v_devolucion_id,
              coalesce(v_item.observaciones, 'Devuelto con daños'), auth.uid());
    end if;
    if v_item.faltante > 0 then
      insert into public.movimientos_stock (disfraz_id, tipo, cantidad, alquiler_id, devolucion_id, motivo, usuario_id)
      values (v_item.disfraz_id, 'extraviado', v_item.faltante, p_alquiler_id, v_devolucion_id,
              coalesce(v_item.observaciones, 'Faltante en devolución'), auth.uid());
    end if;

    v_total_danada := v_total_danada + v_item.danada;
    v_total_faltante := v_total_faltante + v_item.faltante;
  end loop;

  v_estado := case
    when v_total_danada > 0 and v_total_faltante > 0 then 'con_danos_y_faltantes'
    when v_total_danada > 0 then 'con_danos'
    when v_total_faltante > 0 then 'con_faltantes'
    else 'bueno'
  end;

  update public.devoluciones dv set estado_disfraz = v_estado where dv.id = v_devolucion_id;

  update public.alquileres a
     set estado = 'devuelto',
         fecha_devolucion_real = v_fecha,
         cargos_adicionales = a.cargos_adicionales + v_reparacion + v_reposicion
   where a.id = p_alquiler_id;

  if v_cobrado > 0 then
    perform app_private.registrar_pago_impl(p_alquiler_id, v_cobrado, p_metodo_pago, 'saldo', v_fecha, 'Cobro al registrar la devolución');
  end if;

  return v_devolucion_id;
end;
$$;

create or replace function public.registrar_devolucion(
  p_alquiler_id uuid,
  p_items jsonb,
  p_fecha_devolucion_real date default null,
  p_costo_reparacion numeric default 0,
  p_costo_reposicion numeric default 0,
  p_observaciones text default null,
  p_monto_cobrado numeric default 0,
  p_metodo_pago public.metodo_pago default 'efectivo'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_staff();
  return app_private.registrar_devolucion_impl(
    p_alquiler_id, p_items, p_fecha_devolucion_real, p_costo_reparacion,
    p_costo_reposicion, p_observaciones, p_monto_cobrado, p_metodo_pago
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Reservas
-- -----------------------------------------------------------------------------
create or replace function app_private.crear_reserva_impl(
  p_cliente_id uuid,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_items jsonb,
  p_estado public.estado_reserva default 'pendiente',
  p_observaciones text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_reserva_id uuid;
  v_item record;
  v_disfraz public.disfraces%rowtype;
  v_disponible integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La reserva debe incluir al menos un disfraz';
  end if;
  if p_fecha_inicio is null or p_fecha_inicio < public.hoy() then
    raise exception 'La reserva debe comenzar hoy o en una fecha futura';
  end if;
  if p_fecha_fin is null or p_fecha_fin < p_fecha_inicio then
    raise exception 'La fecha de fin debe ser igual o posterior a la de inicio';
  end if;
  if coalesce(p_estado, 'pendiente') not in ('pendiente', 'confirmada') then
    raise exception 'Una reserva nueva solo puede estar pendiente o confirmada';
  end if;

  perform 1 from public.clientes c where c.id = p_cliente_id and c.activo;
  if not found then
    raise exception 'El cliente no existe o está dado de baja';
  end if;

  insert into public.reservas (cliente_id, fecha_inicio, fecha_fin, estado, observaciones, created_by)
  values (p_cliente_id, p_fecha_inicio, p_fecha_fin, coalesce(p_estado, 'pendiente'),
          nullif(btrim(p_observaciones), ''), auth.uid())
  returning id into v_reserva_id;

  for v_item in
    select (e ->> 'disfraz_id')::uuid as disfraz_id, sum((e ->> 'cantidad')::integer) as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_item.disfraz_id is null or v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'Cada disfraz debe tener una cantidad mayor a cero';
    end if;

    -- El bloqueo serializa reservas/alquileres concurrentes sobre el mismo disfraz.
    select * into v_disfraz from public.disfraces d where d.id = v_item.disfraz_id for update;
    if not found or not v_disfraz.activo then
      raise exception 'Uno de los disfraces seleccionados no existe o está dado de baja';
    end if;

    -- Se calcula antes de insertar el item, así la propia reserva no se cuenta.
    v_disponible := public.disponibilidad_disfraz(v_item.disfraz_id, p_fecha_inicio, p_fecha_fin);
    if v_disponible < v_item.cantidad then
      raise exception 'Sin stock para "%" (%) entre el % y el %: disponibles %, solicitados %',
        v_disfraz.nombre, v_disfraz.codigo,
        to_char(p_fecha_inicio, 'DD/MM/YYYY'), to_char(p_fecha_fin, 'DD/MM/YYYY'),
        greatest(v_disponible, 0), v_item.cantidad;
    end if;

    insert into public.reserva_items (reserva_id, disfraz_id, cantidad)
    values (v_reserva_id, v_item.disfraz_id, v_item.cantidad);
  end loop;

  return v_reserva_id;
end;
$$;

create or replace function public.crear_reserva(
  p_cliente_id uuid,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_items jsonb,
  p_estado public.estado_reserva default 'pendiente',
  p_observaciones text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_staff();
  return app_private.crear_reserva_impl(p_cliente_id, p_fecha_inicio, p_fecha_fin, p_items, p_estado, p_observaciones);
end;
$$;

create or replace function public.actualizar_estado_reserva(p_reserva_id uuid, p_estado public.estado_reserva)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva public.reservas%rowtype;
begin
  perform app_private.exigir_staff();

  select * into v_reserva from public.reservas r where r.id = p_reserva_id for update;
  if not found then
    raise exception 'La reserva no existe';
  end if;

  if p_estado = 'convertida' then
    raise exception 'Para convertir una reserva registrá el alquiler desde la reserva';
  end if;
  if v_reserva.estado in ('cancelada', 'convertida') then
    raise exception 'La reserva ya está %; no puede modificarse', v_reserva.estado;
  end if;
  if p_estado = 'pendiente' and v_reserva.estado = 'confirmada' then
    raise exception 'Una reserva confirmada no puede volver a pendiente';
  end if;

  update public.reservas r set estado = p_estado where r.id = p_reserva_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ajustes de stock (admin)
--   alta: +total/+disponible · baja: −total desde p_origen (disponible|mantenimiento|extraviada)
--   a_mantenimiento: disponible→mantenimiento · reparado: mantenimiento→disponible
--   extraviado: disponible→extraviada · recuperado: extraviada→disponible
-- -----------------------------------------------------------------------------
create or replace function app_private.ajustar_stock_impl(
  p_disfraz_id uuid,
  p_tipo public.tipo_movimiento,
  p_cantidad integer,
  p_motivo text default null,
  p_origen text default 'disponible'
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_d public.disfraces%rowtype;
  v_origen text := coalesce(p_origen, 'disponible');
begin
  perform app_private.habilitar_operacion_stock();

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  select * into v_d from public.disfraces d where d.id = p_disfraz_id for update;
  if not found or not v_d.activo then
    raise exception 'El disfraz no existe o está dado de baja';
  end if;

  case p_tipo
    when 'alta' then
      update public.disfraces d
         set cantidad_total = d.cantidad_total + p_cantidad,
             cantidad_disponible = d.cantidad_disponible + p_cantidad
       where d.id = p_disfraz_id;

    when 'baja' then
      if v_origen = 'disponible' then
        if v_d.cantidad_disponible < p_cantidad then
          raise exception 'Solo hay % unidades disponibles para dar de baja', v_d.cantidad_disponible;
        end if;
        update public.disfraces d
           set cantidad_total = d.cantidad_total - p_cantidad,
               cantidad_disponible = d.cantidad_disponible - p_cantidad
         where d.id = p_disfraz_id;
      elsif v_origen = 'mantenimiento' then
        if v_d.cantidad_mantenimiento < p_cantidad then
          raise exception 'Solo hay % unidades en mantenimiento para dar de baja', v_d.cantidad_mantenimiento;
        end if;
        update public.disfraces d
           set cantidad_total = d.cantidad_total - p_cantidad,
               cantidad_mantenimiento = d.cantidad_mantenimiento - p_cantidad
         where d.id = p_disfraz_id;
      elsif v_origen = 'extraviada' then
        if v_d.cantidad_extraviada < p_cantidad then
          raise exception 'Solo hay % unidades extraviadas para dar de baja', v_d.cantidad_extraviada;
        end if;
        update public.disfraces d
           set cantidad_total = d.cantidad_total - p_cantidad,
               cantidad_extraviada = d.cantidad_extraviada - p_cantidad
         where d.id = p_disfraz_id;
      else
        raise exception 'Origen de baja inválido: %', v_origen;
      end if;

    when 'a_mantenimiento' then
      if v_d.cantidad_disponible < p_cantidad then
        raise exception 'Solo hay % unidades disponibles', v_d.cantidad_disponible;
      end if;
      update public.disfraces d
         set cantidad_disponible = d.cantidad_disponible - p_cantidad,
             cantidad_mantenimiento = d.cantidad_mantenimiento + p_cantidad
       where d.id = p_disfraz_id;

    when 'reparado' then
      if v_d.cantidad_mantenimiento < p_cantidad then
        raise exception 'Solo hay % unidades en mantenimiento', v_d.cantidad_mantenimiento;
      end if;
      update public.disfraces d
         set cantidad_mantenimiento = d.cantidad_mantenimiento - p_cantidad,
             cantidad_disponible = d.cantidad_disponible + p_cantidad
       where d.id = p_disfraz_id;

    when 'extraviado' then
      if v_d.cantidad_disponible < p_cantidad then
        raise exception 'Solo hay % unidades disponibles', v_d.cantidad_disponible;
      end if;
      update public.disfraces d
         set cantidad_disponible = d.cantidad_disponible - p_cantidad,
             cantidad_extraviada = d.cantidad_extraviada + p_cantidad
       where d.id = p_disfraz_id;

    when 'recuperado' then
      if v_d.cantidad_extraviada < p_cantidad then
        raise exception 'Solo hay % unidades extraviadas', v_d.cantidad_extraviada;
      end if;
      update public.disfraces d
         set cantidad_extraviada = d.cantidad_extraviada - p_cantidad,
             cantidad_disponible = d.cantidad_disponible + p_cantidad
       where d.id = p_disfraz_id;

    else
      raise exception 'Tipo de ajuste no permitido: %', p_tipo;
  end case;

  insert into public.movimientos_stock (disfraz_id, tipo, cantidad, motivo, usuario_id)
  values (
    p_disfraz_id, p_tipo, p_cantidad,
    coalesce(nullif(btrim(p_motivo), ''), 'Ajuste manual') ||
      case when p_tipo = 'baja' and v_origen <> 'disponible' then ' (desde ' || v_origen || ')' else '' end,
    auth.uid()
  );
end;
$$;

create or replace function public.ajustar_stock(
  p_disfraz_id uuid,
  p_tipo public.tipo_movimiento,
  p_cantidad integer,
  p_motivo text default null,
  p_origen text default 'disponible'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.exigir_admin();
  perform app_private.ajustar_stock_impl(p_disfraz_id, p_tipo, p_cantidad, p_motivo, p_origen);
end;
$$;

create or replace function public.eliminar_disfraz(p_disfraz_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disfraces%rowtype;
begin
  perform app_private.exigir_admin();

  select * into v_d from public.disfraces d where d.id = p_disfraz_id for update;
  if not found or not v_d.activo then
    raise exception 'El disfraz no existe o ya fue dado de baja';
  end if;
  if v_d.cantidad_alquilada > 0 then
    raise exception 'No se puede eliminar: hay % unidades alquiladas', v_d.cantidad_alquilada;
  end if;
  perform 1
    from public.reserva_items ri
    join public.reservas r on r.id = ri.reserva_id
   where ri.disfraz_id = p_disfraz_id
     and r.estado in ('pendiente', 'confirmada')
     and r.fecha_fin >= public.hoy();
  if found then
    raise exception 'No se puede eliminar: tiene reservas vigentes';
  end if;

  update public.disfraces d set activo = false, deleted_at = now() where d.id = p_disfraz_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Vistas (security_invoker: aplican las políticas RLS del usuario que consulta)
-- -----------------------------------------------------------------------------
create view public.v_disfraces
with (security_invoker = true)
as
select
  d.*,
  coalesce(r.reservada_hoy, 0)::integer as cantidad_reservada_hoy,
  case
    when d.cantidad_disponible > 0 and coalesce(r.reservada_hoy, 0) >= d.cantidad_disponible
      then 'reservado'::public.estado_disfraz
    else d.estado
  end as estado_efectivo,
  (d.activo and d.cantidad_total > 0 and d.cantidad_disponible < d.stock_minimo) as stock_bajo
from public.disfraces d
left join lateral (
  select sum(ri.cantidad) as reservada_hoy
  from public.reserva_items ri
  join public.reservas re on re.id = ri.reserva_id
  where ri.disfraz_id = d.id
    and re.estado in ('pendiente', 'confirmada')
    and public.hoy() between re.fecha_inicio and re.fecha_fin
) r on true;

create view public.v_clientes
with (security_invoker = true)
as
select
  c.*,
  (c.apellido || ', ' || c.nombre) as nombre_completo,
  coalesce(s.total_alquileres, 0)::integer as total_alquileres,
  coalesce(s.alquileres_activos, 0)::integer as alquileres_activos,
  coalesce(s.alquileres_vencidos, 0)::integer as alquileres_vencidos,
  coalesce(s.saldo_pendiente_total, 0)::numeric(12, 2) as saldo_pendiente_total,
  s.ultimo_alquiler
from public.clientes c
left join lateral (
  select
    count(*) filter (where a.estado <> 'cancelado') as total_alquileres,
    count(*) filter (where a.estado = 'activo' and a.fecha_devolucion >= public.hoy()) as alquileres_activos,
    count(*) filter (where a.estado = 'activo' and a.fecha_devolucion < public.hoy()) as alquileres_vencidos,
    sum(a.saldo_pendiente) filter (where a.estado <> 'cancelado') as saldo_pendiente_total,
    max(a.fecha_alquiler) as ultimo_alquiler
  from public.alquileres a
  where a.cliente_id = c.id
) s on true;

create view public.v_alquileres
with (security_invoker = true)
as
select
  a.*,
  case
    when a.estado = 'activo' and a.fecha_devolucion < public.hoy() then 'atrasado'::public.estado_alquiler
    else a.estado
  end as estado_efectivo,
  case
    when a.estado = 'activo' and a.fecha_devolucion < public.hoy() then (public.hoy() - a.fecha_devolucion)
    else 0
  end as dias_atraso,
  c.nombre as cliente_nombre,
  c.apellido as cliente_apellido,
  (c.apellido || ', ' || c.nombre) as cliente_nombre_completo,
  c.dni as cliente_dni,
  c.telefono as cliente_telefono,
  coalesce(i.cantidad_items, 0)::integer as cantidad_items,
  i.resumen_items
from public.alquileres a
join public.clientes c on c.id = a.cliente_id
left join lateral (
  select
    sum(ai.cantidad) as cantidad_items,
    string_agg(d.nombre || ' (' || d.talle || ') ×' || ai.cantidad, ', ' order by d.nombre) as resumen_items
  from public.alquiler_items ai
  join public.disfraces d on d.id = ai.disfraz_id
  where ai.alquiler_id = a.id
) i on true;

create view public.v_reservas
with (security_invoker = true)
as
select
  r.*,
  c.nombre as cliente_nombre,
  c.apellido as cliente_apellido,
  (c.apellido || ', ' || c.nombre) as cliente_nombre_completo,
  c.dni as cliente_dni,
  c.telefono as cliente_telefono,
  coalesce(i.cantidad_items, 0)::integer as cantidad_items,
  i.resumen_items
from public.reservas r
join public.clientes c on c.id = r.cliente_id
left join lateral (
  select
    sum(ri.cantidad) as cantidad_items,
    string_agg(d.nombre || ' (' || d.talle || ') ×' || ri.cantidad, ', ' order by d.nombre) as resumen_items
  from public.reserva_items ri
  join public.disfraces d on d.id = ri.disfraz_id
  where ri.reserva_id = r.id
) i on true;

create view public.v_devoluciones
with (security_invoker = true)
as
select
  dv.*,
  a.cliente_id,
  a.fecha_alquiler,
  a.fecha_devolucion as fecha_devolucion_pactada,
  greatest(dv.fecha_devolucion_real - a.fecha_devolucion, 0) as dias_atraso,
  (c.apellido || ', ' || c.nombre) as cliente_nombre_completo,
  c.dni as cliente_dni,
  coalesce(i.unidades_danadas, 0)::integer as unidades_danadas,
  coalesce(i.unidades_faltantes, 0)::integer as unidades_faltantes
from public.devoluciones dv
join public.alquileres a on a.id = dv.alquiler_id
join public.clientes c on c.id = a.cliente_id
left join lateral (
  select sum(di.cantidad_danada) as unidades_danadas, sum(di.cantidad_faltante) as unidades_faltantes
  from public.devolucion_items di
  where di.devolucion_id = dv.id
) i on true;

create view public.v_movimientos_stock
with (security_invoker = true)
as
select
  m.*,
  d.codigo as disfraz_codigo,
  d.nombre as disfraz_nombre,
  d.talle as disfraz_talle,
  p.nombre as usuario_nombre
from public.movimientos_stock m
join public.disfraces d on d.id = m.disfraz_id
left join public.profiles p on p.id = m.usuario_id;

create view public.v_alertas
with (security_invoker = true)
as
select
  'devolucion_vencida:' || a.id as id,
  'devolucion_vencida'::text as tipo,
  'alta'::text as severidad,
  'alquiler'::text as referencia_tipo,
  a.id as referencia_id,
  'Devolución vencida · ' || c.apellido || ', ' || c.nombre as titulo,
  'Debía devolver el ' || to_char(a.fecha_devolucion, 'DD/MM/YYYY') || ' (' ||
    (public.hoy() - a.fecha_devolucion) || ' día(s) de atraso)' as descripcion,
  a.fecha_devolucion as fecha
from public.alquileres a
join public.clientes c on c.id = a.cliente_id
where a.estado = 'activo' and a.fecha_devolucion < public.hoy()

union all

select
  'devolucion_proxima:' || a.id,
  'devolucion_proxima',
  'media',
  'alquiler',
  a.id,
  'Devuelve ' || case when a.fecha_devolucion = public.hoy() then 'hoy' else 'mañana' end ||
    ' · ' || c.apellido || ', ' || c.nombre,
  'Fecha pactada: ' || to_char(a.fecha_devolucion, 'DD/MM/YYYY'),
  a.fecha_devolucion
from public.alquileres a
join public.clientes c on c.id = a.cliente_id
where a.estado = 'activo' and a.fecha_devolucion between public.hoy() and public.hoy() + 1

union all

select
  'stock_bajo:' || d.id,
  'stock_bajo',
  'media',
  'disfraz',
  d.id,
  'Stock bajo · ' || d.nombre || ' (' || d.talle || ')',
  'Disponibles ' || d.cantidad_disponible || ' de ' || d.cantidad_total || ' · mínimo ' || d.stock_minimo,
  null::date
from public.disfraces d
where d.activo and d.cantidad_total > 0 and d.cantidad_disponible < d.stock_minimo

union all

select
  'extraviado:' || d.id,
  'extraviado',
  'alta',
  'disfraz',
  d.id,
  'Extraviados · ' || d.nombre || ' (' || d.talle || ')',
  d.cantidad_extraviada || ' unidad(es) extraviada(s)',
  null::date
from public.disfraces d
where d.activo and d.cantidad_extraviada > 0

union all

select
  'reserva_proxima:' || r.id,
  'reserva_proxima',
  'baja',
  'reserva',
  r.id,
  'Reserva próxima · ' || c.apellido || ', ' || c.nombre,
  'Retira el ' || to_char(r.fecha_inicio, 'DD/MM/YYYY') ||
    case when r.estado = 'pendiente' then ' · pendiente de confirmar' else '' end,
  r.fecha_inicio
from public.reservas r
join public.clientes c on c.id = r.cliente_id
where r.estado in ('pendiente', 'confirmada')
  and r.fecha_inicio between public.hoy() and public.hoy() + 3;

-- -----------------------------------------------------------------------------
-- Dashboard y reportes (SECURITY INVOKER: respetan RLS)
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_resumen()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'modelos', (select count(*) from public.disfraces d where d.activo),
    'total_unidades', (select coalesce(sum(d.cantidad_total), 0) from public.disfraces d where d.activo),
    'disponibles', (select coalesce(sum(d.cantidad_disponible), 0) from public.disfraces d where d.activo),
    'alquilados', (select coalesce(sum(d.cantidad_alquilada), 0) from public.disfraces d where d.activo),
    'mantenimiento', (select coalesce(sum(d.cantidad_mantenimiento), 0) from public.disfraces d where d.activo),
    'extraviados', (select coalesce(sum(d.cantidad_extraviada), 0) from public.disfraces d where d.activo),
    'proximos_a_devolver', (
      select count(*) from public.alquileres a
      where a.estado = 'activo' and a.fecha_devolucion between public.hoy() and public.hoy() + 3
    ),
    'atrasados', (
      select count(*) from public.alquileres a
      where a.estado = 'activo' and a.fecha_devolucion < public.hoy()
    ),
    'alquileres_activos', (select count(*) from public.alquileres a where a.estado = 'activo'),
    'reservas_proximas', (
      select count(*) from public.reservas r
      where r.estado in ('pendiente', 'confirmada') and r.fecha_inicio between public.hoy() and public.hoy() + 7
    ),
    'ingresos_mes', (
      select coalesce(sum(p.monto), 0) from public.pagos p
      where p.fecha >= date_trunc('month', public.hoy()::timestamp)::date and p.fecha <= public.hoy()
    ),
    'saldo_por_cobrar', (
      select coalesce(sum(a.saldo_pendiente), 0) from public.alquileres a where a.estado <> 'cancelado'
    )
  );
$$;

create or replace function public.reporte_mas_alquilados(
  p_desde date,
  p_hasta date,
  p_limite integer default 10
)
returns table (
  disfraz_id uuid,
  codigo text,
  nombre text,
  categoria public.categoria_disfraz,
  talle text,
  veces_alquilado bigint,
  unidades_alquiladas bigint,
  ingresos numeric
)
language sql
stable
set search_path = ''
as $$
  select
    d.id, d.codigo, d.nombre, d.categoria, d.talle,
    count(distinct a.id) as veces_alquilado,
    sum(ai.cantidad) as unidades_alquiladas,
    sum(ai.subtotal) as ingresos
  from public.alquiler_items ai
  join public.alquileres a on a.id = ai.alquiler_id
  join public.disfraces d on d.id = ai.disfraz_id
  where a.estado <> 'cancelado'
    and a.fecha_alquiler between p_desde and p_hasta
  group by d.id
  order by unidades_alquiladas desc, veces_alquilado desc, d.nombre
  limit greatest(coalesce(p_limite, 10), 1);
$$;

create or replace function public.reporte_ingresos(
  p_desde date,
  p_hasta date,
  p_agrupacion text default 'dia'
)
returns table (
  periodo date,
  total numeric,
  senas numeric,
  saldos numeric,
  cargos numeric,
  cantidad_pagos bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_unidad text;
  v_paso interval;
begin
  if p_agrupacion not in ('dia', 'semana', 'mes') then
    raise exception 'Agrupación inválida: use dia, semana o mes';
  end if;
  if p_hasta < p_desde then
    raise exception 'El rango de fechas es inválido';
  end if;
  v_unidad := case p_agrupacion when 'mes' then 'month' when 'semana' then 'week' else 'day' end;
  v_paso := case p_agrupacion when 'mes' then interval '1 month' when 'semana' then interval '1 week' else interval '1 day' end;

  return query
  with periodos as (
    select generate_series(
      date_trunc(v_unidad, p_desde::timestamp),
      date_trunc(v_unidad, p_hasta::timestamp),
      v_paso
    )::date as periodo
  ),
  agregados as (
    select
      date_trunc(v_unidad, p.fecha::timestamp)::date as periodo,
      sum(p.monto) as total,
      sum(p.monto) filter (where p.tipo = 'sena') as senas,
      sum(p.monto) filter (where p.tipo = 'saldo') as saldos,
      sum(p.monto) filter (where p.tipo = 'cargo_extra') as cargos,
      count(*) as cantidad_pagos
    from public.pagos p
    where p.fecha between p_desde and p_hasta
    group by 1
  )
  select
    pe.periodo,
    coalesce(ag.total, 0)::numeric,
    coalesce(ag.senas, 0)::numeric,
    coalesce(ag.saldos, 0)::numeric,
    coalesce(ag.cargos, 0)::numeric,
    coalesce(ag.cantidad_pagos, 0)::bigint
  from periodos pe
  left join agregados ag on ag.periodo = pe.periodo
  order by pe.periodo;
end;
$$;

create or replace function public.reporte_clientes_frecuentes(
  p_desde date,
  p_hasta date,
  p_limite integer default 10
)
returns table (
  cliente_id uuid,
  nombre_completo text,
  dni text,
  telefono text,
  cantidad_alquileres bigint,
  total_facturado numeric,
  total_pagado numeric,
  ultimo_alquiler date
)
language sql
stable
set search_path = ''
as $$
  select
    c.id,
    c.apellido || ', ' || c.nombre,
    c.dni,
    c.telefono,
    count(a.id) as cantidad_alquileres,
    sum(a.monto_total + a.cargos_adicionales) as total_facturado,
    sum(a.monto_pagado) as total_pagado,
    max(a.fecha_alquiler) as ultimo_alquiler
  from public.alquileres a
  join public.clientes c on c.id = a.cliente_id
  where a.estado <> 'cancelado'
    and a.fecha_alquiler between p_desde and p_hasta
  group by c.id
  order by cantidad_alquileres desc, total_facturado desc, c.apellido
  limit greatest(coalesce(p_limite, 10), 1);
$$;
