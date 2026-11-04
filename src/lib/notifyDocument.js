import { supabase } from '../supabase'

async function extraerDetalle(data, error) {
  if (data?.error) return data.error
  const ctx = error?.context
  if (!ctx) return error?.message || 'No se pudo enviar el correo'
  try {
    if (typeof ctx.json === 'function') {
      const parsed = ctx.clone ? await ctx.clone().json() : await ctx.json()
      if (parsed?.error) return parsed.error
      if (typeof parsed === 'string') return parsed
      if (parsed) return JSON.stringify(parsed)
    } else if (typeof ctx.text === 'function') {
      const text = await ctx.text()
      if (text) return text
    }
  } catch {
    /* ignore */
  }
  return error?.message || 'No se pudo enviar el correo'
}

export async function notificarDocumentoCliente(docOrId) {
  const body = typeof docOrId === 'object' && docOrId
    ? {
        document_id: docOrId.id,
        case_id: docOrId.case_id,
        nombre: docOrId.nombre,
        url: docOrId.url,
      }
    : { document_id: docOrId }

  const { data, error } = await supabase.functions.invoke('notify-document', {
    body,
  })

  if (data?.success) return data

  const detalle = await extraerDetalle(data, error)
  if (/Failed to send a request/i.test(detalle) || error?.name === 'FunctionsFetchError') {
    throw new Error(
      'No se pudo contactar la función notify-document. Despliégala en Supabase y vuelve a intentar. Detalle: ' +
        detalle
    )
  }
  throw new Error(detalle)
}
