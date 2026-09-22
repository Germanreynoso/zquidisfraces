-- =============================================================================
-- ZquiDisfraces · 04 · Storage: bucket de imágenes de disfraces
--   Lectura pública por URL (las fotos no son sensibles y se muestran en la app).
--   Listado solo staff. Subida, reemplazo y borrado solo admin. Máx 5 MB, jpeg/png/webp.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('disfraces', 'disfraces', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "disfraces img: staff lista"
  on storage.objects for select to authenticated
  using (bucket_id = 'disfraces' and (select public.is_staff()));

create policy "disfraces img: admin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'disfraces' and (select public.is_admin()));

create policy "disfraces img: admin reemplaza"
  on storage.objects for update to authenticated
  using (bucket_id = 'disfraces' and (select public.is_admin()))
  with check (bucket_id = 'disfraces' and (select public.is_admin()));

create policy "disfraces img: admin borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'disfraces' and (select public.is_admin()));
