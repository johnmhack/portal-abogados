-- ============================================================
-- Rol contador en el equipo SAR
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

alter table public.users drop constraint if exists users_rol_check;

alter table public.users
  add constraint users_rol_check
  check (rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente', 'contador', 'cliente'));

-- Actualizar is_staff para incluir contador
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente', 'contador')
  );
$$;

-- Desk admin puede gestionar contadores
drop policy if exists users_desk_admin_update on public.users;
create policy users_desk_admin_update on public.users
  for update to authenticated
  using (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'contador', 'cliente')
  )
  with check (rol in ('abogado', 'socio', 'asistente', 'contador', 'cliente'));

drop policy if exists users_desk_admin_insert on public.users;
create policy users_desk_admin_insert on public.users
  for insert to authenticated
  with check (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'contador', 'cliente')
  );

drop policy if exists users_admin_select_ops on public.users;
create policy users_admin_select_ops on public.users
  for select to authenticated
  using (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'contador', 'cliente', 'admin')
  );

drop policy if exists users_staff_select_staff on public.users;
create policy users_staff_select_staff on public.users
  for select to authenticated
  using (
    public.is_staff()
    and rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente', 'contador')
  );

drop policy if exists users_asistente_update_staff on public.users;
create policy users_asistente_update_staff on public.users
  for update to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.auth_id = auth.uid() and u.rol = 'asistente'
    )
    and rol in ('abogado', 'socio', 'asistente', 'contador')
  )
  with check (rol in ('abogado', 'socio', 'asistente', 'contador'));
