import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'
import {
  LayoutDashboard, Briefcase, Users, UserCheck,
  LogOut, Menu, X, Plus, CheckCircle, Settings, AlertCircle
} from 'lucide-react'

const STAFF_ROLES = ['abogado', 'socio', 'asistente']
const OPS_ROLES = [...STAFF_ROLES, 'cliente']
const ALL_ROLES = [...OPS_ROLES, 'admin', 'superadmin']

const rolColor = {
  abogado: '#0984e3',
  socio: '#6c5ce7',
  asistente: '#c9a84c',
  cliente: '#00b894',
  admin: '#d63031',
  superadmin: '#e17055',
}

const statusColor = {
  activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7',
  cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031',
}

export default function DashboardAdmin({ session, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState(() => sessionStorage.getItem('sar_admin_page') || 'dashboard')
  const esSuperadmin = userProfile?.rol === 'superadmin'

  useEffect(() => {
    sessionStorage.setItem('sar_admin_page', activePage)
  }, [activePage])

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'casos', label: 'Todos los Casos', icon: Briefcase },
    { id: 'abogados', label: 'Abogados', icon: UserCheck },
    { id: 'clientes', label: 'Clientes', icon: Users },
    ...(esSuperadmin ? [{ id: 'sistema', label: 'Sistema', icon: Settings }] : []),
  ]

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombreUsuario = userProfile?.nombre || session.user.email?.split('@')[0] || ''
  const isHome = activePage === 'dashboard'
  const pageLabel = menuItems.find(m => m.id === activePage)?.label
  const pageSubtitles = {
    casos: 'Vista global y asignación de abogados',
    abogados: 'Equipo del despacho',
    clientes: 'Directorio y accesos al portal',
    sistema: 'Usuarios, roles y mantenimiento',
  }
  const pageSubtitle = pageSubtitles[activePage] || 'Panel de administración'
  const iniciales = `${userProfile?.nombre?.[0] || ''}${userProfile?.apellido?.[0] || ''}`.toUpperCase()
  const rolLabel = esSuperadmin ? 'Superadmin' : 'Administración'

  return (
    <div style={styles.container}>
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
              alt="SAR Consultores Integrales"
              style={{
                height: sidebarOpen ? '44px' : '36px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
            {sidebarOpen && (
              <div style={styles.logoText}>
                <span style={styles.logoSub}>Consultores Integrales</span>
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
            const active = activePage === item.id
            return (
              <button
                key={item.id}
                style={{
                  ...styles.navItem,
                  backgroundColor: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                  borderLeft: active ? '3px solid #c9a84c' : '3px solid transparent',
                }}
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={20} color={active ? '#c9a84c' : '#a0aec0'} />
                {sidebarOpen && (
                  <span style={{ ...styles.navLabel, color: active ? '#c9a84c' : '#a0aec0' }}>{item.label}</span>
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

      <div style={{ ...styles.main, marginLeft: sidebarOpen ? '260px' : '70px' }}>
        <div style={styles.topbar}>
          <div>
            {isHome ? (
              <>
                <p style={styles.brandLine}>SAR Consultores Integrales</p>
                <h1 style={styles.pageTitleHome}>{saludo}, {nombreUsuario}</h1>
                <div style={styles.titleAccent} />
              </>
            ) : (
              <>
                <p style={styles.brandLine}>SAR Consultores Integrales</p>
                <h1 style={styles.pageTitle}>{pageLabel}</h1>
                <p style={styles.pageSubtitle}>{pageSubtitle}</p>
                <div style={styles.titleAccent} />
              </>
            )}
          </div>
          <div style={styles.userInfo}>
            <div>
              <p style={styles.userName}>{nombreUsuario}{userProfile?.apellido ? ` ${userProfile.apellido}` : ''}</p>
              <p style={styles.userEmail}>{session.user.email}</p>
              <p style={styles.userRol}>{rolLabel}</p>
            </div>
            <div style={styles.avatar}>{iniciales || '?'}</div>
          </div>
        </div>

        <div style={styles.content}>
          {activePage === 'dashboard' && <AdminDashboard />}
          {activePage === 'casos' && <AdminCasos />}
          {activePage === 'abogados' && <AdminAbogados esSuperadmin={esSuperadmin} />}
          {activePage === 'clientes' && <AdminClientes />}
          {activePage === 'sistema' && esSuperadmin && <AdminSistema />}
        </div>
      </div>
    </div>
  )
}

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
      supabase.from('users').select('*', { count: 'exact', head: true }).in('rol', STAFF_ROLES),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'ganado'),
    ])
    setStats({ casos, clientes, abogados, ganados })
  }

  const fetchCasosRecientes = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido), users!abogado_id(nombre, apellido)')
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

  return (
    <>
      <div style={styles.statsGrid}>
        {statsData.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} style={styles.statCard}>
              <div>
                <p style={styles.statLabel}>{stat.label}</p>
                <h2 style={styles.statValue}>{stat.value ?? 0}</h2>
              </div>
              <div style={{ ...styles.statIcon, backgroundColor: stat.color + '18' }}>
                <Icon size={24} color={stat.color} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Casos recientes</h3>
        <div style={styles.tabla}>
          <div style={styles.tablaHeader}>
            <span>Caso</span>
            <span>Cliente</span>
            <span>Abogado</span>
            <span>Estado</span>
          </div>
          {casosRecientes.length === 0 ? (
            <div style={styles.emptyRow}>No hay casos aún</div>
          ) : (
            casosRecientes.map(caso => (
              <div key={caso.id} style={styles.tablaFila}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{caso.titulo}</span>
                <span style={{ fontSize: '13px', color: '#636e72' }}>
                  {caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : '—'}
                </span>
                <span style={{ fontSize: '13px', color: '#636e72' }}>
                  {caso.users ? `${caso.users.nombre} ${caso.users.apellido || ''}` : 'Sin asignar'}
                </span>
                <span style={{ ...styles.badge, backgroundColor: (statusColor[caso.status] || '#636e72') + '20', color: statusColor[caso.status] || '#636e72' }}>
                  {caso.status?.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function AdminCasos() {
  const [casos, setCasos] = useState([])
  const [abogados, setAbogados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [guardandoId, setGuardandoId] = useState(null)

  useEffect(() => {
    fetchCasos()
    fetchAbogados()
  }, [])

  const fetchCasos = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido, documento, telefono), users!abogado_id(nombre, apellido)')
      .order('creado_en', { ascending: false })
    setCasos(data || [])
  }

  const fetchAbogados = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, nombre, apellido, rol')
      .in('rol', STAFF_ROLES)
      .order('nombre')
    setAbogados(data || [])
  }

  const asignarAbogado = async (casoId, abogadoId) => {
    setGuardandoId(casoId)
    const { error } = await supabase
      .from('cases')
      .update({ abogado_id: abogadoId || null })
      .eq('id', casoId)
    setGuardandoId(null)
    if (error) {
      alert('No se pudo asignar: ' + error.message)
      return
    }
    fetchCasos()
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

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          style={{ ...styles.input, flex: 1, minWidth: '220px' }}
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
        <div style={{ ...styles.tablaHeader, gridTemplateColumns: '2fr 1.4fr 1fr 1.6fr 110px' }}>
          <span>Caso</span>
          <span>Cliente</span>
          <span>Documento</span>
          <span>Asignar abogado</span>
          <span>Estado</span>
        </div>
        {casosFiltrados.length === 0 ? (
          <div style={styles.emptyRow}>No se encontraron casos</div>
        ) : (
          casosFiltrados.map(caso => (
            <div key={caso.id} style={{ ...styles.tablaFila, gridTemplateColumns: '2fr 1.4fr 1fr 1.6fr 110px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>{caso.titulo}</p>
                {caso.numero_radicado && <p style={{ fontSize: '12px', color: '#b2bec3', margin: '4px 0 0' }}>{caso.numero_radicado}</p>}
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#636e72', margin: 0 }}>
                  {caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : '—'}
                </p>
                {caso.clients?.telefono && <p style={{ fontSize: '12px', color: '#b2bec3', margin: '4px 0 0' }}>{caso.clients.telefono}</p>}
              </div>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{caso.clients?.documento || '—'}</span>
              <select
                style={{ ...styles.input, margin: 0, fontSize: '13px', padding: '8px 10px' }}
                value={caso.abogado_id || ''}
                disabled={guardandoId === caso.id}
                onChange={e => asignarAbogado(caso.id, e.target.value)}
              >
                <option value="">Sin asignar</option>
                {abogados.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.apellido || ''} ({a.rol})
                  </option>
                ))}
              </select>
              <span style={{ ...styles.badge, backgroundColor: (statusColor[caso.status] || '#636e72') + '20', color: statusColor[caso.status] || '#636e72' }}>
                {caso.status?.replace('_', ' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AdminAbogados({ esSuperadmin }) {
  const [abogados, setAbogados] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', email: '', telefono: '', rol: 'abogado' })

  useEffect(() => { fetchAbogados() }, [])

  const fetchAbogados = async () => {
    const roles = esSuperadmin ? [...STAFF_ROLES, 'admin'] : STAFF_ROLES
    const { data } = await supabase.from('users').select('*').in('rol', roles).order('nombre')
    setAbogados(data || [])
  }

  const crearAbogado = async () => {
    if (!nuevo.nombre || !nuevo.email) return
    if (nuevo.rol === 'admin' && !esSuperadmin) {
      alert('Solo el superadmin puede crear administradores.')
      return
    }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(nuevo),
        }
      )
      const data = await response.json()
      if (!response.ok || data.error) {
        const msg = data.error || 'Error desconocido'
        if (msg.includes('already')) alert('Ya existe un usuario con ese correo electrónico.')
        else if (msg.includes('invalid')) alert('El correo electrónico no es válido.')
        else alert('Error: ' + msg)
        return
      }
      alert('Usuario creado. Contraseña inicial: Temporal123!')
      setModalOpen(false)
      setNuevo({ nombre: '', apellido: '', email: '', telefono: '', rol: 'abogado' })
      fetchAbogados()
    } catch (e) {
      alert('Error de conexión: ' + e.message)
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Equipo de abogados</h3>
        <button style={styles.btnNuevo} onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {abogados.map(a => (
        <div key={a.id} style={styles.userRow}>
          <div style={styles.userAvatar}>{a.nombre?.[0]}{a.apellido?.[0]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>{a.nombre} {a.apellido}</p>
            <p style={{ fontSize: '13px', color: '#b2bec3', margin: '4px 0 0' }}>{a.email}</p>
          </div>
          <span style={{ ...styles.badge, backgroundColor: (rolColor[a.rol] || '#636e72') + '20', color: rolColor[a.rol] || '#636e72' }}>
            {a.rol}
          </span>
        </div>
      ))}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Nuevo usuario del equipo</h3>
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
                {esSuperadmin && <option value="admin">Admin (despacho)</option>}
              </select>
              <p style={{ fontSize: '12px', color: '#b2bec3', margin: 0 }}>
                Contraseña inicial: <strong>Temporal123!</strong>
              </p>
              <button style={styles.btnGuardar} onClick={crearAbogado}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminClientes() {
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clients').select('*').order('nombre')
    setClientes(data || [])
  }

  const crearAccesoCliente = async (cliente) => {
    if (!cliente.correo) { alert('El cliente no tiene correo registrado.'); return }
    if (!window.confirm(`¿Crear acceso para ${cliente.nombre} ${cliente.apellido || ''}?`)) return
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            nombre: cliente.nombre,
            apellido: cliente.apellido || '',
            email: cliente.correo,
            telefono: cliente.telefono || '',
            rol: 'cliente',
            client_id: cliente.id,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok || data.error) {
        alert(data.error?.includes('already') ? 'Este cliente ya tiene acceso.' : 'Error: ' + data.error)
        return
      }
      alert(`Acceso creado!\n\nCorreo: ${cliente.correo}\nContraseña: Temporal123!`)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.apellido || ''}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.correo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={styles.card}>
      <input
        style={{ ...styles.input, marginBottom: '20px' }}
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />
      {clientesFiltrados.map(c => (
        <div key={c.id} style={styles.userRow}>
          <div style={styles.userAvatar}>{c.nombre?.[0]}{c.apellido?.[0]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>{c.nombre} {c.apellido}</p>
            <p style={{ fontSize: '13px', color: '#b2bec3', margin: '4px 0 0' }}>
              {c.correo || 'Sin correo'}{c.telefono ? ` · ${c.telefono}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {c.calidad_procesal && (
              <span style={{ ...styles.badge, backgroundColor: '#6c5ce718', color: '#6c5ce7' }}>
                {c.calidad_procesal}
              </span>
            )}
            <span style={{ ...styles.badge, backgroundColor: '#f0f2f5', color: '#636e72' }}>{c.tipo_persona || '—'}</span>
            <button style={styles.btnAcceso} onClick={() => crearAccesoCliente(c)}>
              Crear acceso
            </button>
          </div>
        </div>
      ))}
      {clientesFiltrados.length === 0 && <div style={styles.emptyRow}>No hay clientes</div>}
    </div>
  )
}

function AdminSistema() {
  const [usuarios, setUsuarios] = useState([])
  const [casosSinAbogado, setCasosSinAbogado] = useState(0)
  const [clientesPortalSinLink, setClientesPortalSinLink] = useState(0)
  const [guardandoId, setGuardandoId] = useState(null)

  useEffect(() => {
    fetchUsuarios()
    fetchAlertas()
  }, [])

  const fetchUsuarios = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre')
    setUsuarios(data || [])
  }

  const fetchAlertas = async () => {
    const [{ count: sinAbogado }, { data: clientesPortal }] = await Promise.all([
      supabase.from('cases').select('*', { count: 'exact', head: true }).is('abogado_id', null),
      supabase.from('users').select('id, client_id').eq('rol', 'cliente'),
    ])
    setCasosSinAbogado(sinAbogado || 0)
    setClientesPortalSinLink((clientesPortal || []).filter(u => !u.client_id).length)
  }

  const cambiarRol = async (userId, nuevoRol) => {
    setGuardandoId(userId)
    const { error } = await supabase.from('users').update({ rol: nuevoRol }).eq('id', userId)
    setGuardandoId(null)
    if (error) {
      alert('No se pudo cambiar el rol: ' + error.message)
      return
    }
    fetchUsuarios()
  }

  return (
    <div>
      <div style={styles.alertasGrid}>
        <div style={styles.alertaCard}>
          <AlertCircle size={20} color="#e17055" />
          <div>
            <p style={styles.alertaValor}>{casosSinAbogado}</p>
            <p style={styles.alertaLabel}>Casos sin abogado asignado</p>
          </div>
        </div>
        <div style={styles.alertaCard}>
          <AlertCircle size={20} color="#c9a84c" />
          <div>
            <p style={styles.alertaValor}>{clientesPortalSinLink}</p>
            <p style={styles.alertaLabel}>Usuarios cliente sin client_id</p>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Usuarios del sistema</h3>
        <div style={styles.tabla}>
          <div style={{ ...styles.tablaHeader, gridTemplateColumns: '1.5fr 2fr 1.4fr' }}>
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
          </div>
          {usuarios.map(u => (
            <div key={u.id} style={{ ...styles.tablaFila, gridTemplateColumns: '1.5fr 2fr 1.4fr' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>
                {u.nombre} {u.apellido || ''}
              </span>
              <span style={{ fontSize: '13px', color: '#636e72' }}>{u.email}</span>
              <select
                style={{ ...styles.input, margin: 0, fontSize: '13px', padding: '8px 10px' }}
                value={u.rol || ''}
                disabled={guardandoId === u.id}
                onChange={e => cambiarRol(u.id, e.target.value)}
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
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
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    minHeight: '88px',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  logoText: { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 },
  logoSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
    maxWidth: '140px',
  },
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
    cursor: 'pointer', transition: 'all 0.2s', width: '100%',
  },
  navLabel: { fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  logoutWrap: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '12px 14px',
    border: '1px solid rgba(214,48,49,0.35)', borderRadius: '10px',
    background: 'rgba(214,48,49,0.12)', cursor: 'pointer',
  },
  logoutLabel: { fontSize: '14px', fontWeight: '600', color: '#fab1a0', whiteSpace: 'nowrap' },
  main: { flex: 1, transition: 'margin 0.3s ease' },
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
    fontSize: '12px', fontWeight: '700', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#c9a84c', margin: '0 0 6px',
  },
  pageTitleHome: {
    fontSize: '30px', fontWeight: '700', color: '#ffffff', margin: 0,
    letterSpacing: '-0.02em', lineHeight: 1.15,
  },
  titleAccent: {
    width: '48px', height: '3px', backgroundColor: '#c9a84c',
    borderRadius: '2px', marginTop: '10px',
  },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' },
  avatar: {
    width: '56px', height: '56px', borderRadius: '50%',
    backgroundColor: 'rgba(201,168,76,0.12)', color: '#c9a84c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '18px', border: '2px solid #c9a84c',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)', flexShrink: 0,
  },
  userName: { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 },
  userEmail: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '3px 0 0' },
  userRol: {
    fontSize: '11px', fontWeight: '700', color: '#c9a84c',
    textTransform: 'capitalize', margin: '4px 0 0', letterSpacing: '0.04em',
  },
  content: { padding: '32px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  statCard: {
    backgroundColor: '#ffffff', borderRadius: '14px', padding: '22px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 2px 10px rgba(26,26,46,0.06)', border: '1px solid #eef0f3',
  },
  statLabel: {
    fontSize: '12px', color: '#8b949e', margin: 0, fontWeight: '600',
    letterSpacing: '0.03em', textTransform: 'uppercase',
  },
  statValue: { fontSize: '32px', fontWeight: '700', color: '#1a1a2e', margin: '6px 0 0', letterSpacing: '-0.03em', lineHeight: 1 },
  statIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  card: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '24px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.06)', border: '1px solid #eef0f3', marginBottom: '20px',
  },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#1a1a2e', marginBottom: '16px' },
  tabla: { overflow: 'hidden', borderRadius: '8px', border: '1px solid #f0f2f5' },
  tablaHeader: {
    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 120px',
    padding: '12px 16px', backgroundColor: '#f8f9fa', fontSize: '12px',
    fontWeight: '600', color: '#b2bec3', textTransform: 'uppercase',
  },
  tablaFila: {
    display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 120px',
    padding: '14px 16px', borderTop: '1px solid #f0f2f5', alignItems: 'center', gap: '8px',
  },
  emptyRow: { padding: '40px', textAlign: 'center', color: '#b2bec3' },
  badge: {
    padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '600', textTransform: 'capitalize', display: 'inline-block',
  },
  userRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '14px 0', borderBottom: '1px solid #f0f2f5',
  },
  userAvatar: {
    width: '40px', height: '40px', borderRadius: '50%',
    backgroundColor: '#1a1a2e', color: '#c9a84c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '15px', flexShrink: 0,
  },
  btnNuevo: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none',
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
  },
  btnAcceso: {
    backgroundColor: '#1A474F', color: '#CFB27E', border: 'none',
    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
    fontWeight: '600', fontSize: '12px',
  },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', width: '100%',
  },
  btnGuardar: {
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none',
    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px',
  },
  alertasGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  alertaCard: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '18px 20px',
    display: 'flex', gap: '14px', alignItems: 'center',
    border: '1px solid #eef0f3', boxShadow: '0 2px 10px rgba(26,26,46,0.06)',
  },
  alertaValor: { fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  alertaLabel: { fontSize: '13px', color: '#636e72', margin: '2px 0 0' },
}
