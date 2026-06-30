import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Casos from './Casos'
import Clientes from './Clientes'
import Documentos from './Documentos'
import Audiencias from './Audiencias'
import Mensajes from './Mensajes'
import {
  LayoutDashboard, Briefcase, Users, FileText,
  Calendar, MessageSquare, LogOut, Menu, X,
  TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react'

export default function Dashboard({ session }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'casos', label: 'Casos', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'audiencias', label: 'Audiencias', icon: Calendar },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
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

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={{ ...styles.sidebar, width: sidebarOpen ? '260px' : '70px' }}>
        <div style={styles.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <h2 style={styles.sidebarTitle}>SAR</h2>
              <p style={styles.sidebarSubtitle}>Abogados</p>
            </div>
          )}
          <button style={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
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
                }}
                onClick={() => setActivePage(item.id)}
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

        <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
          <LogOut size={20} color="#a0aec0" />
          {sidebarOpen && <span style={styles.navLabel}>Cerrar sesión</span>}
        </button>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>
              {menuItems.find(m => m.id === activePage)?.label}
            </h1>
            <p style={styles.pageSubtitle}>Portal SAR Abogados</p>
          </div>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {session.user.email[0].toUpperCase()}
            </div>
            <span style={styles.userEmail}>{session.user.email}</span>
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
                  <h2 style={{ color: '#1a1a2e', marginBottom: '8px' }}>
                    Bienvenido al Portal SAR Abogados 👋
                  </h2>
                  <p style={{ color: '#636e72' }}>
                    Gestiona tus casos, clientes y documentos desde un solo lugar.
                  </p>
                </div>
                <div style={styles.welcomeDecor} />
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
    justifyContent: 'space-between',
    padding: '24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  sidebarTitle: { color: '#c9a84c', fontSize: '24px', fontWeight: '700' },
  sidebarSubtitle: { color: '#a0aec0', fontSize: '12px' },
  menuBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#a0aec0', padding: '4px'
  },
  nav: { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', transition: 'all 0.2s', width: '100%'
  },
  navLabel: { fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px', border: 'none', background: 'none',
    cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  main: { flex: 1, marginLeft: '260px', transition: 'margin 0.3s ease' },
  topbar: {
    backgroundColor: '#ffffff',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e' },
  pageSubtitle: { fontSize: '12px', color: '#b2bec3', marginTop: '2px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '38px', height: '38px', borderRadius: '50%',
    backgroundColor: '#1a1a2e', color: '#c9a84c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '16px'
  },
  userEmail: { fontSize: '13px', color: '#636e72' },
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
    backgroundColor: '#1a1a2e', borderRadius: '12px',
    padding: '28px', marginBottom: '24px',
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', overflow: 'hidden', position: 'relative'
  },
  welcomeText: { zIndex: 1 },
  welcomeDecor: {
    position: 'absolute', right: '-20px', top: '-20px',
    width: '150px', height: '150px', borderRadius: '50%',
    backgroundColor: 'rgba(201,168,76,0.1)'
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