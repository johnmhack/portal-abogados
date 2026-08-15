-- ============================================================
-- Agregar etapa "Medidas cautelares" a plantillas y casos
-- Ejecutar en Supabase → SQL Editor (todo el archivo)
-- ============================================================
-- Se inserta después de "Admisión de demanda" (o tras la 1ª etapa
-- si no existe admisión). Idempotente: no duplica si ya está.
-- ============================================================

-- ---------- 1) Plantillas (template_stages) ----------
do $$
declare
  r record;
  v_despues int;
begin
  for r in
    select id as template_id from public.process_templates
  loop
    -- Si ya tiene la etapa, saltar
    if exists (
      select 1 from public.template_stages ts
      where ts.template_id = r.template_id
        and lower(trim(ts.nombre)) = 'medidas cautelares'
    ) then
      continue;
    end if;

    -- Posición: después de Admisión de demanda
    select ts.orden into v_despues
    from public.template_stages ts
    where ts.template_id = r.template_id
      and lower(ts.nombre) like '%admisión%demanda%'
    order by ts.orden
    limit 1;

    -- Si no hay admisión, después de la primera etapa
    if v_despues is null then
      select coalesce(min(ts.orden), 0) into v_despues
      from public.template_stages ts
      where ts.template_id = r.template_id;
    end if;

    -- Correr el orden de las etapas siguientes
    update public.template_stages
    set orden = orden + 1
    where template_id = r.template_id
      and orden > v_despues;

    insert into public.template_stages (template_id, nombre, descripcion, orden)
    values (
      r.template_id,
      'Medidas cautelares',
      'Solicitud, decreto y práctica de medidas cautelares',
      v_despues + 1
    );
  end loop;
end $$;

-- ---------- 2) Casos ya creados (case_stages) ----------
do $$
declare
  r record;
  v_despues int;
begin
  for r in
    select distinct case_id from public.case_stages
  loop
    if exists (
      select 1 from public.case_stages cs
      where cs.case_id = r.case_id
        and lower(trim(cs.nombre)) = 'medidas cautelares'
    ) then
      continue;
    end if;

    select cs.orden into v_despues
    from public.case_stages cs
    where cs.case_id = r.case_id
      and lower(cs.nombre) like '%admisión%demanda%'
    order by cs.orden
    limit 1;

    if v_despues is null then
      select coalesce(min(cs.orden), 0) into v_despues
      from public.case_stages cs
      where cs.case_id = r.case_id;
    end if;

    update public.case_stages
    set orden = orden + 1
    where case_id = r.case_id
      and orden > v_despues;

    insert into public.case_stages (case_id, nombre, notas, orden, estado)
    values (
      r.case_id,
      'Medidas cautelares',
      'Solicitud, decreto y práctica de medidas cautelares',
      v_despues + 1,
      'pendiente'
    );
  end loop;
end $$;

-- ---------- 3) Verificar ----------
select pt.id as template_id, ts.orden, ts.nombre
from public.template_stages ts
join public.process_templates pt on pt.id = ts.template_id
order by pt.id, ts.orden;
