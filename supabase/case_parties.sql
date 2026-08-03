-- ============================================================
-- Partes del caso (demandante / demandado) a nivel de CASO
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

create table if not exists public.case_parties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  nombre text,
  calidad text not null check (calidad in ('demandante', 'demandado')),
  es_nuestro_cliente boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists case_parties_case_id_idx on public.case_parties(case_id);
create index if not exists case_parties_client_id_idx on public.case_parties(client_id);

-- Migrar: cliente del caso + calidad vieja del cliente (si existía)
insert into public.case_parties (case_id, client_id, nombre, calidad, es_nuestro_cliente)
select
  c.id,
  c.client_id,
  trim(concat(coalesce(cl.nombre, ''), ' ', coalesce(cl.apellido, ''))),
  coalesce(nullif(cl.calidad_procesal, ''), 'demandante'),
  true
from public.cases c
join public.clients cl on cl.id = c.client_id
where c.client_id is not null
  and not exists (
    select 1 from public.case_parties cp
    where cp.case_id = c.id and cp.client_id = c.client_id and cp.es_nuestro_cliente = true
  );

alter table public.case_parties enable row level security;

drop policy if exists case_parties_select on public.case_parties;
drop policy if exists case_parties_write on public.case_parties;

create policy case_parties_select on public.case_parties
  for select to authenticated
  using (public.can_access_case(case_id));

create policy case_parties_write on public.case_parties
  for all to authenticated
  using (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)))
  with check (public.is_admin() or (public.is_staff() and public.can_access_case(case_id)));

grant select, insert, update, delete on public.case_parties to authenticated;
