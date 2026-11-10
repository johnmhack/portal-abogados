import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { LOGO_SAR_PNG_BASE64 } from './logoSar.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const STAFF_ROLES = ['admin', 'superadmin', 'abogado', 'socio', 'asistente', 'contador']
const MAX_ATTACH_BYTES = 8 * 1024 * 1024
const MAX_TOTAL_ATTACH_BYTES = 12 * 1024 * 1024

function escapeHtml(value: string) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function logoPngBase64() {
  return LOGO_SAR_PNG_BASE64 || null
}

function fechaDdMmYyyy(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return fechaDdMmYyyy(null)
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(d)
}

function filaDetalle(etiqueta: string, valor: string, ultima = false) {
  const borde = ultima ? 'none' : '1px solid #eadcc0'
  return `<tr>
    <td style="padding:12px 16px 12px 0;width:180px;vertical-align:middle;border-bottom:${borde};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;color:#1a1a2e;white-space:nowrap;">${etiqueta}</td>
    <td style="padding:12px 0;vertical-align:middle;border-bottom:${borde};font-size:14px;color:#2d3436;">${valor}</td>
  </tr>`
}

async function tamanoArchivo(
  admin: ReturnType<typeof createClient>,
  path: string,
): Promise<number | null> {
  const slash = path.lastIndexOf('/')
  const folder = slash === -1 ? '' : path.slice(0, slash)
  const name = slash === -1 ? path : path.slice(slash + 1)
  const { data: listed } = await admin.storage
    .from('documentos')
    .list(folder, { search: name, limit: 100 })
  const meta = listed?.find((f) => f.name === name) as
    | { metadata?: { size?: number }; meta?: { size?: number } }
    | undefined
  const fromMeta = meta?.metadata?.size ?? meta?.meta?.size
  if (typeof fromMeta === 'number' && fromMeta > 0) return fromMeta

  const { data: signed } = await admin.storage
    .from('documentos')
    .createSignedUrl(path, 60)
  if (!signed?.signedUrl) return null
  try {
    const head = await fetch(signed.signedUrl, { method: 'HEAD' })
    const len = head.headers.get('content-length')
    if (len) return Number(len)
  } catch {
    /* ignore */
  }
  return null
}

function listaHtml(items: string[]) {
  return items.map((item) => escapeHtml(item)).join('<br/>')
}

function documentoHtml(opts: {
  nombreCliente: string
  tituloCaso: string
  radicado: string | null
  nombreEtapa: string | null
  archivos: string[]
  nota: string | null
  tareas: string[]
  fechaRegistro: string
  conAdjunto: boolean
  omitidos: string[]
  logoSrc: string
}) {
  const nombre = escapeHtml(opts.nombreCliente)
  const proceso = escapeHtml(
    opts.radicado ? `${opts.tituloCaso} / ${opts.radicado}` : opts.tituloCaso,
  )
  const etapa = escapeHtml(opts.nombreEtapa || 'En trámite')
  const fecha = escapeHtml(opts.fechaRegistro)
  const archivos = opts.archivos.length ? listaHtml(opts.archivos) : '—'
  const actuacion = opts.tareas.length
    ? listaHtml(opts.tareas)
    : (opts.archivos.length
      ? archivos
      : (opts.nota ? 'Nota de la etapa' : 'Actuación'))
  const filas = [
    filaDetalle('Proceso', proceso),
    filaDetalle('Actuación registrada', actuacion),
    filaDetalle('Etapa procesal', etapa),
  ]
  if (opts.archivos.length) {
    filas.push(filaDetalle('Documento adjunto', archivos))
  }
  if (opts.nota) {
    filas.push(filaDetalle('Notas', escapeHtml(opts.nota).replace(/\n/g, '<br/>')))
  }
  filas.push(filaDetalle('Fecha de registro', fecha, true))

  let adjuntoTxt = 'No hay documentos adjuntos en este envío.'
  if (opts.conAdjunto && opts.omitidos.length) {
    adjuntoTxt = `Se adjuntan los documentos que caben en el correo. No se adjuntaron por tamaño: ${escapeHtml(opts.omitidos.join(', '))}.`
  } else if (opts.conAdjunto) {
    adjuntoTxt = opts.archivos.length > 1
      ? 'Se adjuntan los documentos correspondientes para su conocimiento y consulta.'
      : 'Se adjunta el documento correspondiente para su conocimiento y consulta.'
  } else if (opts.archivos.length) {
    adjuntoTxt = 'Los archivos son demasiado grandes para adjuntarlos. Ingrese al portal o comuníquese con el despacho para recibirlos.'
  }

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#eef0f4;font-family:Georgia,Times,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;max-width:600px;border:1px solid #e6e8ee;">
          <tr>
            <td style="background:#0c1630;padding:26px 32px 12px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:16px;">
                    <img src="${opts.logoSrc}" width="78" alt="SAR Consultores Integrales" style="display:block;border:0;outline:none;height:auto;max-width:78px;"/>
                  </td>
                  <td style="vertical-align:middle;border-left:1px solid #c9a84c;padding-left:16px;">
                    <p style="margin:0;color:#c9a84c;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">SAR Consultores Integrales</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0c1630;padding:8px 32px 28px;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.3;font-weight:400;">Se ha registrado una nueva actuación</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;color:#2d3436;font-size:15px;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 10px;font-weight:700;color:#1a1a2e;">Estimado(a) ${nombre}:</p>
              <p style="margin:0 0 18px;">Le informamos que se ha registrado una nueva actuación en el seguimiento de su proceso. A continuación, encontrará los detalles de la actuación:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ec;border-radius:8px;">
                <tr>
                  <td style="padding:8px 20px 8px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${filas.join('')}
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 12px;">${adjuntoTxt}</p>
              <p style="margin:0 0 22px;">Continuaremos realizando el seguimiento jurídico de su proceso y le mantendremos informado(a) sobre las actuaciones relevantes.</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left:3px solid #c9a84c;padding:2px 0 2px 14px;">
                    <p style="margin:0;font-weight:700;color:#1a1a2e;font-style:italic;">Cordialmente,</p>
                    <p style="margin:4px 0 0;color:#1a1a2e;font-style:italic;">Despacho Jurídico — SAR Consultores Integrales</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 12px;font-size:11px;color:#95a5a6;font-family:Arial,Helvetica,sans-serif;font-style:italic;">
              Notificación automática del sistema de seguimiento de procesos. Si tiene alguna inquietud, comuníquese con nuestro despacho.
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-size:10px;line-height:1.5;color:#95a5a6;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #eef0f3;">
              <p style="margin:14px 0 8px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#7f8c8d;">Aviso legal</p>
              <p style="margin:0 0 8px;">Este mensaje es confidencial y puede contener información privilegiada. Su uso o divulgación está prohibido para personas distintas de su destinatario. Si ha recibido esta comunicación por error, por favor, elimine su contenido y notifique inmediatamente al remitente.</p>
              <p style="margin:0 0 8px;">Queda prohibida su retención, grabación, utilización, aprovechamiento o divulgación con cualquier propósito sin autorización.</p>
              <p style="margin:0 0 8px;">Este mensaje ha sido sometido a programas antivirus. No obstante, SAR Consultores Integrales no asume responsabilidad por eventuales daños derivados de la recepción o utilización de este material. Es responsabilidad del destinatario verificar, por sus propios medios, la existencia de virus u otros defectos.</p>
              <p style="margin:0;">El contenido de este correo electrónico refleja exclusivamente la opinión de su remitente y no representa necesariamente la posición oficial de SAR Consultores Integrales ni la de sus directivos.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: authData, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !authData?.user) {
      throw new Error('No autorizado')
    }

    if (!serviceKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    })

    type Sb = ReturnType<typeof createClient>
    const lecturas: Sb[] = [supabaseUser, admin]

    async function primeroQuePueda<T>(
      fn: (c: Sb) => Promise<{ data: T | null; error: { message: string } | null }>,
    ) {
      let ultimo: { data: T | null; error: { message: string } | null } = {
        data: null,
        error: { message: 'sin resultado' },
      }
      for (const c of lecturas) {
        const res = await fn(c)
        ultimo = res
        if (!res.error && res.data) return res
        if (res.error && !/permission denied/i.test(res.error.message)) return res
      }
      return ultimo
    }

    const { data: perfilAdmin } = await admin
      .from('users')
      .select('id, rol')
      .eq('auth_id', authData.user.id)
      .maybeSingle()

    let perfil = perfilAdmin
    if (!perfil) {
      const { data: perfilUser } = await supabaseUser
        .from('users')
        .select('id, rol')
        .eq('auth_id', authData.user.id)
        .maybeSingle()
      perfil = perfilUser
    }

    if (!perfil || !STAFF_ROLES.includes(perfil.rol)) {
      throw new Error('No tiene permiso para notificar documentos')
    }

    let body: Record<string, unknown> = {}
    try {
      const raw = await req.json()
      body = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    } catch {
      throw new Error('No se pudo leer el cuerpo de la petición')
    }

    const documentId = body.document_id ?? body.documentId ?? body.id
    const idsRaw = body.document_ids ?? body.documentIds
    const documentIds = Array.isArray(idsRaw)
      ? idsRaw.filter((id) => id != null && String(id).length > 0).map(String)
      : (documentId ? [String(documentId)] : [])
    const caseId = body.case_id ?? body.caseId
    const stageId = body.stage_id ?? body.stageId
    const nombreArchivo = typeof body.nombre === 'string' ? body.nombre : null
    const urlArchivo = typeof body.url === 'string' ? body.url : null
    const nota = typeof body.nota === 'string' ? body.nota.trim() : ''
    const tareas = Array.isArray(body.tareas)
      ? body.tareas.map((t) => (typeof t === 'string' ? t.trim() : String(t?.titulo || '').trim())).filter(Boolean)
      : []
    const camposDoc = 'id, nombre, tipo_documento, url, case_id, stage_id, creado_en'

    type DocRow = {
      id: string
      nombre: string
      tipo_documento: string | null
      url: string
      case_id: string
      stage_id: string | null
      creado_en?: string | null
    }

    async function buscarDocUnico(): Promise<DocRow | null> {
      if (documentIds.length === 1) {
        const porId = await primeroQuePueda((c) =>
          c.from('documents').select(camposDoc).eq('id', documentIds[0]).maybeSingle()
        )
        if (porId.error) throw new Error('Error al leer documento: ' + porId.error.message)
        if (porId.data) return porId.data as DocRow
      }
      if (caseId && urlArchivo) {
        const porUrl = await primeroQuePueda((c) =>
          c.from('documents').select(camposDoc).eq('case_id', caseId).eq('url', urlArchivo).maybeSingle()
        )
        if (porUrl.data) return porUrl.data as DocRow
      }
      if (caseId && nombreArchivo) {
        const porNombre = await primeroQuePueda(async (c) => {
          const r = await c
            .from('documents')
            .select(camposDoc)
            .eq('case_id', caseId)
            .eq('nombre', nombreArchivo)
            .limit(1)
          return { data: r.data?.[0] ?? null, error: r.error }
        })
        if (porNombre.data) return porNombre.data as DocRow
      }
      return null
    }

    const docs: DocRow[] = []
    if (documentIds.length > 1) {
      for (const id of documentIds) {
        const porId = await primeroQuePueda((c) =>
          c.from('documents').select(camposDoc).eq('id', id).maybeSingle()
        )
        if (porId.error) throw new Error('Error al leer documento: ' + porId.error.message)
        if (porId.data) docs.push(porId.data as DocRow)
      }
    } else {
      const uno = await buscarDocUnico()
      if (uno) docs.push(uno)
    }

    if (!docs.length && !nota && !tareas.length) {
      throw new Error(
        'Seleccione al menos un documento, una nota o una tarea' +
          (documentIds[0] ? ` (id=${documentIds[0]})` : '') +
          (nombreArchivo ? ` (${nombreArchivo})` : '')
      )
    }

    const caseIdFinal = docs[0]?.case_id || caseId
    if (!caseIdFinal) throw new Error('Falta el caso para notificar')

    const { data: caso, error: casoError } = await primeroQuePueda((c) =>
      c.from('cases')
        .select('id, titulo, numero_radicado, abogado_id, client_id, clients(nombre, apellido, correo)')
        .eq('id', caseIdFinal)
        .maybeSingle()
    )

    if (casoError) throw new Error('Error al leer el caso: ' + casoError.message)
    if (!caso) throw new Error('No se encontró el caso')

    const veDespacho = ['admin', 'superadmin', 'asistente'].includes(perfil.rol)
    if (!veDespacho && caso.abogado_id !== perfil.id) {
      throw new Error('No tiene acceso a este caso')
    }

    const cliente = Array.isArray(caso.clients) ? caso.clients[0] : caso.clients
    const correo = (cliente?.correo || '').trim()
    if (!correo) throw new Error('El cliente no tiene correo registrado')

    const stageIdFinal = stageId || docs[0]?.stage_id
    let nombreEtapa: string | null = null
    if (stageIdFinal) {
      const { data: etapa } = await primeroQuePueda((c) =>
        c.from('case_stages').select('nombre').eq('id', stageIdFinal).maybeSingle()
      )
      nombreEtapa = etapa?.nombre || null
    }

    async function descargarArchivo(path: string) {
      const downUser = await supabaseUser.storage.from('documentos').download(path)
      if (!downUser.error && downUser.data) return downUser.data
      const downAdmin = await admin.storage.from('documentos').download(path)
      if (downAdmin.error || !downAdmin.data) return null
      return downAdmin.data
    }

    const pdfAdjuntos: { filename: string; content: string; content_type: string }[] = []
    const omitidos: string[] = []
    let totalAdjuntos = 0

    for (const doc of docs) {
      let fileBytes = await tamanoArchivo(supabaseUser, doc.url)
      if (fileBytes == null) fileBytes = await tamanoArchivo(admin, doc.url)
      if (fileBytes == null || fileBytes <= 0 || fileBytes > MAX_ATTACH_BYTES || totalAdjuntos + fileBytes > MAX_TOTAL_ATTACH_BYTES) {
        omitidos.push(doc.nombre)
        continue
      }
      const archivo = await descargarArchivo(doc.url)
      if (!archivo) {
        omitidos.push(doc.nombre)
        continue
      }
      const buffer = new Uint8Array(await archivo.arrayBuffer())
      if (!buffer.length || buffer.length > MAX_ATTACH_BYTES || totalAdjuntos + buffer.length > MAX_TOTAL_ATTACH_BYTES) {
        omitidos.push(doc.nombre)
        continue
      }
      totalAdjuntos += buffer.length
      pdfAdjuntos.push({
        filename: doc.nombre,
        content: bytesToBase64(buffer),
        content_type: doc.tipo_documento || 'application/octet-stream',
      })
    }

    let conAdjunto = pdfAdjuntos.length > 0

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('Falta RESEND_API_KEY en los secretos de Supabase')

    const from = Deno.env.get('RESEND_FROM') || 'SAR Consultores Integrales <onboarding@resend.dev>'
    const nombreCliente = `${cliente?.nombre || ''} ${cliente?.apellido || ''}`.trim() || 'cliente'
    const tituloCaso = caso.titulo || 'su proceso'
    const subject = `Se ha registrado una nueva actuación — ${tituloCaso}`
    const logoB64 = logoPngBase64()
    const logoSrc = logoB64
      ? 'cid:logo-sar'
      : (Deno.env.get('EMAIL_LOGO_URL') || 'https://portal-abogadossar.vercel.app/logo-sar.png')
    const htmlOpts = {
      nombreCliente,
      tituloCaso,
      radicado: caso.numero_radicado || null,
      nombreEtapa,
      archivos: docs.map((d) => d.nombre),
      nota: nota || null,
      tareas,
      fechaRegistro: fechaDdMmYyyy(docs[0]?.creado_en || null),
      conAdjunto,
      omitidos,
      logoSrc,
    }

    const payload: Record<string, unknown> = {
      from,
      to: [correo],
      subject,
      html: documentoHtml(htmlOpts),
    }

    const attachments: Record<string, string>[] = []
    if (logoB64) {
      attachments.push({
        filename: 'logo-sar.png',
        content: logoB64,
        content_id: 'logo-sar',
        content_type: 'image/png',
      })
    }
    for (const pdf of pdfAdjuntos) {
      attachments.push(pdf)
    }
    if (attachments.length) payload.attachments = attachments

    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok && conAdjunto) {
      conAdjunto = false
      htmlOpts.conAdjunto = false
      payload.html = documentoHtml(htmlOpts)
      payload.attachments = logoB64
        ? [{
            filename: 'logo-sar.png',
            content: logoB64,
            content_id: 'logo-sar',
            content_type: 'image/png',
          }]
        : undefined
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error('Resend no pudo enviar el correo: ' + errBody)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: correo,
        attached: conAdjunto,
        attached_count: pdfAdjuntos.length,
        omitted: omitidos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error?.message || 'Error al notificar'
    console.error('notify-document', message)
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
