import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['abogado', 'socio', 'asistente', 'cliente', 'admin', 'superadmin']

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

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true
    })

    if (authError) throw authError

    // Crear perfil en tabla users
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

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        profile_id: profile?.id || null,
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
