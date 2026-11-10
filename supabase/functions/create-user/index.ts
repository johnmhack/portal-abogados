import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    ? 'Bienvenido al portal de SAR Consultores Integrales'
    : 'Bienvenido al equipo SAR Consultores Integrales'
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
              <p style="margin:0;color:#c9a84c;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">SAR Consultores Integrales</p>
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
            <td style="padding:8px 32px 12px;font-size:12px;color:#b2bec3;">
              Si no esperabas este correo, comunícate con el despacho.
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

async function enviarBienvenida(opts: {
  nombre: string
  apellido: string
  email: string
  password: string
  rol: string
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { sent: false, error: 'Falta RESEND_API_KEY' }

  const from = Deno.env.get('RESEND_FROM') || 'SAR Consultores Integrales <onboarding@resend.dev>'
  const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal-abogadossar.vercel.app'
  const nombreCompleto = `${opts.nombre} ${opts.apellido || ''}`.trim()
  const rolLabel = ROL_LABEL[opts.rol] || opts.rol
  const subject = opts.rol === 'cliente'
    ? 'Bienvenido al portal de SAR Consultores Integrales'
    : `Bienvenido al equipo SAR Consultores Integrales (${rolLabel})`

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

    const { nombre, apellido, email, telefono, rol, client_id, password, enviar_correo, forzar_reset } = await req.json()

    if (!nombre || !email) {
      throw new Error('nombre y email son obligatorios')
    }

    const rolFinal = rol || 'abogado'
    if (!ALLOWED_ROLES.includes(rolFinal)) {
      throw new Error('Rol no permitido: ' + rolFinal)
    }

    const emailNorm = String(email).trim()
    const pass = password || 'Temporal123!'
    const debeEnviar = enviar_correo === true || (enviar_correo !== false && rolFinal !== 'cliente')
    const forzarReset = forzar_reset === true

    async function marcarBienvenida() {
      if (!client_id || !debeEnviar) return null
      const { data: rpcFecha, error: rpcError } = await supabaseAdmin.rpc(
        'marcar_bienvenida_cliente',
        { p_client_id: client_id },
      )
      if (!rpcError && rpcFecha) return rpcFecha as string

      const cuando = new Date().toISOString()
      const { data: row, error } = await supabaseAdmin
        .from('clients')
        .update({ bienvenida_enviada_en: cuando })
        .eq('id', client_id)
        .select('bienvenida_enviada_en')
        .maybeSingle()
      if (error) console.error('marcarBienvenida', error.message, rpcError?.message)
      return row?.bienvenida_enviada_en || null
    }

    let bienvenidaPrevia: string | null = null
    if (client_id) {
      const { data: cli, error: cliErr } = await supabaseAdmin
        .from('clients')
        .select('id, bienvenida_enviada_en')
        .eq('id', client_id)
        .maybeSingle()
      if (!cliErr) bienvenidaPrevia = cli?.bienvenida_enviada_en || null
    }

    async function aplicarPassword(authId: string | null | undefined) {
      if (!authId) return false
      const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
        password: pass,
      })
      if (passError) throw passError
      return true
    }

    if (debeEnviar && bienvenidaPrevia && !forzarReset) {
      return new Response(
        JSON.stringify({
          success: true,
          already_sent: true,
          email_sent: false,
          bienvenida_enviada_en: bienvenidaPrevia,
          email_error: 'La bienvenida ya se envió. Confirma si quieres reenviar y restablecer la contraseña.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    async function enviarSiCorresponde() {
      if (!debeEnviar) return { email_sent: false, email_error: null }
      try {
        const result = await enviarBienvenida({
          nombre,
          apellido: apellido || '',
          email: emailNorm,
          password: pass,
          rol: rolFinal,
        })
        return {
          email_sent: result.sent,
          email_error: result.sent ? null : (result.error || 'No se pudo enviar el correo'),
        }
      } catch (e) {
        return { email_sent: false, email_error: e.message }
      }
    }

    async function buscarAuthPorEmail() {
      const needle = emailNorm.toLowerCase()
      for (let page = 1; page <= 8; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
        if (error || !data?.users?.length) return null
        const found = data.users.find((u) => (u.email || '').trim().toLowerCase() === needle)
        if (found) return found
        if (data.users.length < 200) return null
      }
      return null
    }

    async function asegurarPerfil(authId: string) {
      const { data: porAuth } = await supabaseAdmin
        .from('users')
        .select('id, auth_id, email, rol, client_id')
        .eq('auth_id', authId)
        .maybeSingle()
      if (porAuth) {
        if (rolFinal === 'cliente' && porAuth.rol && porAuth.rol !== 'cliente') {
          throw new Error('Ese correo ya pertenece a un usuario del despacho.')
        }
        const patch: Record<string, unknown> = {}
        if (client_id && porAuth.client_id !== client_id) patch.client_id = client_id
        if (emailNorm && porAuth.email !== emailNorm) patch.email = emailNorm
        if (Object.keys(patch).length) {
          await supabaseAdmin.from('users').update(patch).eq('id', porAuth.id)
        }
        return porAuth
      }

      const { data: creado, error: profileError } = await supabaseAdmin
        .from('users')
        .insert([{
          auth_id: authId,
          nombre,
          apellido,
          email: emailNorm,
          telefono,
          rol: rolFinal,
          client_id: client_id || null,
        }])
        .select('id, auth_id, email, rol, client_id')
        .single()
      if (profileError) throw profileError
      return creado
    }

    let existente = null
    if (client_id) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, auth_id, email, rol, client_id')
        .eq('client_id', client_id)
        .maybeSingle()
      existente = data
    }
    if (!existente && emailNorm) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, auth_id, email, rol, client_id')
        .ilike('email', emailNorm)
        .limit(1)
        .maybeSingle()
      existente = data
    }

    if (existente) {
      if (rolFinal === 'cliente' && existente.rol && existente.rol !== 'cliente') {
        throw new Error('Ese correo ya pertenece a un usuario del despacho.')
      }
      const debeResetear = debeEnviar || forzarReset
      let password_reset = false
      if (debeResetear) {
        let authId = existente.auth_id
        if (!authId) {
          const authUserExistente = await buscarAuthPorEmail()
          authId = authUserExistente?.id || null
          if (authId) {
            await supabaseAdmin.from('users').update({ auth_id: authId }).eq('id', existente.id)
          }
        }
        password_reset = await aplicarPassword(authId)
        if (debeResetear && !password_reset) {
          throw new Error('No se encontró el usuario de acceso para restablecer la contraseña.')
        }
      }
      if (!debeEnviar && forzarReset) {
        return new Response(
          JSON.stringify({
            success: true,
            created: false,
            profile_id: existente.id,
            password_reset,
            email_sent: false,
            bienvenida_enviada_en: bienvenidaPrevia,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const envio = await enviarSiCorresponde()
      const stamp = envio.email_sent ? await marcarBienvenida() : null
      return new Response(
        JSON.stringify({
          success: true,
          created: false,
          profile_id: existente.id,
          password_reset,
          bienvenida_enviada_en: stamp || (envio.email_sent ? new Date().toISOString() : bienvenidaPrevia),
          stamp_ok: Boolean(stamp),
          ...envio,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let authUser = null
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNorm,
      password: pass,
      email_confirm: true,
    })

    if (authError) {
      const yaExiste = /already|registered|exists/i.test(authError.message || '')
      if (!yaExiste) throw authError
      authUser = await buscarAuthPorEmail()
      if (!authUser) throw authError
      if (debeEnviar || forzarReset) {
        await aplicarPassword(authUser.id)
      }
    } else {
      authUser = authData.user
    }

    const profile = await asegurarPerfil(authUser.id)
    const envio = await enviarSiCorresponde()
    const stamp = envio.email_sent ? await marcarBienvenida() : null

    return new Response(
      JSON.stringify({
        success: true,
        created: !authError,
        user: authUser,
        profile_id: profile?.id || null,
        bienvenida_enviada_en: stamp || (envio.email_sent ? new Date().toISOString() : bienvenidaPrevia),
        stamp_ok: Boolean(stamp),
        ...envio,
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
