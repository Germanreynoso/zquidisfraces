-- =============================================================================
-- Tests de reglas de negocio y RLS.
-- Corre dentro de una transacción que se revierte: no deja datos.
-- Se ejecuta con `pnpm verify:db` (PGlite) y también puede pegarse en el SQL Editor de Supabase.
-- =============================================================================
begin;

create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then
    raise exception 'TEST FALLÓ: %', p_msg;
  end if;
end;
$$;

-- Ejecuta p_sql y exige que falle con un mensaje que contenga p_esperado.
create or replace function pg_temp.falla(p_sql text, p_esperado text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_esperado) in lower(sqlerrm)) = 0 then
      raise exception 'TEST FALLÓ: % → error inesperado: %', p_msg, sqlerrm;
    end if;
    return;
  end;
  raise exception 'TEST FALLÓ: % → se esperaba un error', p_msg;
end;
$$;

create or replace function pg_temp.como(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

-- -----------------------------------------------------------------------------
-- Preparación (como postgres)
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'admin.test@example.com'),
  ('00000000-0000-4000-8000-00000000000b', 'empleado.test@example.com'),
  ('00000000-0000-4000-8000-00000000000c', 'inactivo.test@example.com');

update public.profiles set rol = 'admin', activo = true where id = '00000000-0000-4000-8000-00000000000a';
update public.profiles set rol = 'empleado', activo = true where id = '00000000-0000-4000-8000-00000000000b';
update public.profiles set rol = 'empleado', activo = false where id = '00000000-0000-4000-8000-00000000000c';

-- Trigger de alta de usuario: perfil creado.
select pg_temp.ok(
  (select count(*) from public.profiles where id in (
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c'
  )) = 3,
  'se crea un perfil por cada usuario de auth'
);

-- -----------------------------------------------------------------------------
-- ADMIN: alta de disfraz y protección de stock
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.como('00000000-0000-4000-8000-00000000000a');

insert into public.disfraces (codigo, nombre, categoria, talle, cantidad_total, precio_alquiler, precio_reposicion)
values ('tst-001', 'Disfraz de prueba', 'otros', 'M', 2, 1000, 5000);

select pg_temp.ok(
  (select cantidad_disponible = 2 and cantidad_alquilada = 0 and estado = 'disponible' and codigo = 'TST-001'
     from public.disfraces where codigo = 'TST-001'),
  'alta de disfraz: todo el stock queda disponible y el código se normaliza'
);
select pg_temp.ok(
  (select count(*) = 1 from public.movimientos_stock m join public.disfraces d on d.id = m.disfraz_id
    where d.codigo = 'TST-001' and m.tipo = 'alta' and m.cantidad = 2),
  'alta de disfraz registra movimiento'
);

select pg_temp.falla(
  $q$ update public.disfraces set cantidad_disponible = 10, cantidad_total = 10 where codigo = 'TST-001' $q$,
  'movimientos de stock',
  'no se pueden editar cantidades directamente'
);

-- Edición de datos no-stock sí está permitida.
update public.disfraces set precio_alquiler = 1200 where codigo = 'TST-001';
select pg_temp.ok((select precio_alquiler = 1200 from public.disfraces where codigo = 'TST-001'), 'admin edita precio');

-- -----------------------------------------------------------------------------
-- EMPLEADO: permisos
-- -----------------------------------------------------------------------------
select pg_temp.como('00000000-0000-4000-8000-00000000000b');

select pg_temp.falla(
  $q$ insert into public.disfraces (codigo, nombre, talle, cantidad_total) values ('TST-X', 'No', 'M', 1) $q$,
  'row-level security',
  'empleado no puede crear disfraces'
);

insert into public.clientes (nombre, apellido, dni, telefono) values ('Test', 'Cliente', 'TST12345', '000');
select pg_temp.ok((select count(*) = 1 from public.clientes where dni = 'TST12345'), 'empleado crea clientes');

-- Alquiler: 1 unidad hasta hoy+2, con seña.
select public.crear_alquiler(
  (select id from public.clientes where dni = 'TST12345'),
  public.hoy() + 2,
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1)),
  500
);

select pg_temp.ok(
  (select cantidad_disponible = 1 and cantidad_alquilada = 1 from public.disfraces where codigo = 'TST-001'),
  'alquiler mueve stock de disponible a alquilado'
);
select pg_temp.ok(
  (select monto_total = 1200 and sena = 500 and monto_pagado = 500 and saldo_pendiente = 700
     from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')),
  'total calculado con precio congelado; seña registrada como pago'
);

select pg_temp.falla(
  $q$ select public.crear_alquiler(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() + 1,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 2))) $q$,
  'stock insuficiente',
  'no se puede alquilar más de lo disponible'
);

select pg_temp.falla(
  $q$ select public.crear_alquiler(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() + 5,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1)),
        0, 'efectivo', null, public.hoy() + 1) $q$,
  'no puede ser futura',
  'alquiler con fecha futura se rechaza'
);

-- -----------------------------------------------------------------------------
-- Reservas: no se permite sobre-reservar
-- -----------------------------------------------------------------------------
select pg_temp.falla(
  $q$ select public.crear_reserva(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() + 1, public.hoy() + 3,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 2))) $q$,
  'sin stock',
  'reserva de 2 con 1 alquilada en el rango se rechaza'
);

select public.crear_reserva(
  (select id from public.clientes where dni = 'TST12345'), public.hoy() + 1, public.hoy() + 3,
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1)),
  'confirmada'
);

select pg_temp.falla(
  $q$ select public.crear_reserva(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() + 2, public.hoy() + 2,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1))) $q$,
  'sin stock',
  'segunda reserva superpuesta sin capacidad se rechaza'
);

select public.crear_reserva(
  (select id from public.clientes where dni = 'TST12345'), public.hoy() + 5, public.hoy() + 6,
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 2))
);
select pg_temp.ok(
  (select count(*) = 2 from public.reservas where cliente_id = (select id from public.clientes where dni = 'TST12345')),
  'reserva sin superposición se acepta'
);

select pg_temp.falla(
  $q$ select public.crear_reserva(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() - 1, public.hoy() + 1,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1))) $q$,
  'hoy o en una fecha futura',
  'reserva en el pasado se rechaza'
);

-- Un alquiler nuevo que pisa la reserva confirmada se rechaza aunque haya stock físico.
select pg_temp.falla(
  $q$ select public.crear_alquiler(
        (select id from public.clientes where dni = 'TST12345'), public.hoy() + 1,
        jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1))) $q$,
  'conflicto con reservas',
  'alquiler que choca con reserva futura se rechaza'
);

select pg_temp.ok(
  public.disponibilidad_disfraz((select id from public.disfraces where codigo = 'TST-001'), public.hoy() + 1, public.hoy() + 3) = 0,
  'disponibilidad en rango contempla alquileres y reservas'
);

-- -----------------------------------------------------------------------------
-- Pagos, devolución y permisos de empleado
-- -----------------------------------------------------------------------------
select pg_temp.falla(
  $q$ select public.registrar_pago(
        (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')), 999999) $q$,
  'supera el saldo',
  'no se permite pagar más que el saldo'
);

select pg_temp.falla(
  $q$ select public.cancelar_alquiler(
        (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345'))) $q$,
  'administrador',
  'empleado no puede cancelar alquileres'
);

select pg_temp.falla(
  $q$ select public.ajustar_stock((select id from public.disfraces where codigo = 'TST-001'), 'alta', 1) $q$,
  'administrador',
  'empleado no puede ajustar stock'
);

-- RLS en UPDATE no lanza error: filtra filas. Se verifica que no cambió nada.
update public.alquileres set monto_total = 1;
select pg_temp.ok(
  (select monto_total = 1200 from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')),
  'empleado no puede editar alquileres directamente (RLS)'
);

select public.registrar_devolucion(
  (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')),
  (select jsonb_agg(jsonb_build_object('alquiler_item_id', ai.id, 'cantidad_danada', 1, 'observaciones', 'Roto'))
     from public.alquiler_items ai
    where ai.alquiler_id = (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345'))),
  null, 300, 0, 'Devuelto con daño', 1000, 'efectivo'
);

select pg_temp.ok(
  (select cantidad_disponible = 1 and cantidad_alquilada = 0 and cantidad_mantenimiento = 1
     from public.disfraces where codigo = 'TST-001'),
  'devolución dañada pasa a mantenimiento'
);
select pg_temp.ok(
  (select estado = 'devuelto' and fecha_devolucion_real = public.hoy() and cargos_adicionales = 300
          and monto_pagado = 1500 and saldo_pendiente = 0
     from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')),
  'alquiler queda devuelto, con cargos y cobro registrados'
);
select pg_temp.ok(
  (select estado_disfraz = 'con_danos' from public.devoluciones
    where alquiler_id = (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345'))),
  'estado de devolución calculado'
);

select pg_temp.falla(
  $q$ select public.registrar_devolucion(
        (select id from public.alquileres where cliente_id = (select id from public.clientes where dni = 'TST12345')), '[]'::jsonb) $q$,
  'solo se pueden devolver alquileres activos',
  'no se puede devolver dos veces'
);

-- -----------------------------------------------------------------------------
-- ADMIN: ajustes de stock, eliminación lógica y cancelación
-- -----------------------------------------------------------------------------
select pg_temp.como('00000000-0000-4000-8000-00000000000a');

select public.ajustar_stock((select id from public.disfraces where codigo = 'TST-001'), 'reparado', 1, 'Cosido');
select pg_temp.ok(
  (select cantidad_disponible = 2 and cantidad_mantenimiento = 0 from public.disfraces where codigo = 'TST-001'),
  'reparado vuelve a disponible'
);

select pg_temp.falla(
  $q$ select public.ajustar_stock((select id from public.disfraces where codigo = 'TST-001'), 'baja', 5) $q$,
  'solo hay 2',
  'no se puede dar de baja más de lo disponible'
);

select public.ajustar_stock((select id from public.disfraces where codigo = 'TST-001'), 'alta', 1, 'Compra');
select pg_temp.ok(
  (select cantidad_total = 3 and cantidad_disponible = 3 from public.disfraces where codigo = 'TST-001'),
  'alta de unidades suma al total y a disponible'
);

select pg_temp.falla(
  $q$ select public.eliminar_disfraz((select id from public.disfraces where codigo = 'TST-001')) $q$,
  'reservas vigentes',
  'no se elimina un disfraz con reservas vigentes'
);

-- Alquiler cancelado devuelve el stock.
select public.crear_alquiler(
  (select id from public.clientes where dni = 'TST12345'),
  public.hoy(),
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1))
);
select public.cancelar_alquiler(
  (select id from public.alquileres
    where cliente_id = (select id from public.clientes where dni = 'TST12345') and estado = 'activo'),
  'Cliente desistió'
);
select pg_temp.ok(
  (select cantidad_disponible = 3 and cantidad_alquilada = 0 from public.disfraces where codigo = 'TST-001'),
  'cancelación devuelve stock'
);

-- Estado de reserva
select public.actualizar_estado_reserva(
  (select id from public.reservas where cliente_id = (select id from public.clientes where dni = 'TST12345') and estado = 'pendiente'),
  'confirmada'
);
select pg_temp.falla(
  $q$ select public.actualizar_estado_reserva(
        (select id from public.reservas where cliente_id = (select id from public.clientes where dni = 'TST12345') and fecha_inicio = public.hoy() + 5),
        'pendiente') $q$,
  'no puede volver a pendiente',
  'confirmada no vuelve a pendiente'
);

-- Conversión de reserva en alquiler: la reserva de hoy+1..hoy+3 no puede retirarse aún (fecha futura),
-- se prueba con una reserva que empieza hoy.
select public.crear_reserva(
  (select id from public.clientes where dni = 'TST12345'), public.hoy(), public.hoy() + 1,
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1))
);
select public.crear_alquiler(
  (select id from public.clientes where dni = 'TST12345'),
  public.hoy() + 1,
  jsonb_build_array(jsonb_build_object('disfraz_id', (select id from public.disfraces where codigo = 'TST-001'), 'cantidad', 1)),
  0, 'efectivo', null, null,
  (select id from public.reservas where cliente_id = (select id from public.clientes where dni = 'TST12345') and fecha_inicio = public.hoy())
);
select pg_temp.ok(
  (select estado = 'convertida' and alquiler_id is not null from public.reservas
    where cliente_id = (select id from public.clientes where dni = 'TST12345') and fecha_inicio = public.hoy()),
  'reserva convertida en alquiler'
);

-- -----------------------------------------------------------------------------
-- Vistas, dashboard y reportes
-- -----------------------------------------------------------------------------
select pg_temp.ok(
  (select count(*) >= 1 from public.v_alquileres where estado_efectivo = 'atrasado'),
  'v_alquileres deriva alquileres atrasados (datos del seed)'
);
select pg_temp.ok(
  (select dashboard_resumen ? 'proximos_a_devolver' from public.dashboard_resumen()),
  'dashboard_resumen devuelve KPIs'
);
select pg_temp.ok(
  (select count(*) > 0 from public.reporte_ingresos(public.hoy() - 60, public.hoy(), 'semana')),
  'reporte de ingresos por semana'
);
select pg_temp.ok(
  (select count(*) > 0 from public.reporte_mas_alquilados(public.hoy() - 90, public.hoy(), 5)),
  'reporte de más alquilados'
);
select pg_temp.ok(
  (select count(*) > 0 from public.reporte_clientes_frecuentes(public.hoy() - 90, public.hoy(), 5)),
  'reporte de clientes frecuentes'
);
select pg_temp.ok(
  (select count(*) > 0 from public.v_alertas),
  'v_alertas calcula alertas'
);

-- -----------------------------------------------------------------------------
-- Usuario inactivo y anon: sin acceso
-- -----------------------------------------------------------------------------
select pg_temp.como('00000000-0000-4000-8000-00000000000c');
select pg_temp.ok((select count(*) = 0 from public.disfraces), 'usuario inactivo no ve datos');
select pg_temp.falla(
  $q$ insert into public.clientes (nombre, apellido, dni) values ('X', 'Y', 'TSTX0001') $q$,
  'row-level security',
  'usuario inactivo no puede crear clientes'
);

reset role;
set local role anon;
select pg_temp.falla($q$ select count(*) from public.disfraces $q$, 'permission denied', 'anon no accede a tablas');
select pg_temp.falla($q$ select public.dashboard_resumen() $q$, 'permission denied', 'anon no ejecuta funciones');

reset role;
rollback;
