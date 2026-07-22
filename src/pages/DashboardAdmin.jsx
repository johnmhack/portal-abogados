import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'
import {
  LayoutDashboard, Briefcase, Users, UserCheck,
  LogOut, Menu, X, Plus, CheckCircle, AlertCircle, Calendar
} from 'lucide-react'

export default function DashboardAdmin({ session, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'casos', label: 'Todos los Casos', icon: Briefcase },
    { id: 'abogados', label: 'Abogados', icon: UserCheck },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ]

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={{ ...styles.sidebar, width: sidebarOpen ? '260px' : '70px' }}>
        <div style={styles.sidebarHeader}>
          {sidebarOpen && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <img src={logo} alt="SAR" style={{ height: '40px', width: 'auto' }} />
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
              <button key={item.id} style={{ ...styles.navItem, backgroundColor: activePage === item.id ? 'rgba(201,168,76,0.15)' : 'transparent', borderLeft: activePage === item.id ? '3px solid #c9a84c' : '3px solid transparent' }} onClick={() => setActivePage(item.id)}>
                <Icon size={20} color={activePage === item.id ? '#c9a84c' : '#a0aec0'} />
                {sidebarOpen && <span style={{ ...styles.navLabel, color: activePage === item.id ? '#c9a84c' : '#a0aec0' }}>{item.label}</span>}
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
      <div style={{ ...styles.main, marginLeft: sidebarOpen ? '260px' : '70px' }}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{menuItems.find(m => m.id === activePage)?.label}</h1>
            <p style={styles.pageSubtitle}>Panel de Administración — SAR Abogados</p>
          </div>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{userProfile.nombre[0]}</div>
            <span style={styles.userEmail}>{userProfile.nombre} {userProfile.apellido}</span>
          </div>
        </div>

        <div style={styles.content}>
          {activePage === 'dashboard' && <AdminDashboard />}
          {activePage === 'casos' && <AdminCasos />}
          {activePage === 'abogados' && <AdminAbogados />}
          {activePage === 'clientes' && <AdminClientes />}
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD ADMIN ──
function AdminDashboard() {
  const [stats, setStats] = useState({ casos: 0, clientes: 0, abogados: 0, ganados: 0 })
  const [casosRecientes, setCasosRecientes] = useState([])

  useEffect(() => {
    fetchStats()
    fetchCasosRecientes()
  }, [])

  const fetchStats = async () => {
    const [{ count: casos }, { count: clientes }, { count: abogados }, { count: ganados }] = await Promise.all([
      supabase.from('cases').select('*', { count: 'exact', head: true }),
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('rol', 'abogado'),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'ganado'),
    ])
    setStats({ casos, clientes, abogados, ganados })
  }

  const fetchCasosRecientes = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido), users(nombre, apellido)')
      .order('creado_en', { ascending: false })
      .limit(8)
    setCasosRecientes(data || [])
  }

  const statsData = [
    { label: 'Total Casos', value: stats.casos, icon: Briefcase, color: '#0984e3' },
    { label: 'Clientes', value: stats.clientes, icon: Users, color: '#c9a84c' },
    { label: 'Abogados', value: stats.abogados, icon: UserCheck, color: '#6c5ce7' },
    { label: 'Casos Ganados', value: stats.ganados, icon: CheckCircle, color: '#00b894' },
  ]

  const statusColor = { activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7', cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031' }

  return (
    <>
      <div style={styles.statsGrid}>
        {statsData.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} style={styles.statCard}>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <h2 style={styles.statValue}>{stat.value}</h2>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: stat.color + '20' }}>
                <Icon size={28} color={stat.color} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Casos Recientes</h3>
        <div style={styles.tabla}>
          <div style={styles.tablaHeader}>
            <span>Caso</span>
            <span>Cliente</span>
            <span>Abogado</span>
            <span>Estado</span>
          </div>
          {casosRecientes.map(caso => (
            <div key={caso.id} style={styles.tablaFila}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{caso.titulo}</span>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : '—'}</span>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{caso.users ? `${caso.users.nombre} ${caso.users.apellido || ''}` : '—'}</span>
              <span style={{ ...styles.badge, backgroundColor: statusColor[caso.status] + '20', color: statusColor[caso.status] }}>{caso.status?.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── TODOS LOS CASOS ──
function AdminCasos() {
  const [casos, setCasos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => { fetchCasos() }, [])

  const fetchCasos = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido, documento, telefono), users(nombre, apellido)')
      .order('creado_en', { ascending: false })
    setCasos(data || [])
  }

  const casosFiltrados = casos.filter(c => {
    const busLower = busqueda.toLowerCase()
    const matchBusqueda = 
      c.titulo?.toLowerCase().includes(busLower) ||
      c.numero_radicado?.toLowerCase().includes(busLower) ||
      c.clients?.nombre?.toLowerCase().includes(busLower) ||
      c.clients?.apellido?.toLowerCase().includes(busLower) ||
      c.clients?.documento?.toLowerCase().includes(busLower) ||
      c.clients?.telefono?.toLowerCase().includes(busLower) ||
      c.users?.nombre?.toLowerCase().includes(busLower) ||
      c.users?.apellido?.toLowerCase().includes(busLower)
    const matchStatus = filtroStatus ? c.status === filtroStatus : true
    return matchBusqueda && matchStatus
  })

  const statusColor = { activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7', cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031' }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input 
          style={{ ...styles.input, flex: 1 }} 
          placeholder="Buscar por caso, cliente, cédula, teléfono o abogado..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
        />
        <select style={{ ...styles.input, maxWidth: '200px' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="en_proceso">En proceso</option>
          <option value="audiencia">Audiencia</option>
          <option value="ganado">Ganado</option>
          <option value="perdido">Perdido</option>
          <option value="cerrado">Cerrado</option>
        </select>
      </div>

      <p style={{ fontSize: '13px', color: '#b2bec3', marginBottom: '12px' }}>
        {casosFiltrados.length} resultado{casosFiltrados.length !== 1 ? 's' : ''}
      </p>

      <div style={styles.tabla}>
        <div style={{ ...styles.tablaHeader, gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px' }}>
          <span>Caso</span>
          <span>Cliente</span>
          <span>Documento</span>
          <span>Abogado</span>
          <span>Estado</span>
        </div>
        {casosFiltrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#b2bec3' }}>No se encontraron casos</div>
        ) : (
          casosFiltrados.map(caso => (
            <div key={caso.id} style={{ ...styles.tablaFila, gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{caso.titulo}</p>
                {caso.numero_radicado && <p style={{ fontSize: '12px', color: '#b2bec3' }}>{caso.numero_radicado}</p>}
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#636e72' }}>{caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : '—'}</p>
                {caso.clients?.telefono && <p style={{ fontSize: '12px', color: '#b2bec3' }}>{caso.clients.telefono}</p>}
              </div>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{caso.clients?.documento || '—'}</span>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{caso.users ? `${caso.users.nombre} ${caso.users.apellido || ''}` : '—'}</span>
              <span style={{ ...styles.badge, backgroundColor: statusColor[caso.status] + '20', color: statusColor[caso.status] }}>{caso.status?.replace('_', ' ')}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── ABOGADOS ──
function AdminAbogados() {
  const [abogados, setAbogados] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', email: '', telefono: '', rol: 'abogado' })

  useEffect(() => { fetchAbogados() }, [])

  const fetchAbogados = async () => {
    const { data } = await supabase.from('users').select('*').in('rol', ['abogado', 'socio', 'asistente']).order('nombre')
    setAbogados(data || [])
  }

  const crearAbogado = async () => {
  if (!nuevo.nombre || !nuevo.email) return
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(nuevo)
      }
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      const msg = data.error || 'Error desconocido'
      if (msg.includes('already')) {
        alert('❌ Ya existe un usuario con ese correo electrónico.')
      } else if (msg.includes('invalid')) {
        alert('❌ El correo electrónico no es válido.')
      } else {
        alert('❌ Error: ' + msg)
      }
      return
    }

    alert('✅ Abogado creado exitosamente. Contraseña inicial: Temporal123!')
    setModalOpen(false)
    setNuevo({ nombre: '', apellido: '', email: '', telefono: '', rol: 'abogado' })
    fetchAbogados()
  } catch (e) {
    alert('❌ Error de conexión: ' + e.message)
  }
}

  const rolColor = { abogado: '#0984e3', socio: '#6c5ce7', asistente: '#c9a84c', admin: '#d63031' }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={styles.cardTitle}>Equipo de Abogados</h3>
        <button style={styles.btnNuevo} onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo Abogado
        </button>
      </div>

      {abogados.map(a => (
        <div key={a.id} style={styles.userRow}>
          <div style={styles.userAvatar}>{a.nombre[0]}{a.apellido?.[0]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e' }}>{a.nombre} {a.apellido}</p>
            <p style={{ fontSize: '13px', color: '#b2bec3' }}>{a.email}</p>
          </div>
          <span style={{ ...styles.badge, backgroundColor: rolColor[a.rol] + '20', color: rolColor[a.rol] }}>{a.rol}</span>
        </div>
      ))}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Nuevo Abogado</h3>
              <button style={styles.closeBtn} onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input style={styles.input} placeholder="Nombre *" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
                <input style={styles.input} placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({ ...nuevo, apellido: e.target.value })} />
              </div>
              <input style={styles.input} placeholder="Email *" type="email" value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} />
              <input style={styles.input} placeholder="Teléfono" value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
              <select style={styles.input} value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value })}>
                <option value="abogado">Abogado</option>
                <option value="socio">Socio</option>
                <option value="asistente">Asistente</option>
              </select>
              <p style={{ fontSize: '12px', color: '#b2bec3' }}>La contraseña inicial será: <strong>Temporal123!</strong></p>
              <button style={styles.btnGuardar} onClick={crearAbogado}>Crear Abogado</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CLIENTES ADMIN ──
function AdminClientes() {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clients').select('*').order('nombre')
    setClientes(data || [])
  }

  const crearAccesoCliente = async (cliente) => {
    if (!cliente.correo) { alert('❌ El cliente no tiene correo registrado.'); return }
    if (!window.confirm(`¿Crear acceso para ${cliente.nombre} ${cliente.apellido || ''}?`)) return
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ nombre: cliente.nombre, apellido: cliente.apellido || '', email: cliente.correo, telefono: cliente.telefono || '', rol: 'cliente', client_id: cliente.id })
        }
      )
      const data = await response.json()
      if (!response.ok || data.error) {
        alert(data.error?.includes('already') ? '⚠️ Este cliente ya tiene acceso.' : '❌ Error: ' + data.error)
        return
      }
      alert(`✅ Acceso creado!\n\nCorreo: ${cliente.correo}\nContraseña: Temporal123!`)
    } catch (e) {
      alert('❌ Error: ' + e.message)
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.correo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={styles.card}>
      <input style={{ ...styles.input, marginBottom: '20px' }} placeholder="Buscar cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      {clientesFiltrados.map(c => (
        <div key={c.id} style={styles.userRow}>
          <div style={styles.userAvatar}>{c.nombre[0]}{c.apellido?.[0]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e' }}>{c.nombre} {c.apellido}</p>
            <p style={{ fontSize: '13px', color: '#b2bec3' }}>{c.correo} {c.telefono ? `· ${c.telefono}` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ ...styles.badge, backgroundColor: '#f0f2f5', color: '#636e72' }}>{c.tipo_persona}</span>
            <button
              style={{ backgroundColor: '#1A474F', color: '#CFB27E', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
              onClick={() => crearAccesoCliente(c)}
            >
              🔑 Crear acceso
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' },
  sidebar: { backgroundColor: '#1a1a2e', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', position: 'fixed', height: '100vh', zIndex: 100, overflow: 'hidden' },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  sidebarTitle: { color: '#c9a84c', fontSize: '24px', fontWeight: '700' },
  sidebarSubtitle: { color: '#a0aec0', fontSize: '12px' },
  menuBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: '4px' },
  nav: { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%' },
  navLabel: { fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: 'none', background: 'none', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)' },
  main: { flex: 1, transition: 'margin 0.3s ease' },
  topbar: { backgroundColor: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e' },
  pageSubtitle: { fontSize: '12px', color: '#b2bec3', marginTop: '2px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#1a1a2e', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' },
  userEmail: { fontSize: '13px', color: '#636e72' },
  content: { padding: '32px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' },
  statCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statLabel: { fontSize: '13px', color: '#b2bec3', marginBottom: '6px' },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#1a1a2e' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#1a1a2e', marginBottom: '16px' },
  tabla: { overflow: 'hidden', borderRadius: '8px', border: '1px solid #f0f2f5' },
  tablaHeader: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 120px', padding: '12px 16px', backgroundColor: '#f8f9fa', fontSize: '12px', fontWeight: '600', color: '#b2bec3', textTransform: 'uppercase' },
  tablaFila: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 120px', padding: '14px 16px', borderTop: '1px solid #f0f2f5', alignItems: 'center' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', display: 'inline-block' },
  userRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: '1px solid #f0f2f5' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1a1a2e', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  btnNuevo: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
}