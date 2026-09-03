-- ============================================================
-- Advisor Supabase: entities + case_participants sin RLS
-- El portal NO usa estas tablas (usa public.case_parties).
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1) Revisa si tienen datos antes de borrar:
--    select count(*) from public.entities;
--    select count(*) from public.case_participants;

-- ============================================================
-- OPCIÓN A (recomendada): eliminar tablas huérfanas
-- Descomenta si confirmas que no las necesitas:
-- ============================================================
-- drop table if exists public.case_participants cascade;
-- drop table if exists public.entities cascade;

-- ============================================================
-- OPCIÓN B: conservar tablas → activar RLS
-- ============================================================

-- case_participants (misma lógica que case_parties, si tiene case_id)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'case_participants'
  ) then
    execute 'alter table public.case_participants enable row level security';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'case_participants' and column_name = 'case_id'
    ) then
      execute 'drop policy if exists case_participants_select on public.case_participants';
      execute 'drop policy if exists case_participants_insert on public.case_participants';
      execute 'drop policy if exists case_participants_update on public.case_participants';
      execute 'drop policy if exists case_participants_delete on public.case_participants';

      execute $p$
        create policy case_participants_select on public.case_participants
          for select to authenticated
          using (public.can_access_case(case_id))
      $p$;

      execute $p$
        create policy case_participants_insert on public.case_participants
          for insert to authenticated
          with check (public.is_staff() and public.can_access_case(case_id))
      $p$;

      execute $p$
        create policy case_participants_update on public.case_participants
          for update to authenticated
          using (public.is_staff() and public.can_access_case(case_id))
          with check (public.is_staff() and public.can_access_case(case_id))
      $p$;

      execute $p$
        create policy case_participants_delete on public.case_participants
          for delete to authenticated
          using (
            not public.is_asistente()
            and public.is_staff()
            and public.can_access_case(case_id)
          )
      $p$;

      execute 'grant select, insert, update, delete on public.case_participants to authenticated';
    else
      -- Sin case_id: solo despacho
      execute 'drop policy if exists case_participants_staff on public.case_participants';
      execute $p$
        create policy case_participants_staff on public.case_participants
          for all to authenticated
          using (public.ve_todo_despacho())
          with check (public.ve_todo_despacho())
      $p$;
      execute 'grant select, insert, update, delete on public.case_participants to authenticated';
    end if;
  end if;
end $$;

-- entities (tabla genérica: solo personal del despacho)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'entities'
  ) then
    execute 'alter table public.entities enable row level security';
    execute 'drop policy if exists entities_select on public.entities';
    execute 'drop policy if exists entities_write on public.entities';

    execute $p$
      create policy entities_select on public.entities
        for select to authenticated
        using (public.is_staff())
    $p$;

    execute $p$
      create policy entities_write on public.entities
        for all to authenticated
        using (public.ve_todo_despacho())
        with check (public.ve_todo_despacho())
    $p$;

    execute 'grant select, insert, update, delete on public.entities to authenticated';
  end if;
end $$;
