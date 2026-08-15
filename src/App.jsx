import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardCliente from './pages/DashboardCliente'

function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
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
