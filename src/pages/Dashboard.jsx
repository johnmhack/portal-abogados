import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Casos from './Casos'
import Clientes from './Clientes'
import Documentos from './Documentos'
import Audiencias from './Audiencias'
import Juzgados from './Juzgados'
import Mensajes from './Mensajes'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'
import {
  LayoutDashboard, Briefcase, Users, FileText,
  Calendar, MessageSquare, LogOut, Menu, X,
  CheckCircle, AlertCircle, Landmark
} from 'lucide-react'

export default function Dashboard({ session, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'casos', label: 'Casos', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'juzgados', label: 'Juzgados', icon: Landmark },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'audiencias', label: 'Audiencias', icon: Calendar },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare, disabled: true },
  ]

  const [stats, setStats] = useState([
  { label: 'Casos Activos', value: '0', icon: Briefcase, color: '#0984e3' },
  { label: 'En Audiencia', value: '0', icon: Calendar, color: '#c9a84c' },
  { label: 'Casos Ganados', value: '0', icon: CheckCircle, color: '#00b894' },
  { label: 'Pendientes', value: '0', icon: AlertCircle, color: '#d63031' },
])
const [casosRecientes, setCasosRecientes] = useState([])
useEffect(() => {
  fetchStats()
  fetchCasosRecientes()
}, [])

const fetchStats = async () => {
  const { data } = await supabase.from('cases').select('status')
  if (!data) return
  setStats([
    { label: 'Casos Activos', value: data.filter(c => c.status === 'activo').length, icon: Briefcase, color: '#0984e3' },
    { label: 'En Audiencia', value: data.filter(c => c.status === 'audiencia').length, icon: Calendar, color: '#c9a84c' },
    { label: 'Casos Ganados', value: data.filter(c => c.status === 'ganado').length, icon: CheckCircle, color: '#00b894' },
    { label: 'Pendientes', value: data.filter(c => c.status === 'en_proceso').length, icon: AlertCircle, color: '#d63031' },
  ])
}

const fetchCasosRecientes = async () => {
  const { data } = await supabase.from('cases').select('*, clients(nombre, apellido)').order('creado_en', { ascending: false }).limit(5)
  setCasosRecientes(data || [])
}

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombreUsuario = userProfile?.nombre || session.user.email?.split('@')[0] || ''
  const isHome = activePage === 'dashboard'
  const pageLabel = menuItems.find(m => m.id === activePage)?.label
  const iniciales = `${userProfile?.nombre?.[0] || session.user.email?.[0] || ''}${userProfile?.apellido?.[0] || ''}`.toUpperCase()

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={{ ...styles.sidebar, width: sidebarOpen ? '260px' : '70px' }}>
        <div style={{
          ...styles.sidebarHeader,
          flexDirection: sidebarOpen ? 'row' : 'column',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          gap: sidebarOpen ? '12px' : '14px',
          padding: sidebarOpen ? '22px 16px' : '20px 10px',
        }}>
          <div style={{
            ...styles.logoWrap,
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            width: sidebarOpen ? 'auto' : '100%',
          }}>
            <img
              src={logo}
              alt="SAR Abogados"
              style={{
                height: sidebarOpen ? '44px' : '36px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
            {sidebarOpen && (
              <div style={styles.logoText}>
                <span style={styles.logoSub}>Abogados</span>
              </div>
            )}
          </div>
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                style={{
                  ...styles.navItem,
                  backgroundColor: activePage === item.id ? 'rgba(201,168,76,0.15)' : 'transparent',
                  borderLeft: activePage === item.id ? '3px solid #c9a84c' : '3px solid transparent',
                  opacity: item.disabled ? 0.4 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={() => !item.disabled && setActivePage(item.id)}
              >
                <Icon size={20} color={activePage === item.id ? '#c9a84c' : '#a0aec0'} />
                {sidebarOpen && (
                  <span style={{
                    ...styles.navLabel,
                    color: activePage === item.id ? '#c9a84c' : '#a0aec0'
                  }}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={styles.logoutWrap}>
          <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} color="#fab1a0" />
            {sidebarOpen && <span style={styles.logoutLabel}>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ ...styles.main, marginLeft: sidebarOpen ? '260px' : '70px' }}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <div>
            {isHome ? (
              <>
                <p style={styles.brandLine}>SAR Abogados</p>
                <h1 style={styles.pageTitleHome}>
                  {saludo}, {nombreUsuario}
                </h1>
                <div style={styles.titleAccent} />
              </>
            ) : (
              <>
                <h1 style={styles.pageTitle}>{pageLabel}</h1>
                <p style={styles.pageSubtitle}>Gestión del despacho</p>
              </>
            )}
          </div>
          <div style={styles.userInfo}>
            <div>
              <p style={styles.userName}>{nombreUsuario}{userProfile?.apellido ? ` ${userProfile.apellido}` : ''}</p>
              <p style={styles.userEmail}>{session.user.email}</p>
              {userProfile?.rol && (
                <p style={styles.userRol}>{userProfile.rol}</p>
              )}
            </div>
            <div style={styles.avatar}>{iniciales}</div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={styles.content}>
          {activePage === 'dashboard' && (
            <>
              {/* STATS */}
              <div style={styles.statsGrid}>
                {stats.map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <div key={i} style={styles.statCard}>
                      <div style={styles.statInfo}>
                        <p style={styles.statLabel}>{stat.label}</p>
                        <h2 style={styles.statValue}>{stat.value}</h2>
                      </div>
                      <div style={{ ...styles.statIcon, backgroundColor: stat.color + '20' }}>
                        <Icon size={28} color={stat.color} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* WELCOME */}
              <div style={styles.welcomeCard}>
                <div style={styles.welcomeText}>
                  <h2 style={{ color: '#fff', marginBottom: '8px', fontSize: '20px', fontWeight: '700' }}>
                    Tu práctica, en un solo lugar
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                    Casos, clientes, documentos y audiencias listos para gestionar.
                  </p>
                </div>
                <div style={styles.welcomeDecor} />
                <div style={styles.welcomeDecor2} />
              </div>

              {/* RECENT */}
              <div style={styles.recentCard}>
                <h3 style={styles.recentTitle}>Casos Recientes</h3>
                {casosRecientes.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Briefcase size={40} color="#dfe6e9" />
                    <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay casos aún</p>
                  </div>
                ) : (  
                  casosRecientes.map(caso => (  
                    <div key={caso.id} style={styles.casoRow}>
                      <div>
                        <p style={styles.casoTitulo}>{caso.titulo}</p>
                        <p style={styles.casoCliente}>{caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : 'Sin cliente'}</p>
                      </div>
                      <span style={{ ...styles.casoBadge, backgroundColor: caso.status === 'ganado' ? '#00b89420' : caso.status === 'activo' ? '#0984e320' : '#c9a84c20', color: caso.status === 'ganado' ? '#00b894' : caso.status === 'activo' ? '#0984e3' : '#c9a84c' }}>
                        {caso.status?.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                )}    
              </div>
            </>
          )}

          {activePage === 'casos' && <Casos session={session} />}
          {activePage === 'clientes' && <Clientes session={session} />}
          {activePage === 'juzgados' && <Juzgados />}
          {activePage === 'documentos' && <Documentos />}
          {activePage === 'audiencias' && <Audiencias />}
          {activePage === 'mensajes' && <Mensajes session={session} />}


        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' },
  sidebar: {
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    position: 'fixed',
    height: '100vh',
    zIndex: 100,
    overflow: 'hidden'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    minHeight: '88px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    lineHeight: 1.1,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  sidebarTitle: { color: '#c9a84c', fontSize: '24px', fontWeight: '700' },
  sidebarSubtitle: { color: '#a0aec0', fontSize: '12px' },
  menuBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#a0aec0',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nav: { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', transition: 'all 0.2s', width: '100%'
  },
  navLabel: { fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  logoutWrap: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 14px',
    border: '1px solid rgba(214,48,49,0.35)',
    borderRadius: '10px',
    background: 'rgba(214,48,49,0.12)',
    cursor: 'pointer',
  },
  logoutLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fab1a0',
    whiteSpace: 'nowrap',
  },
  main: { flex: 1, marginLeft: '260px', transition: 'margin 0.3s ease' },
  topbar: {
    background: 'linear-gradient(180deg, #22223a 0%, #1a1a2e 100%)',
    padding: '22px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 16px rgba(26,26,46,0.25)',
    borderBottom: '1px solid rgba(201,168,76,0.15)',
  },
  brandLine: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#c9a84c',
    margin: '0 0 6px',
  },
  pageTitleHome: {
    fontSize: '30px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  titleAccent: {
    width: '48px',
    height: '3px',
    backgroundColor: '#c9a84c',
    borderRadius: '2px',
    marginTop: '10px',
  },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(201,168,76,0.12)',
    color: '#c9a84c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px',
    border: '2px solid #c9a84c',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    flexShrink: 0,
  },
  userName: { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '-0.01em' },
  userEmail: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '3px 0 0' },
  userRol: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#c9a84c',
    textTransform: 'capitalize',
    margin: '4px 0 0',
    letterSpacing: '0.04em',
  },
  content: { padding: '32px' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px', marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#ffffff', borderRadius: '12px',
    padding: '20px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  statInfo: {},
  statLabel: { fontSize: '13px', color: '#b2bec3', marginBottom: '6px' },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#1a1a2e' },
  statIcon: { padding: '12px', borderRadius: '12px' },
  welcomeCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%)',
    borderRadius: '14px',
    padding: '28px 32px', marginBottom: '24px',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', overflow: 'hidden', position: 'relative'
  },
  welcomeText: { zIndex: 1, maxWidth: '520px' },
  welcomeDecor: {
    position: 'absolute', right: '-20px', top: '-20px',
    width: '150px', height: '150px', borderRadius: '50%',
    backgroundColor: 'rgba(201,168,76,0.12)'
  },
  welcomeDecor2: {
    position: 'absolute', right: '60px', bottom: '-40px',
    width: '100px', height: '100px', borderRadius: '50%',
    backgroundColor: 'rgba(201,168,76,0.08)'
  },
  recentCard: {
    backgroundColor: '#ffffff', borderRadius: '12px',
    padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  },
  recentTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1a1a2e' },
  emptyState: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '40px'
  },
  casoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f2f5' 
  },
  casoTitulo: {
    fontSize: '14px', fontWeight: '600', color: '#1a1a2e', marginBottom: '2px' 
  },
  casoCliente: {
    fontSize: '12px', color: '#b2bec3' 
  },
  casoBadge: {
    padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', whiteSpace: 'nowrap' 
  },
}