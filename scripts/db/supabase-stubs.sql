-- Stubs mínimos de Supabase para verificar las migraciones en PGlite (sin Docker).
-- NO se aplica en Supabase: allí estos objetos ya existen.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table storage.buckets (
  id                  text primary key,
  name                text not null unique,
  public              boolean default false,
  file_size_limit     bigint,
  allowed_mime_types  text[],
  created_at          timestamptz default now()
);

create table storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text references storage.buckets (id),
  name        text,
  owner       uuid,
  created_at  timestamptz default now()
);
alter table storage.objects enable row level security;
grant select on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;

-- Privilegios por defecto equivalentes a los de un proyecto Supabase.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
