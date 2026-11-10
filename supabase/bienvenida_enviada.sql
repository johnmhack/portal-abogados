-- Marca si ya se envió el correo de bienvenida al cliente.
-- Ejecutar entero en Supabase → SQL Editor (Run).

alter table public.clients
  add column if not exists bienvenida_enviada_en timestamptz;

comment on column public.clients.bienvenida_enviada_en is
  'Fecha del último correo de bienvenida enviado desde el portal';

grant select, update on public.clients to authenticated, service_role;

-- El API de tablas a veces no ve columnas nuevas. Esta función escribe en SQL directo.
create or replace function public.marcar_bienvenida_cliente(p_client_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuando timestamptz := now();
begin
  if p_client_id is null then
    raise exception 'Falta el cliente';
  end if;

  update public.clients
     set bienvenida_enviada_en = v_cuando
   where id = p_client_id;

  if not found then
    raise exception 'No se encontró el cliente';
  end if;

  return v_cuando;
end;
$$;

revoke all on function public.marcar_bienvenida_cliente(uuid) from public;
grant execute on function public.marcar_bienvenida_cliente(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
