-- ============================================================
-- Honorarios por caso (solo admin / superadmin / asistente)
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================

create table if not exists public.honorarios (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  total_pactado numeric(14,2) not null default 0,
  notas text,
  estado text not null default 'activo'
    check (estado in ('activo', 'cerrado')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.honorario_cuotas (
  id uuid primary key default gen_random_uuid(),
  honorario_id uuid not null references public.honorarios(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  stage_id uuid references public.case_stages(id) on delete set null,
  concepto text not null,
  monto numeric(14,2) not null check (monto >= 0),
  fecha_vencimiento date,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada')),
  creado_en timestamptz not null default now()
);

create table if not exists public.honorario_abonos (
  id uuid primary key default gen_random_uuid(),
  honorario_id uuid not null references public.honorarios(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  monto numeric(14,2) not null check (monto > 0),
  fecha date not null default current_date,
  notas text,
  creado_en timestamptz not null default now()
);

create index if not exists honorarios_case_id_idx on public.honorarios(case_id);
create index if not exists honorario_cuotas_case_id_idx on public.honorario_cuotas(case_id);
create index if not exists honorario_cuotas_fecha_idx on public.honorario_cuotas(fecha_vencimiento);
create index if not exists honorario_abonos_case_id_idx on public.honorario_abonos(case_id);

alter table public.honorarios enable row level security;
alter table public.honorario_cuotas enable row level security;
alter table public.honorario_abonos enable row level security;

drop policy if exists honorarios_despacho on public.honorarios;
drop policy if exists honorario_cuotas_despacho on public.honorario_cuotas;
drop policy if exists honorario_abonos_despacho on public.honorario_abonos;

create policy honorarios_despacho on public.honorarios
  for all to authenticated
  using (public.ve_todo_despacho())
  with check (public.ve_todo_despacho());

create policy honorario_cuotas_despacho on public.honorario_cuotas
  for all to authenticated
  using (public.ve_todo_despacho())
  with check (public.ve_todo_despacho());

create policy honorario_abonos_despacho on public.honorario_abonos
  for all to authenticated
  using (public.ve_todo_despacho())
  with check (public.ve_todo_despacho());

grant select, insert, update, delete on public.honorarios to authenticated;
grant select, insert, update, delete on public.honorario_cuotas to authenticated;
grant select, insert, update, delete on public.honorario_abonos to authenticated;
