-- =============================================================================
-- ZquiDisfraces · 01 · Esquema: extensiones, enums, tablas, constraints, índices
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- Esquema privado: funciones internas no expuestas por la API (PostgREST solo expone "public").
create schema if not exists app_private;
revoke all on schema app_private from public;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_rol as enum ('admin', 'empleado');

create type public.categoria_disfraz as enum (
  'superheroes', 'princesas', 'terror', 'animales', 'historicos',
  'profesiones', 'infantiles', 'adultos', 'otros'
);

create type public.estado_disfraz as enum (
  'disponible', 'alquilado', 'reservado', 'mantenimiento', 'extraviado'
);

-- 'atrasado' nunca se persiste: se deriva en v_alquileres (activo + vencido).
create type public.estado_alquiler as enum ('activo', 'devuelto', 'atrasado', 'cancelado');

create type public.estado_reserva as enum ('pendiente', 'confirmada', 'cancelada', 'convertida');

create type public.estado_devolucion as enum (
  'bueno', 'con_danos', 'con_faltantes', 'con_danos_y_faltantes'
);

create type public.tipo_movimiento as enum (
  'alta', 'baja', 'alquiler', 'devolucion', 'a_mantenimiento', 'reparado',
  'extraviado', 'recuperado', 'cancelacion_alquiler', 'ajuste'
);

create type public.tipo_pago as enum ('sena', 'saldo', 'cargo_extra');

create type public.metodo_pago as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- "Hoy" en la zona horaria del negocio (la base corre en UTC).
create or replace function public.hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: 1:1 con auth.users, guarda el rol (nunca en user_metadata).
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default '',
  email       text,
  rol         public.app_rol not null default 'empleado',
  activo      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil y rol de cada usuario del sistema.';
comment on column public.profiles.activo is 'Solo perfiles activos acceden a datos (defensa ante registros no autorizados).';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- disfraces: stock por cantidades. total = disponible + alquilada + mantenimiento + extraviada
-- -----------------------------------------------------------------------------
create table public.disfraces (
  id                      uuid primary key default gen_random_uuid(),
  codigo                  text not null,
  nombre                  text not null,
  categoria               public.categoria_disfraz not null default 'otros',
  descripcion             text,
  talle                   text not null,
  cantidad_total          integer not null default 0,
  cantidad_disponible     integer not null default 0,
  cantidad_alquilada      integer not null default 0,
  cantidad_mantenimiento  integer not null default 0,
  cantidad_extraviada     integer not null default 0,
  estado                  public.estado_disfraz generated always as (
    case
      when cantidad_disponible > 0 then 'disponible'::public.estado_disfraz
      when cantidad_alquilada > 0 then 'alquilado'::public.estado_disfraz
      when cantidad_mantenimiento > 0 then 'mantenimiento'::public.estado_disfraz
      when cantidad_extraviada > 0 then 'extraviado'::public.estado_disfraz
      else 'disponible'::public.estado_disfraz
    end
  ) stored,
  stock_minimo            integer not null default 1,
  precio_alquiler         numeric(12, 2) not null default 0,
  precio_reposicion       numeric(12, 2) not null default 0,
  imagen_url              text,
  activo                  boolean not null default true,
  fecha_creacion          timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,

  constraint disfraces_codigo_len check (char_length(btrim(codigo)) between 1 and 32),
  constraint disfraces_nombre_len check (char_length(btrim(nombre)) between 1 and 120),
  constraint disfraces_talle_len check (char_length(btrim(talle)) between 1 and 30),
  constraint disfraces_cantidades_no_negativas check (
    cantidad_total >= 0 and cantidad_disponible >= 0 and cantidad_alquilada >= 0
    and cantidad_mantenimiento >= 0 and cantidad_extraviada >= 0
  ),
  constraint disfraces_cantidades_cuadran check (
    cantidad_total = cantidad_disponible + cantidad_alquilada + cantidad_mantenimiento + cantidad_extraviada
  ),
  constraint disfraces_precios_no_negativos check (precio_alquiler >= 0 and precio_reposicion >= 0),
  constraint disfraces_stock_minimo_no_negativo check (stock_minimo >= 0),
  constraint disfraces_baja_coherente check ((activo and deleted_at is null) or (not activo and deleted_at is not null))
);

comment on table public.disfraces is 'Catálogo e inventario de disfraces. Las cantidades solo cambian vía funciones de stock.';
comment on column public.disfraces.estado is 'Estado derivado de las cantidades. "reservado" se calcula en v_disfraces.';

create unique index disfraces_codigo_unico on public.disfraces (upper(codigo)) where deleted_at is null;
create index disfraces_categoria_idx on public.disfraces (categoria) where activo;
create index disfraces_activo_idx on public.disfraces (activo);
create index disfraces_nombre_trgm_idx on public.disfraces using gin (nombre extensions.gin_trgm_ops);
create index disfraces_codigo_trgm_idx on public.disfraces using gin (codigo extensions.gin_trgm_ops);

create trigger disfraces_updated_at
  before update on public.disfraces
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- movimientos_stock: auditoría de todo cambio de cantidades.
-- -----------------------------------------------------------------------------
create table public.movimientos_stock (
  id             uuid primary key default gen_random_uuid(),
  disfraz_id     uuid not null references public.disfraces (id) on delete restrict,
  tipo           public.tipo_movimiento not null,
  cantidad       integer not null,
  alquiler_id    uuid,
  devolucion_id  uuid,
  motivo         text,
  usuario_id     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint movimientos_cantidad_positiva check (cantidad > 0)
);

create index movimientos_disfraz_idx on public.movimientos_stock (disfraz_id, created_at desc);
create index movimientos_alquiler_idx on public.movimientos_stock (alquiler_id) where alquiler_id is not null;
create index movimientos_devolucion_idx on public.movimientos_stock (devolucion_id) where devolucion_id is not null;

-- -----------------------------------------------------------------------------
-- clientes
-- -----------------------------------------------------------------------------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  apellido    text not null,
  dni         text not null,
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint clientes_nombre_len check (char_length(btrim(nombre)) between 1 and 80),
  constraint clientes_apellido_len check (char_length(btrim(apellido)) between 1 and 80),
  constraint clientes_dni_formato check (dni ~ '^[0-9A-Z]{5,15}$'),
  constraint clientes_email_formato check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create unique index clientes_dni_unico on public.clientes (dni);
create index clientes_nombre_trgm_idx on public.clientes using gin (nombre extensions.gin_trgm_ops);
create index clientes_apellido_trgm_idx on public.clientes using gin (apellido extensions.gin_trgm_ops);
create index clientes_dni_trgm_idx on public.clientes using gin (dni extensions.gin_trgm_ops);

create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- reservas + reserva_items
-- -----------------------------------------------------------------------------
create table public.reservas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete restrict,
  fecha_inicio   date not null,
  fecha_fin      date not null,
  estado         public.estado_reserva not null default 'pendiente',
  observaciones  text,
  alquiler_id    uuid,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint reservas_rango_valido check (fecha_fin >= fecha_inicio),
  constraint reservas_convertida_con_alquiler check ((estado = 'convertida') = (alquiler_id is not null))
);

create index reservas_cliente_idx on public.reservas (cliente_id);
create index reservas_vigentes_idx on public.reservas (fecha_inicio, fecha_fin)
  where estado in ('pendiente', 'confirmada');
create index reservas_estado_idx on public.reservas (estado, fecha_inicio);

create trigger reservas_updated_at
  before update on public.reservas
  for each row execute function app_private.set_updated_at();

create table public.reserva_items (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid not null references public.reservas (id) on delete cascade,
  disfraz_id  uuid not null references public.disfraces (id) on delete restrict,
  cantidad    integer not null,

  constraint reserva_items_cantidad_positiva check (cantidad > 0),
  constraint reserva_items_unico unique (reserva_id, disfraz_id)
);

create index reserva_items_disfraz_idx on public.reserva_items (disfraz_id);

-- -----------------------------------------------------------------------------
-- alquileres + alquiler_items
-- -----------------------------------------------------------------------------
create table public.alquileres (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references public.clientes (id) on delete restrict,
  reserva_id             uuid references public.reservas (id) on delete set null,
  fecha_alquiler         date not null default public.hoy(),
  fecha_devolucion       date not null,
  fecha_devolucion_real  date,
  estado                 public.estado_alquiler not null default 'activo',
  monto_total            numeric(12, 2) not null default 0,
  sena                   numeric(12, 2) not null default 0,
  cargos_adicionales     numeric(12, 2) not null default 0,
  monto_pagado           numeric(12, 2) not null default 0,
  saldo_pendiente        numeric(12, 2) generated always as (monto_total + cargos_adicionales - monto_pagado) stored,
  observaciones          text,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint alquileres_rango_valido check (fecha_devolucion >= fecha_alquiler),
  constraint alquileres_estado_persistible check (estado <> 'atrasado'),
  constraint alquileres_montos_no_negativos check (
    monto_total >= 0 and sena >= 0 and cargos_adicionales >= 0 and monto_pagado >= 0
  ),
  constraint alquileres_sena_tope check (sena <= monto_total),
  constraint alquileres_sin_sobrepago check (monto_pagado <= monto_total + cargos_adicionales),
  constraint alquileres_devolucion_real check (
    (estado = 'devuelto') = (fecha_devolucion_real is not null)
  )
);

create index alquileres_cliente_idx on public.alquileres (cliente_id, fecha_alquiler desc);
create index alquileres_activos_idx on public.alquileres (fecha_devolucion) where estado = 'activo';
create index alquileres_estado_idx on public.alquileres (estado, fecha_alquiler desc);
create index alquileres_reserva_idx on public.alquileres (reserva_id) where reserva_id is not null;

create trigger alquileres_updated_at
  before update on public.alquileres
  for each row execute function app_private.set_updated_at();

alter table public.reservas
  add constraint reservas_alquiler_fk foreign key (alquiler_id) references public.alquileres (id) on delete set null;
alter table public.movimientos_stock
  add constraint movimientos_alquiler_fk foreign key (alquiler_id) references public.alquileres (id) on delete set null;

create table public.alquiler_items (
  id               uuid primary key default gen_random_uuid(),
  alquiler_id      uuid not null references public.alquileres (id) on delete cascade,
  disfraz_id       uuid not null references public.disfraces (id) on delete restrict,
  cantidad         integer not null,
  precio_unitario  numeric(12, 2) not null,
  subtotal         numeric(12, 2) generated always as (cantidad * precio_unitario) stored,

  constraint alquiler_items_cantidad_positiva check (cantidad > 0),
  constraint alquiler_items_precio_no_negativo check (precio_unitario >= 0),
  constraint alquiler_items_unico unique (alquiler_id, disfraz_id)
);

create index alquiler_items_disfraz_idx on public.alquiler_items (disfraz_id);

-- -----------------------------------------------------------------------------
-- pagos: fuente de verdad de ingresos
-- -----------------------------------------------------------------------------
create table public.pagos (
  id             uuid primary key default gen_random_uuid(),
  alquiler_id    uuid not null references public.alquileres (id) on delete cascade,
  fecha          date not null default public.hoy(),
  monto          numeric(12, 2) not null,
  tipo           public.tipo_pago not null default 'saldo',
  metodo         public.metodo_pago not null default 'efectivo',
  observaciones  text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint pagos_monto_positivo check (monto > 0)
);

create index pagos_alquiler_idx on public.pagos (alquiler_id);
create index pagos_fecha_idx on public.pagos (fecha);

-- -----------------------------------------------------------------------------
-- devoluciones + devolucion_items
-- -----------------------------------------------------------------------------
create table public.devoluciones (
  id                     uuid primary key default gen_random_uuid(),
  alquiler_id            uuid not null references public.alquileres (id) on delete cascade,
  fecha_devolucion_real  date not null default public.hoy(),
  estado_disfraz         public.estado_devolucion not null default 'bueno',
  costo_reparacion       numeric(12, 2) not null default 0,
  costo_reposicion       numeric(12, 2) not null default 0,
  observaciones          text,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),

  constraint devoluciones_alquiler_unico unique (alquiler_id),
  constraint devoluciones_costos_no_negativos check (costo_reparacion >= 0 and costo_reposicion >= 0)
);

create index devoluciones_fecha_idx on public.devoluciones (fecha_devolucion_real desc);

alter table public.movimientos_stock
  add constraint movimientos_devolucion_fk foreign key (devolucion_id) references public.devoluciones (id) on delete set null;

create table public.devolucion_items (
  id                 uuid primary key default gen_random_uuid(),
  devolucion_id      uuid not null references public.devoluciones (id) on delete cascade,
  alquiler_item_id   uuid not null references public.alquiler_items (id) on delete cascade,
  disfraz_id         uuid not null references public.disfraces (id) on delete restrict,
  cantidad_ok        integer not null default 0,
  cantidad_danada    integer not null default 0,
  cantidad_faltante  integer not null default 0,
  observaciones      text,

  constraint devolucion_items_no_negativos check (
    cantidad_ok >= 0 and cantidad_danada >= 0 and cantidad_faltante >= 0
  ),
  constraint devolucion_items_unico unique (devolucion_id, alquiler_item_id)
);

create index devolucion_items_disfraz_idx on public.devolucion_items (disfraz_id);
create index devolucion_items_alquiler_item_idx on public.devolucion_items (alquiler_item_id);
