-- ============================================================
-- Protección de cartera SAR + candado en casos cerrados
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================
-- 1) Solo despacho (admin / superadmin / asistente) crea/edita clientes
-- 2) Abogado no puede tocar teléfono/correo vía update (solo despacho)
-- 3) Caso cerrado/ganado/perdido: abogado no edita; despacho sí
-- ============================================================

-- Asegura helpers (por si aún no existen)
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

create or replace function public.ve_todo_despacho()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_asistente();
$$;

create or replace function public.caso_con_candado(p_status text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_status, '') in ('cerrado', 'ganado', 'perdido');
$$;

create or replace function public.puede_editar_caso(p_case_id uuid)
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
        or (
          c.abogado_id = public.my_user_id()
          and not public.caso_con_candado(c.status)
        )
      )
  );
$$;

grant execute on function public.is_asistente() to authenticated;
grant execute on function public.ve_todo_despacho() to authenticated;
grant execute on function public.caso_con_candado(text) to authenticated;
grant execute on function public.puede_editar_caso(uuid) to authenticated;

-- ---------- clients: solo despacho escribe ----------
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.ve_todo_despacho());

create policy clients_update on public.clients
  for update to authenticated
  using (public.ve_todo_despacho())
  with check (public.ve_todo_despacho());

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin());

-- ---------- cases: abogado no edita si está con candado ----------
drop policy if exists cases_update on public.cases;
drop policy if exists cases_delete on public.cases;

create policy cases_update on public.cases
  for update to authenticated
  using (
    public.ve_todo_despacho()
    or (
      abogado_id = public.my_user_id()
      and not public.caso_con_candado(status)
    )
  )
  with check (
    public.ve_todo_despacho()
    or abogado_id = public.my_user_id()
  );

create policy cases_delete on public.cases
  for delete to authenticated
  using (public.is_admin() or (abogado_id = public.my_user_id() and not public.is_asistente()));

-- ---------- Tablas del expediente: respetar candado ----------
-- documents
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_insert on public.documents
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy documents_update on public.documents
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy documents_delete on public.documents
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );

-- tasks
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );

-- case_stages
drop policy if exists case_stages_insert on public.case_stages;
drop policy if exists case_stages_update on public.case_stages;
drop policy if exists case_stages_delete on public.case_stages;

create policy case_stages_insert on public.case_stages
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy case_stages_update on public.case_stages
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy case_stages_delete on public.case_stages
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );

-- audiencias
drop policy if exists audiencias_insert on public.audiencias;
drop policy if exists audiencias_update on public.audiencias;
drop policy if exists audiencias_delete on public.audiencias;

create policy audiencias_insert on public.audiencias
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy audiencias_update on public.audiencias
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy audiencias_delete on public.audiencias
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );

-- events
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;

create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy events_update on public.events
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy events_delete on public.events
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );

-- case_parties
drop policy if exists case_parties_insert on public.case_parties;
drop policy if exists case_parties_update on public.case_parties;
drop policy if exists case_parties_delete on public.case_parties;

create policy case_parties_insert on public.case_parties
  for insert to authenticated
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy case_parties_update on public.case_parties
  for update to authenticated
  using (public.is_staff() and public.puede_editar_caso(case_id))
  with check (public.is_staff() and public.puede_editar_caso(case_id));

create policy case_parties_delete on public.case_parties
  for delete to authenticated
  using (
    not public.is_asistente()
    and public.is_staff()
    and public.puede_editar_caso(case_id)
  );
