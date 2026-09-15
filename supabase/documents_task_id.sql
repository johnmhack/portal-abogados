-- Documentos vinculados a una tarea del proceso
-- Ejecutar en el proyecto Abogados_Sar (SQL Editor)

alter table public.documents
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists documents_task_id_idx on public.documents (task_id);

-- Verificación: debe devolver una fila con column_name = task_id
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'documents'
  and column_name = 'task_id';

