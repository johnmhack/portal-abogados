import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['abogado', 'socio', 'asistente', 'contador', 'cliente', 'admin', 'superadmin']

const ROL_LABEL: Record<string, string> = {
  cliente: 'cliente',
  abogado: 'abogado',
  socio: 'socio',
  asistente: 'asistente',
  contador: 'contador',
  admin: 'administrador',
  superadmin: 'administrador',
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function welcomeHtml(opts: {
  nombre: string
  email: string
  password: string
  rol: string
  portalUrl: string
}) {
  const nombre = escapeHtml(opts.nombre)
  const email = escapeHtml(opts.email)
  const password = escapeHtml(opts.password)
  const portalUrl = escapeHtml(opts.portalUrl)
  const esCliente = opts.rol === 'cliente'

  const titulo = esCliente
    ? 'Bienvenido al portal de SAR Abogados'
    : 'Bienvenido al equipo SAR Abogados'
  const intro = esCliente
    ? 'Ya tienes acceso a tu portal de cliente. Desde ahí podrás consultar el avance de tu caso.'
    : 'Ya tienes acceso al portal interno del despacho. Usa estos datos para iniciar sesión.'

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;">
          <tr>
            <td style="background:#1a1a2e;padding:28px 32px;">
              <p style="margin:0;color:#c9a84c;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">SAR Abogados</p>
              <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;line-height:1.3;">${titulo}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;color:#2d3436;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 12px;">Hola ${nombre},</p>
              <p style="margin:0 0 20px;">${intro}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5ec;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;font-size:14px;color:#2d3436;">
                    <p style="margin:0 0 8px;"><strong>Correo:</strong> ${email}</p>
                    <p style="margin:0 0 8px;"><strong>Contraseña temporal:</strong> ${password}</p>
                    <p style="margin:0;"><strong>Portal:</strong> ${portalUrl}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#636e72;">Te recomendamos cambiar la contraseña en el primer ingreso.</p>
              <p style="margin:24px 0 0;">
                <a href="${portalUrl}" style="display:inline-block;background:#c9a84c;color:#1a1a2e;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Entrar al portal</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-size:12px;color:#b2bec3;">
              Si no esperabas este correo, comunícate con el despacho.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function enviarBienvenida(opts: {
  nombre: string
  apellido: string
  email: string
  password: string
  rol: string
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { sent: false, error: 'Falta RESEND_API_KEY' }

  const from = Deno.env.get('RESEND_FROM') || 'SAR Abogados <onboarding@resend.dev>'
  const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal-abogadossar.vercel.app'
  const nombreCompleto = `${opts.nombre} ${opts.apellido || ''}`.trim()
  const rolLabel = ROL_LABEL[opts.rol] || opts.rol
  const subject = opts.rol === 'cliente'
    ? 'Bienvenido al portal de SAR Abogados'
    : `Bienvenido al equipo SAR Abogados (${rolLabel})`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.email],
      subject,
      html: welcomeHtml({
        nombre: nombreCompleto,
        email: opts.email,
        password: opts.password,
        rol: opts.rol,
        portalUrl,
      }),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { sent: false, error: body }
  }
  return { sent: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { nombre, apellido, email, telefono, rol, client_id, password } = await req.json()

    if (!nombre || !email) {
      throw new Error('nombre y email son obligatorios')
    }

    const rolFinal = rol || 'abogado'
    if (!ALLOWED_ROLES.includes(rolFinal)) {
      throw new Error('Rol no permitido: ' + rolFinal)
    }

    const pass = password || 'Temporal123!'

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true
    })

    if (authError) throw authError

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        auth_id: authData.user.id,
        nombre,
        apellido,
        email,
        telefono,
        rol: rolFinal,
        client_id: client_id || null
      }])
      .select('id')
      .single()

    if (profileError) throw profileError

    let email_sent = false
    let email_error: string | null = null
    try {
      const result = await enviarBienvenida({
        nombre,
        apellido: apellido || '',
        email,
        password: pass,
        rol: rolFinal,
      })
      email_sent = result.sent
      email_error = result.sent ? null : (result.error || 'No se pudo enviar el correo')
    } catch (e) {
      email_error = e.message
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        profile_id: profile?.id || null,
        email_sent,
        email_error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
