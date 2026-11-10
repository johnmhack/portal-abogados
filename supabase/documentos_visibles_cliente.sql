-- ============================================================
-- El cliente ve los documentos de sus casos
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================

alter table public.documents
  add column if not exists visible_cliente boolean not null default true;

update public.documents
set visible_cliente = true
where coalesce(visible_cliente, false) = false;

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (public.can_access_case(case_id));

-- Descarga del archivo: el cliente solo entra a la carpeta de su caso
drop policy if exists documentos_select_caso on storage.objects;
create policy documentos_select_caso on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_case(((storage.foldername(name))[1])::uuid)
  );
