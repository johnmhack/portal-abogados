import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import DashboardCliente from './pages/DashboardCliente'

function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setUserProfile(null)
        setLoading(false)
      }
    })
  }, [])

  const fetchProfile = async (authId) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single()
    setUserProfile(data)
    setLoading(false)
  }

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

  if (userProfile.rol === 'cliente') return <DashboardCliente session={session} userProfile={userProfile} />
  if (userProfile.rol === 'admin') return <DashboardAdmin session={session} userProfile={userProfile} />

  return <Dashboard session={session} userProfile={userProfile} />
}

export default App