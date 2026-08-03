-- ============================================================
-- Notificaciones in-app (sin correo)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  titulo text not null,
  mensaje text,
  tipo text not null default 'info',
  link_tipo text,
  link_id uuid,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_user_leida_idx on public.notifications(user_id, leida);
create index if not exists notifications_creado_en_idx on public.notifications(creado_en desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_insert_staff on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;

-- Cada usuario ve solo las suyas
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = public.my_user_id() or public.is_admin());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = public.my_user_id() or public.is_admin())
  with check (user_id = public.my_user_id() or public.is_admin());

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = public.my_user_id() or public.is_admin());

-- Staff/admin pueden crear notificaciones (p. ej. al agendar audiencia)
create policy notifications_insert_staff on public.notifications
  for insert to authenticated
  with check (public.is_staff() or public.is_admin());

grant select, insert, update, delete on public.notifications to authenticated;
