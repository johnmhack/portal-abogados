import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardCliente from './pages/DashboardCliente'
import FormularioPassword from './components/FormularioPassword'

function esRecuperacion() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  return hash.includes('type=recovery') || search.includes('type=recovery')
}

function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recuperandoClave, setRecuperandoClave] = useState(() => esRecuperacion())
  const profileLoaded = useRef(false)

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (authId, { showLoading = false } = {}) => {
      if (showLoading) setLoading(true)
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single()
      if (!mounted) return
      setUserProfile(data)
      profileLoaded.current = true
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) fetchProfile(session.user.id, { showLoading: true })
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setSession(session)

      if (event === 'PASSWORD_RECOVERY') {
        setRecuperandoClave(true)
        return
      }

      // Al volver a la pestaña Supabase refresca el token; no recargar toda la app
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return

      if (event === 'SIGNED_OUT' || !session) {
        setUserProfile(null)
        profileLoaded.current = false
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN') {
        fetchProfile(session.user.id, { showLoading: !profileLoaded.current })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
      <p style={{ color: '#b2bec3', fontSize: '14px' }}>Cargando...</p>
    </div>
  )

  if (!session) return <Login />

  if (recuperandoClave) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f5f6fa', padding: '24px',
      }}>
        <div style={{
          background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px',
          boxShadow: '0 8px 30px rgba(26,26,46,0.08)', border: '1px solid #eef0f3',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#c9a84c', fontWeight: 700, letterSpacing: '0.08em' }}>
            SAR CONSULTORES INTEGRALES
          </p>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1a1a2e' }}>Nueva contraseña</h1>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#636e72' }}>
            Elige una contraseña distinta a Temporal123!. Con ella entrarás al portal.
          </p>
          <FormularioPassword
            email={session.user.email}
            modoRecuperacion
            onListo={() => {
              window.history.replaceState({}, document.title, window.location.pathname)
              setRecuperandoClave(false)
            }}
          />
        </div>
      </div>
    )
  }

  if (!userProfile) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
      <p style={{ color: '#d63031', fontSize: '14px' }}>Usuario no registrado en el sistema.</p>
    </div>
  )

  if (userProfile.activo === false) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa', gap: '16px', padding: '24px',
      }}>
        <p style={{ color: '#d63031', fontSize: '16px', fontWeight: 600, textAlign: 'center', margin: 0 }}>
          Tu acceso al portal está desactivado.
        </p>
        <p style={{ color: '#636e72', fontSize: '14px', textAlign: 'center', margin: 0, maxWidth: '360px' }}>
          Contacta al despacho SAR si crees que es un error.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            marginTop: '8px', backgroundColor: '#1a1a2e', color: '#c9a84c',
            border: 'none', padding: '12px 20px', borderRadius: '10px',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (userProfile.rol === 'cliente') return <DashboardCliente session={session} userProfile={userProfile} />
  // Despacho SAR: dueña, asistente y superadmin comparten panel de gestión
  if (['admin', 'superadmin', 'asistente'].includes(userProfile.rol)) {
    return <DashboardAdmin session={session} userProfile={userProfile} />
  }

  return <Dashboard session={session} userProfile={userProfile} />
}

export default App
