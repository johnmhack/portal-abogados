-- Permisos para que la Edge Function notify-document pueda leer documentos.
-- Ejecutar en Supabase → SQL Editor.

grant usage on schema public to service_role, authenticated;

grant select, insert, update, delete on public.documents to service_role, authenticated;
grant select, insert, update, delete on public.cases to service_role, authenticated;
grant select, insert, update, delete on public.clients to service_role, authenticated;
grant select, insert, update, delete on public.users to service_role, authenticated;
grant select, insert, update, delete on public.case_stages to service_role, authenticated;
