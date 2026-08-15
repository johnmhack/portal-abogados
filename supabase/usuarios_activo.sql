-- ============================================================
-- Activar / desactivar abogados (acceso al portal)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

alter table public.users
  add column if not exists activo boolean not null default true;

-- Por si ya existían filas
update public.users set activo = true where activo is null;

-- Ruby (admin) y asistente pueden cambiar solo el flag activo de abogados/socios
-- (las policies de update de desk/asistente ya permiten update de staff;
--  este script solo asegura la columna)

-- Verificación
-- select id, nombre, email, rol, activo from public.users order by nombre;
