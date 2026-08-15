-- ============================================================
-- Borrar del equipo: Fabio Torres, Farid Ruis, qwrfwefw
-- Ejecutar TODO en Supabase → SQL Editor
-- ============================================================

-- 1) Verificar que coinciden
select id, nombre, apellido, email, rol
from public.users
where
  (lower(trim(nombre)) = 'fabio' and lower(trim(coalesce(apellido, ''))) like 'torres%')
  or (lower(trim(nombre)) = 'farid' and lower(trim(coalesce(apellido, ''))) like 'rui%')
  or lower(trim(nombre)) like 'qwrfwefw%'
  or lower(trim(coalesce(apellido, ''))) like 'qwrfwefw%'
  or lower(email) like '%qwrfwefw%';

-- 2) Borrar (libera casos y elimina perfiles)
begin;

update public.cases
set abogado_id = null
where abogado_id in (
  select id from public.users
  where
    (lower(trim(nombre)) = 'fabio' and lower(trim(coalesce(apellido, ''))) like 'torres%')
    or (lower(trim(nombre)) = 'farid' and lower(trim(coalesce(apellido, ''))) like 'rui%')
    or lower(trim(nombre)) like 'qwrfwefw%'
    or lower(trim(coalesce(apellido, ''))) like 'qwrfwefw%'
    or lower(email) like '%qwrfwefw%'
);

delete from public.users
where
  (lower(trim(nombre)) = 'fabio' and lower(trim(coalesce(apellido, ''))) like 'torres%')
  or (lower(trim(nombre)) = 'farid' and lower(trim(coalesce(apellido, ''))) like 'rui%')
  or lower(trim(nombre)) like 'qwrfwefw%'
  or lower(trim(coalesce(apellido, ''))) like 'qwrfwefw%'
  or lower(email) like '%qwrfwefw%';

commit;

-- 3) Verificar equipo restante
select id, nombre, apellido, email, rol
from public.users
where rol in ('abogado', 'socio', 'asistente', 'admin', 'superadmin')
order by nombre;
