-- ============================================================
-- SAR Consultores: columnas de ownership + RLS por roles
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================
-- Roles:
--   admin     → ve y gestiona TODO
--   abogado / socio / asistente → solo sus casos y clientes
--   cliente   → solo sus casos / su ficha de cliente
-- ============================================================

-- ---------- 1) COLUMNAS ----------
alter table public.cases
  add column if not exists abogado_id uuid references public.users(id) on delete set null;

alter table public.clients
  add column if not exists abogado_id uuid references public.users(id) on delete set null;

alter table public.users
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists cases_abogado_id_idx on public.cases(abogado_id);
create index if not exists clients_abogado_id_idx on public.clients(abogado_id);
create index if not exists users_client_id_idx on public.users(client_id);
create index if not exists users_auth_id_idx on public.users(auth_id);

-- Opcional: asigna casos/clientes sin dueño al primer admin
-- (si no hay admin, déjalos null: solo un admin podrá verlos después de asignarlos)
update public.cases c
set abogado_id = u.id
from (
  select id from public.users where rol = 'admin' limit 1
) u
where c.abogado_id is null;

update public.clients c
set abogado_id = u.id
from (
  select id from public.users where rol = 'admin' limit 1
) u
where c.abogado_id is null;

-- ---------- 2) FUNCIONES HELPER (security definer) ----------
create or replace function public.my_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.my_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where auth_id = auth.uid() and rol = 'admin'
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
      and rol in ('admin', 'abogado', 'socio', 'asistente')
  );
$$;

create or replace function public.can_access_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id
      and (
        public.is_admin()
        or c.abogado_id = public.my_user_id()
        or c.client_id = public.my_client_id()
      )
  );
$$;

-- ---------- 3) ACTIVAR RLS ----------
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.case_stages enable row level security;
alter table public.audiencias enable row level security;
alter table public.messages enable row level security;
alter table public.juzgados enable row level security;
alter table public.process_types enable row level security;
alter table public.process_templates enable row level security;
alter table public.template_stages enable row level security;

-- Si existe la tabla legado:
do $$ begin
  alter table public.etapas_proceso enable row level security;
exception when undefined_table then null;
end $$;

-- ---------- 4) BORRAR POLICIES VIEJAS (idempotente) ----------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users','clients','cases','documents','tasks','events',
        'case_stages','audiencias','messages','juzgados',
        'process_types','process_templates','template_stages','etapas_proceso'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------- 5) POLICIES: users ----------
-- Cada uno lee su perfil (necesario para login / App.jsx)
create policy users_select_own on public.users
  for select to authenticated
  using (auth_id = auth.uid() or public.is_admin());

create policy users_update_own on public.users
  for update to authenticated
  using (auth_id = auth.uid() or public.is_admin())
  with check (auth_id = auth.uid() or public.is_admin());

create policy users_admin_insert on public.users
  for insert to authenticated
  with check (public.is_admin());

create policy users_admin_delete on public.users
  for delete to authenticated
  using (public.is_admin());

-- Staff puede listar otros staff (asignaciones futuras)
create policy users_staff_select_staff on public.users
  for select to authenticated
  using (
    public.is_staff()
    and rol in ('admin', 'abogado', 'socio', 'asistente')
  );

-- ---------- 6) POLICIES: clients ----------
create policy clients_select on public.clients
  for select to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
    or id = public.my_client_id()
  );

create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_staff() and abogado_id = public.my_user_id())
  );

create policy clients_update on public.clients
  for update to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
  )
  with check (
    public.is_admin()
    or abogado_id = public.my_user_id()
  );

create policy clients_delete on public.clients
  for delete to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
  );

-- ---------- 7) POLICIES: cases ----------
create policy cases_select on public.cases
  for select to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
    or client_id = public.my_client_id()
  );

create policy cases_insert on public.cases
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_staff() and abogado_id = public.my_user_id())
  );

create policy cases_update on public.cases
  for update to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
  )
  with check (
    public.is_admin()
    or abogado_id = public.my_user_id()
  );

create policy cases_delete on public.cases
  for delete to authenticated
  using (
    public.is_admin()
    or abogado_id = public.my_user_id()
  );

-- ---------- 8) POLICIES: tablas ligadas a case_id ----------
-- documents
create policy documents_select on public.documents
  for select to authenticated
  using (
    public.can_access_case(case_id)
    and (
      public.is_staff()
      or public.is_admin()
      or coalesce(visible_cliente, false) = true
    )
  );

create policy documents_write on public.documents
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

-- tasks
create policy tasks_all on public.tasks
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

create policy tasks_select_client on public.tasks
  for select to authenticated
  using (public.my_rol() = 'cliente' and public.can_access_case(case_id));

-- events
create policy events_staff on public.events
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

create policy events_select_client on public.events
  for select to authenticated
  using (public.my_rol() = 'cliente' and public.can_access_case(case_id));

-- case_stages
create policy case_stages_staff on public.case_stages
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

create policy case_stages_select_client on public.case_stages
  for select to authenticated
  using (public.my_rol() = 'cliente' and public.can_access_case(case_id));

-- audiencias
create policy audiencias_staff on public.audiencias
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

create policy audiencias_select_client on public.audiencias
  for select to authenticated
  using (public.my_rol() = 'cliente' and public.can_access_case(case_id));

-- messages
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_admin()
    or public.can_access_case(case_id)
    or remitente_id = auth.uid()
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.can_access_case(case_id)
    and remitente_id = auth.uid()
  );

create policy messages_admin_all on public.messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 9) Catálogos compartidos (staff) ----------
create policy juzgados_staff on public.juzgados
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy process_types_staff on public.process_types
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy process_templates_staff on public.process_templates
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy template_stages_staff on public.template_stages
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

do $$ begin
  execute $p$
    create policy etapas_proceso_staff on public.etapas_proceso
      for all to authenticated
      using (public.is_staff())
      with check (public.is_staff())
  $p$;
exception when undefined_table then null;
end $$;

-- ---------- 10) GRANTS ----------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.my_user_id() to authenticated;
grant execute on function public.my_rol() to authenticated;
grant execute on function public.my_client_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_access_case(uuid) to authenticated;
