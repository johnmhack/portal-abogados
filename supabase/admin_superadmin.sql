-- ============================================================
-- Admin (despacho) + Superadmin (desarrollador)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ---------- Permitir rol superadmin en el CHECK ----------
alter table public.users drop constraint if exists users_rol_check;

alter table public.users
  add constraint users_rol_check
  check (rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente', 'cliente'));

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and rol in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and rol = 'superadmin'
  );
$$;

create or replace function public.is_desk_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid()
      and rol = 'admin'
  );
$$;

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
      and rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente')
  );
$$;

grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.is_desk_admin() to authenticated;

-- ---------- Policies users (reemplazo fino) ----------
drop policy if exists users_select_own on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_admin_insert on public.users;
drop policy if exists users_admin_delete on public.users;
drop policy if exists users_staff_select_staff on public.users;
drop policy if exists users_desk_admin_update on public.users;
drop policy if exists users_superadmin_update on public.users;
drop policy if exists users_desk_admin_insert on public.users;
drop policy if exists users_superadmin_insert on public.users;
drop policy if exists users_superadmin_delete on public.users;
drop policy if exists users_superadmin_select_all on public.users;

-- Lectura: propio, staff ve staff, admin/superadmin ven según privilegio
create policy users_select_own on public.users
  for select to authenticated
  using (auth_id = auth.uid());

create policy users_staff_select_staff on public.users
  for select to authenticated
  using (
    public.is_staff()
    and rol in ('admin', 'superadmin', 'abogado', 'socio', 'asistente')
  );

create policy users_superadmin_select_all on public.users
  for select to authenticated
  using (public.is_superadmin());

create policy users_admin_select_ops on public.users
  for select to authenticated
  using (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'cliente', 'admin')
  );

-- Actualización: no auto-escalar rol
create policy users_update_own on public.users
  for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid() and rol = public.my_rol());

-- Admin despacho: solo staff operativo / cliente
create policy users_desk_admin_update on public.users
  for update to authenticated
  using (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'cliente')
  )
  with check (rol in ('abogado', 'socio', 'asistente', 'cliente'));

create policy users_desk_admin_insert on public.users
  for insert to authenticated
  with check (
    public.is_desk_admin()
    and rol in ('abogado', 'socio', 'asistente', 'cliente')
  );

-- Superadmin: todo sobre users
create policy users_superadmin_update on public.users
  for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy users_superadmin_insert on public.users
  for insert to authenticated
  with check (public.is_superadmin());

create policy users_superadmin_delete on public.users
  for delete to authenticated
  using (public.is_superadmin());

-- ---------- Asignar roles (AJUSTA LOS EMAILS) ----------
-- Desarrollador → superadmin
-- update public.users set rol = 'superadmin' where email = 'TU_EMAIL@ejemplo.com';

-- Dra. Ruby → admin (si aún no lo es)
-- update public.users set rol = 'admin' where email = 'ruby@ejemplo.com';

-- Verificación
-- select id, nombre, email, rol from public.users where rol in ('admin', 'superadmin');
