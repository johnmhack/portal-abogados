-- ============================================================
-- Asistente: ve y trabaja TODO el despacho, pero NO puede eliminar
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================

-- ---------- Helpers ----------
create or replace function public.is_asistente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_id = auth.uid() and rol = 'asistente'
  );
$$;

-- Quien ve/trabaja todo el despacho: admin, superadmin y asistente
create or replace function public.ve_todo_despacho()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_asistente();
$$;

grant execute on function public.is_asistente() to authenticated;
grant execute on function public.ve_todo_despacho() to authenticated;

-- El asistente accede a cualquier expediente
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
        public.ve_todo_despacho()
        or c.abogado_id = public.my_user_id()
        or c.client_id = public.my_client_id()
      )
  );
$$;

-- ---------- cases ----------
drop policy if exists cases_select on public.cases;
drop policy if exists cases_insert on public.cases;
drop policy if exists cases_update on public.cases;
drop policy if exists cases_delete on public.cases;

create policy cases_select on public.cases
  for select to authenticated
  using (
    public.ve_todo_despacho()
    or abogado_id = public.my_user_id()
    or client_id = public.my_client_id()
  );

create policy cases_insert on public.cases
  for insert to authenticated
  with check (
    public.ve_todo_despacho()
    or (public.is_staff() and abogado_id = public.my_user_id())
  );

create policy cases_update on public.cases
  for update to authenticated
  using (public.ve_todo_despacho() or abogado_id = public.my_user_id())
  with check (public.ve_todo_despacho() or abogado_id = public.my_user_id());

create policy cases_delete on public.cases
  for delete to authenticated
  using (public.is_admin() or abogado_id = public.my_user_id());

-- ---------- clients ----------
drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_select on public.clients
  for select to authenticated
  using (
    public.ve_todo_despacho()
    or abogado_id = public.my_user_id()
    or id = public.my_client_id()
  );

create policy clients_insert on public.clients
  for insert to authenticated
  with check (
    public.ve_todo_despacho()
    or (public.is_staff() and abogado_id = public.my_user_id())
  );

create policy clients_update on public.clients
  for update to authenticated
  using (public.ve_todo_despacho() or abogado_id = public.my_user_id())
  with check (public.ve_todo_despacho() or abogado_id = public.my_user_id());

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin() or abogado_id = public.my_user_id());

-- ---------- Tablas por case_id: trabajar sí, borrar no (asistente) ----------
-- documents
drop policy if exists documents_write on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_insert on public.documents
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy documents_update on public.documents
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy documents_delete on public.documents
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- tasks
drop policy if exists tasks_all on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_select_staff on public.tasks
  for select to authenticated
  using (public.is_staff() and public.can_access_case(case_id));

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- case_stages
drop policy if exists case_stages_staff on public.case_stages;
drop policy if exists case_stages_select_staff on public.case_stages;
drop policy if exists case_stages_insert on public.case_stages;
drop policy if exists case_stages_update on public.case_stages;
drop policy if exists case_stages_delete on public.case_stages;

create policy case_stages_select_staff on public.case_stages
  for select to authenticated
  using (public.is_staff() and public.can_access_case(case_id));

create policy case_stages_insert on public.case_stages
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy case_stages_update on public.case_stages
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy case_stages_delete on public.case_stages
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- audiencias
drop policy if exists audiencias_staff on public.audiencias;
drop policy if exists audiencias_select_staff on public.audiencias;
drop policy if exists audiencias_insert on public.audiencias;
drop policy if exists audiencias_update on public.audiencias;
drop policy if exists audiencias_delete on public.audiencias;

create policy audiencias_select_staff on public.audiencias
  for select to authenticated
  using (public.is_staff() and public.can_access_case(case_id));

create policy audiencias_insert on public.audiencias
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy audiencias_update on public.audiencias
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy audiencias_delete on public.audiencias
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- events
drop policy if exists events_staff on public.events;
drop policy if exists events_select_staff on public.events;
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;

create policy events_select_staff on public.events
  for select to authenticated
  using (public.is_staff() and public.can_access_case(case_id));

create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy events_update on public.events
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy events_delete on public.events
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- case_parties
drop policy if exists case_parties_write on public.case_parties;
drop policy if exists case_parties_insert on public.case_parties;
drop policy if exists case_parties_update on public.case_parties;
drop policy if exists case_parties_delete on public.case_parties;

create policy case_parties_insert on public.case_parties
  for insert to authenticated
  with check (public.is_staff() and public.can_access_case(case_id));

create policy case_parties_update on public.case_parties
  for update to authenticated
  using (public.is_staff() and public.can_access_case(case_id))
  with check (public.is_staff() and public.can_access_case(case_id));

create policy case_parties_delete on public.case_parties
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.can_access_case(case_id)
  );

-- ---------- Catálogos: asistente consulta y edita, no borra ----------
do $$
declare t text;
begin
  for t in
    select unnest(array['juzgados', 'process_types', 'process_templates', 'template_stages'])
  loop
    execute format('drop policy if exists %I_staff on public.%I', t, t);
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format($p$
      create policy %1$I_rw on public.%1$I
        for select to authenticated
        using (public.is_staff())
    $p$, t);
    execute format($p$
      create policy %1$I_staff on public.%1$I
        for insert to authenticated
        with check (public.is_staff())
    $p$, t);
    execute format($p$
      create policy %1$I_update on public.%1$I
        for update to authenticated
        using (public.is_staff())
        with check (public.is_staff())
    $p$, t);
    execute format($p$
      create policy %1$I_delete on public.%1$I
        for delete to authenticated
        using (public.is_staff() and not public.is_asistente())
    $p$, t);
  end loop;
end $$;

-- Verificación rápida (ejecuta como asistente desde la app):
-- select count(*) from public.cases;
