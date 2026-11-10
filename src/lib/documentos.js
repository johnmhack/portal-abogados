import { supabase } from '../supabase'

/** El portal del cliente lista estos archivos. Si la columna aún no existe, se guarda igual. */
export async function insertarDocumento(row) {
  const conVisibilidad = await supabase
    .from('documents')
    .insert([{ ...row, visible_cliente: true }])

  if (!conVisibilidad.error) return conVisibilidad
  if (/visible_cliente/i.test(conVisibilidad.error.message || '')) {
    return supabase.from('documents').insert([row])
  }
  return conVisibilidad
}
