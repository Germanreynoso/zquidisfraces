-- =============================================================================
-- ZquiDisfraces · 03 · Row Level Security y permisos
--
--   ADMIN    → acceso total.
--   EMPLEADO → lectura total; crea/edita clientes; alquileres, devoluciones, pagos y reservas
--              SOLO a través de las funciones (RPC) que validan stock y reglas de negocio.
--   anon     → sin acceso.
-- Los helpers se invocan como (select public.is_staff()) para que Postgres los evalúe una vez por consulta.
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.disfraces         enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.clientes          enable row level security;
alter table public.reservas          enable row level security;
alter table public.reserva_items     enable row level security;
alter table public.alquileres        enable row level security;
alter table public.alquiler_items    enable row level security;
alter table public.pagos             enable row level security;
alter table public.devoluciones      enable row level security;
alter table public.devolucion_items  enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles: staff lee todos; cada usuario lee el propio"
  on public.profiles for select to authenticated
  using ((select public.is_staff()) or id = (select auth.uid()));

create policy "profiles: admin actualiza"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- disfraces (escritura solo admin; stock solo vía RPC por trigger de protección)
-- -----------------------------------------------------------------------------
create policy "disfraces: staff lee"
  on public.disfraces for select to authenticated
  using ((select public.is_staff()));

create policy "disfraces: admin crea"
  on public.disfraces for insert to authenticated
  with check ((select public.is_admin()));

create policy "disfraces: admin edita"
  on public.disfraces for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "disfraces: admin borra"
  on public.disfraces for delete to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- movimientos_stock (solo lectura; se insertan desde funciones)
-- -----------------------------------------------------------------------------
create policy "movimientos: staff lee"
  on public.movimientos_stock for select to authenticated
  using ((select public.is_staff()));

-- -----------------------------------------------------------------------------
-- clientes (staff crea y edita; admin borra)
-- -----------------------------------------------------------------------------
create policy "clientes: staff lee"
  on public.clientes for select to authenticated
  using ((select public.is_staff()));

create policy "clientes: staff crea"
  on public.clientes for insert to authenticated
  with check ((select public.is_staff()));

create policy "clientes: staff edita"
  on public.clientes for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "clientes: admin borra"
  on public.clientes for delete to authenticated
  using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Tablas transaccionales: staff lee; escritura directa solo admin (empleado usa RPC)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'reservas', 'reserva_items', 'alquileres', 'alquiler_items',
    'pagos', 'devoluciones', 'devolucion_items'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_staff()))',
      t || ': staff lee', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      t || ': admin crea', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t || ': admin edita', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      t || ': admin borra', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de funciones
-- Postgres otorga EXECUTE a PUBLIC por defecto: se revoca y se otorga explícitamente.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema app_private from public;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Las tablas y vistas quedan protegidas por RLS / security_invoker; anon no tiene políticas.
revoke all on all tables in schema public from anon;
