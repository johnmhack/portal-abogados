-- ============================================================
-- Contratos de abogados con SAR
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

alter table public.users
  add column if not exists contrato_url text;

alter table public.users
  add column if not exists contrato_nombre text;

-- Bucket privado para contratos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos',
  'contratos',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Solo admin / superadmin / asistente gestionan contratos
drop policy if exists contratos_select on storage.objects;
drop policy if exists contratos_insert on storage.objects;
drop policy if exists contratos_update on storage.objects;
drop policy if exists contratos_delete on storage.objects;

create policy contratos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contratos'
    and exists (
      select 1 from public.users
      where auth_id = auth.uid()
        and rol in ('admin', 'superadmin', 'asistente')
    )
  );

create policy contratos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contratos'
    and exists (
      select 1 from public.users
      where auth_id = auth.uid()
        and rol in ('admin', 'superadmin', 'asistente')
    )
  );

create policy contratos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'contratos'
    and exists (
      select 1 from public.users
      where auth_id = auth.uid()
        and rol in ('admin', 'superadmin', 'asistente')
    )
  )
  with check (
    bucket_id = 'contratos'
    and exists (
      select 1 from public.users
      where auth_id = auth.uid()
        and rol in ('admin', 'superadmin', 'asistente')
    )
  );

create policy contratos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contratos'
    and exists (
      select 1 from public.users
      where auth_id = auth.uid()
        and rol in ('admin', 'superadmin')
    )
  );

-- Asistente puede adjuntar/actualizar contrato en perfiles de equipo
drop policy if exists users_asistente_update_staff on public.users;
create policy users_asistente_update_staff on public.users
  for update to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid() and u.rol = 'asistente'
    )
    and rol in ('abogado', 'socio', 'asistente')
  )
  with check (rol in ('abogado', 'socio', 'asistente'));
