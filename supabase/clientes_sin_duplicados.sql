-- ============================================================
-- Evitar clientes duplicados por documento (cédula/NIT)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================
-- Si falla por duplicados existentes, primero limpia con:
--
-- select documento, count(*) 
-- from public.clients
-- where nullif(trim(documento), '') is not null
-- group by documento having count(*) > 1;
-- ============================================================

-- Índice único: un mismo documento no puede repetirse
create unique index if not exists clients_documento_unique_idx
  on public.clients (lower(trim(documento)))
  where documento is not null and trim(documento) <> '';

-- Correo único cuando exista (opcional pero útil)
create unique index if not exists clients_correo_unique_idx
  on public.clients (lower(trim(correo)))
  where correo is not null and trim(correo) <> '';
