-- ============================================================
-- Limpieza de datos de prueba
-- NO borra: juzgados, usuarios, ni clientes únicos
-- Ejecutar por BLOQUES en Supabase → SQL Editor
-- ============================================================

-- ---------- BLOQUE A: ver qué hay ----------
select 'cases' as tabla, count(*) from public.cases
union all select 'clients', count(*) from public.clients
union all select 'juzgados', count(*) from public.juzgados
union all select 'documents', count(*) from public.documents
union all select 'audiencias', count(*) from public.audiencias;

-- Clientes duplicados por documento
select
  lower(trim(documento)) as doc,
  count(*) as veces,
  string_agg(nombre || ' ' || coalesce(apellido, ''), ' | ') as nombres
from public.clients
where documento is not null and trim(documento) <> ''
group by lower(trim(documento))
having count(*) > 1
order by veces desc;


-- ---------- BLOQUE B: BORRAR TODOS LOS CASOS (y lo ligado) ----------
-- Juzgados y clientes NO se tocan aquí.
-- Copia y ejecuta TODO este bloque junto.

begin;

delete from public.case_parties;
delete from public.documents;
delete from public.tasks;
delete from public.events;
delete from public.case_stages;
delete from public.audiencias;
delete from public.messages;
delete from public.notifications;
delete from public.cases;

commit;

-- Verificar (debe ser 0)
select count(*) as casos_restantes from public.cases;


-- ---------- BLOQUE C: limpiar CLIENTES DUPLICADOS ----------
-- Conserva 1 por documento (el más antiguo = creado_en menor).
-- Reasigna users.client_id al que se conserva, y borra el resto.

begin;

-- 1) Marcar cuál conservar por cada documento
create temporary table tmp_dup_keep as
select distinct on (lower(trim(documento)))
  id as keep_id,
  lower(trim(documento)) as doc_key
from public.clients
where documento is not null and trim(documento) <> ''
order by lower(trim(documento)), creado_en asc nulls last, id;

-- 2) Lista de ids a borrar (duplicados)
create temporary table tmp_dup_drop as
select c.id as drop_id, k.keep_id
from public.clients c
join tmp_dup_keep k on k.doc_key = lower(trim(c.documento))
where c.id <> k.keep_id
  and c.documento is not null
  and trim(c.documento) <> '';

-- Ver qué se va a borrar (opcional, mira el resultado antes del delete)
select
  d.drop_id,
  d.keep_id,
  c.nombre,
  c.apellido,
  c.documento,
  c.correo
from tmp_dup_drop d
join public.clients c on c.id = d.drop_id;

-- 3) Si algún usuario portal apunta al duplicado, reasignarlo al que se queda
update public.users u
set client_id = d.keep_id
from tmp_dup_drop d
where u.client_id = d.drop_id;

-- 4) Por si quedara alguna referencia suelta en cases (no debería si corriste B)
update public.cases c
set client_id = d.keep_id
from tmp_dup_drop d
where c.client_id = d.drop_id;

update public.case_parties cp
set client_id = d.keep_id
from tmp_dup_drop d
where cp.client_id = d.drop_id;

-- 5) Borrar duplicados
delete from public.clients c
using tmp_dup_drop d
where c.id = d.drop_id;

drop table tmp_dup_keep;
drop table tmp_dup_drop;

commit;

-- Verificar: no deben quedar duplicados por documento
select lower(trim(documento)) as doc, count(*) as veces
from public.clients
where documento is not null and trim(documento) <> ''
group by lower(trim(documento))
having count(*) > 1;


-- ---------- BLOQUE C2: duplicados por NOMBRE sin cédula ----------
-- Primero MIRA (no borra):
select
  lower(trim(nombre)) as nom,
  lower(trim(coalesce(apellido, ''))) as ape,
  count(*) as veces,
  string_agg(id::text, ', ') as ids
from public.clients
where (documento is null or trim(documento) = '')
group by lower(trim(nombre)), lower(trim(coalesce(apellido, '')))
having count(*) > 1
order by veces desc;

-- Luego BORRA (deja el más antiguo):
begin;

create temporary table tmp_name_keep as
select distinct on (lower(trim(nombre)), lower(trim(coalesce(apellido, ''))))
  id as keep_id,
  lower(trim(nombre)) as nom_key,
  lower(trim(coalesce(apellido, ''))) as ape_key
from public.clients
where documento is null or trim(documento) = ''
order by lower(trim(nombre)), lower(trim(coalesce(apellido, ''))), creado_en asc nulls last, id;

create temporary table tmp_name_drop as
select c.id as drop_id, k.keep_id
from public.clients c
join tmp_name_keep k
  on k.nom_key = lower(trim(c.nombre))
 and k.ape_key = lower(trim(coalesce(c.apellido, '')))
where c.id <> k.keep_id
  and (c.documento is null or trim(c.documento) = '');

-- Revisa qué se borrará
select d.drop_id, d.keep_id, c.nombre, c.apellido, c.correo
from tmp_name_drop d
join public.clients c on c.id = d.drop_id;

update public.users u
set client_id = d.keep_id
from tmp_name_drop d
where u.client_id = d.drop_id;

update public.cases c
set client_id = d.keep_id
from tmp_name_drop d
where c.client_id = d.drop_id;

update public.case_parties cp
set client_id = d.keep_id
from tmp_name_drop d
where cp.client_id = d.drop_id;

delete from public.clients c
using tmp_name_drop d
where c.id = d.drop_id;

drop table tmp_name_keep;
drop table tmp_name_drop;

commit;

-- Verificar
select
  lower(trim(nombre)) as nom,
  lower(trim(coalesce(apellido, ''))) as ape,
  count(*) as veces
from public.clients
where documento is null or trim(documento) = ''
group by lower(trim(nombre)), lower(trim(coalesce(apellido, '')))
having count(*) > 1;


-- ---------- BLOQUE D (después de limpiar): activar anti-duplicados ----------
-- Solo cuando BLOQUE C ya no muestre duplicados:
-- create unique index if not exists clients_documento_unique_idx
--   on public.clients (lower(trim(documento)))
--   where documento is not null and trim(documento) <> '';
--
-- create unique index if not exists clients_correo_unique_idx
--   on public.clients (lower(trim(correo)))
--   where correo is not null and trim(correo) <> '';
