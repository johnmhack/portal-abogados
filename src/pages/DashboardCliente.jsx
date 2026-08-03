import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'
import {
  LayoutDashboard, Briefcase, FileText, MessageSquare, Calendar,
  LogOut, Menu, X, CheckCircle, Clock, Loader, XCircle, Download, Send, TrendingUp
} from 'lucide-react'
import NotificacionesCampana from '../components/NotificacionesCampana'

const STATUS_COLOR = {
  activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7',
  cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031',
}

export default function DashboardCliente({ session, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState(() => sessionStorage.getItem('sar_cliente_page') || 'inicio')
  const [caso, setCaso] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sessionStorage.setItem('sar_cliente_page', activePage)
  }, [activePage])

  useEffect(() => { fetchCaso() }, [userProfile?.client_id])

  const fetchCaso = async () => {
    const clientId = userProfile?.client_id
    if (!clientId) {
      setCaso(null)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido)')
      .eq('client_id', clientId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()

    setCaso(data)
    setLoading(false)
  }

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'caso', label: 'Mi Caso', icon: Briefcase },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'audiencias', label: 'Audiencias', icon: Calendar },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
  ]

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombreUsuario = userProfile?.nombre || 'Cliente'
  const iniciales = `${userProfile?.nombre?.[0] || ''}${userProfile?.apellido?.[0] || ''}`.toUpperCase()
  const isHome = activePage === 'inicio'
  const pageLabel = menuItems.find(m => m.id === activePage)?.label
  const pageSubtitles = {
    caso: 'Estado y etapas de tu proceso',
    documentos: 'Archivos compartidos contigo',
    audiencias: 'Citas y citaciones',
    mensajes: 'Comunicación con el despacho',
  }

  const sinVinculo = !loading && !userProfile?.client_id
  const sinCaso = !loading && !!userProfile?.client_id && !caso

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
              style={{ height: sidebarOpen ? '44px' : '36px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
            {sidebarOpen && (
              <div style={styles.logoText}>
                <span style={styles.logoSub}>Portal Cliente</span>
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
                <p style={styles.pageSubtitle}>{pageSubtitles[activePage] || 'Portal del Cliente'}</p>
                <div style={styles.titleAccent} />
              </>
            )}
          </div>
          <div style={styles.userInfo}>
            <NotificacionesCampana
              userProfile={userProfile}
              onIrAudiencias={() => setActivePage('audiencias')}
            />
            <div>
              <p style={styles.userName}>{nombreUsuario}{userProfile?.apellido ? ` ${userProfile.apellido}` : ''}</p>
              <p style={styles.userEmail}>{session?.user?.email}</p>
              <p style={styles.userRol}>Cliente</p>
            </div>
            <div style={styles.avatar}>{iniciales || '?'}</div>
          </div>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.estadoCard}>
              <p style={{ color: '#b2bec3', margin: 0 }}>Cargando tu información...</p>
            </div>
          ) : sinVinculo ? (
            <EstadoVacio
              titulo="Cuenta pendiente de vincular"
              texto="Tu acceso está activo, pero aún no está asociado a una ficha de cliente. El despacho completará este paso."
              extra={userProfile?.email || session?.user?.email}
            />
          ) : (
            <>
              {activePage === 'inicio' && (
                <InicioCliente
                  caso={caso}
                  sinCaso={sinCaso}
                  onIrCaso={() => setActivePage('caso')}
                />
              )}
              {activePage === 'caso' && (
                sinCaso
                  ? <EstadoVacio titulo="Sin caso asignado" texto="Cuando el despacho vincule un expediente, aquí verás el detalle y las etapas." />
                  : <CasoView caso={caso} />
              )}
              {activePage === 'documentos' && (
                sinCaso
                  ? <EstadoVacio titulo="Sin documentos" texto="Los documentos aparecerán cuando tengas un caso asignado." />
                  : <DocumentosTab casoId={caso.id} />
              )}
              {activePage === 'audiencias' && (
                sinCaso
                  ? <EstadoVacio titulo="Sin audiencias" texto="Las citas de tu caso aparecerán aquí." />
                  : <AudienciasCliente casoId={caso.id} />
              )}
              {activePage === 'mensajes' && (
                sinCaso
                  ? <EstadoVacio titulo="Sin mensajes" texto="Podrás escribir al despacho cuando tengas un caso asignado." />
                  : <MensajesTab casoId={caso.id} session={session} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EstadoVacio({ titulo, texto, extra }) {
  return (
    <div style={styles.estadoCard}>
      <div style={styles.estadoIcon}>
        <Briefcase size={28} color="#c9a84c" />
      </div>
      <h2 style={styles.estadoTitulo}>{titulo}</h2>
      <p style={styles.estadoTexto}>{texto}</p>
      {extra && <p style={styles.estadoEmail}>{extra}</p>}
    </div>
  )
}

function InicioCliente({ caso, sinCaso, onIrCaso }) {
  if (sinCaso) {
    return (
      <EstadoVacio
        titulo="Aún no tienes casos asignados"
        texto="Cuando el despacho vincule un expediente a tu perfil, aquí verás un resumen de tu proceso."
      />
    )
  }

  return (
    <div>
      <div style={styles.welcomeCard}>
        <div>
          <p style={styles.welcomeEyebrow}>Tu expediente</p>
          <h2 style={styles.welcomeTitle}>{caso.titulo}</h2>
          <p style={styles.welcomeText}>
            Revisa el avance del proceso, documentos compartidos y próximas audiencias desde el menú.
          </p>
          <button style={styles.btnPrimario} onClick={onIrCaso}>Ver mi caso</button>
        </div>
        <span style={{
          ...styles.badge,
          backgroundColor: (STATUS_COLOR[caso.status] || '#636e72') + '25',
          color: STATUS_COLOR[caso.status] || '#636e72',
        }}>
          {caso.status?.replace('_', ' ')}
        </span>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Radicado</p>
          <p style={styles.statValueSmall}>{caso.numero_radicado || '—'}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Ciudad</p>
          <p style={styles.statValueSmall}>{caso.ciudad || '—'}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Apertura</p>
          <p style={styles.statValueSmall}>
            {caso.fecha_apertura ? new Date(caso.fecha_apertura).toLocaleDateString('es-CO') : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

function CasoView({ caso }) {
  return (
    <>
      <div style={styles.casoCard}>
        <div>
          <div style={styles.casoTop}>
            <span style={{
              ...styles.badge,
              backgroundColor: (STATUS_COLOR[caso.status] || '#636e72') + '20',
              color: STATUS_COLOR[caso.status] || '#636e72',
            }}>
              {caso.status?.replace('_', ' ')}
            </span>
            {caso.numero_radicado && <span style={styles.radicado}>Rad. {caso.numero_radicado}</span>}
          </div>
          <h2 style={styles.casoTitulo}>{caso.titulo}</h2>
          {caso.descripcion && <p style={styles.casoDesc}>{caso.descripcion}</p>}
        </div>
        <div style={styles.casoMeta}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Ciudad</span>
            <span style={styles.metaValor}>{caso.ciudad || '—'}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Fecha apertura</span>
            <span style={styles.metaValor}>
              {caso.fecha_apertura ? new Date(caso.fecha_apertura).toLocaleDateString('es-CO') : '—'}
            </span>
          </div>
        </div>
      </div>
      <ProcesoTab casoId={caso.id} />
    </>
  )
}

function ProcesoTab({ casoId }) {
  const [etapas, setEtapas] = useState([])

  useEffect(() => { fetchEtapas() }, [casoId])

  const fetchEtapas = async () => {
    const { data } = await supabase
      .from('case_stages')
      .select('*')
      .eq('case_id', casoId)
      .order('orden', { ascending: true })
    setEtapas(data || [])
  }

  const completadas = etapas.filter(e => e.estado === 'completado').length
  const progreso = etapas.length > 0 ? Math.round((completadas / etapas.length) * 100) : 0
  const estadoColor = { pendiente: '#b2bec3', en_proceso: '#c9a84c', completado: '#00b894', omitido: '#636e72' }
  const estadoIcono = {
    pendiente: <Clock size={16} color="#b2bec3" />,
    en_proceso: <Loader size={16} color="#c9a84c" />,
    completado: <CheckCircle size={16} color="#00b894" />,
    omitido: <XCircle size={16} color="#636e72" />,
  }
  const estadoLabel = { pendiente: 'Pendiente', en_proceso: 'En Proceso', completado: 'Completado', omitido: 'Omitido' }

  return (
    <div style={styles.panel}>
      {etapas.length > 0 && (
        <div style={styles.progresoBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>Progreso de tu caso</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#00b894' }}>{progreso}%</span>
          </div>
          <div style={{ height: '10px', backgroundColor: '#dfe6e9', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progreso}%`, backgroundColor: '#00b894', borderRadius: '5px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#b2bec3', marginTop: '8px' }}>{completadas} de {etapas.length} etapas completadas</p>
        </div>
      )}

      {etapas.length === 0 ? (
        <div style={styles.empty}>
          <TrendingUp size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>Las etapas de tu caso aparecerán aquí</p>
        </div>
      ) : (
        etapas.map((etapa, i) => (
          <div key={etapa.id} style={styles.etapaRow}>
            <div style={{ ...styles.etapaNum, backgroundColor: etapa.estado === 'completado' ? '#00b894' : '#1a1a2e' }}>{i + 1}</div>
            <div style={styles.etapaInfo}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{etapa.nombre}</span>
                <span style={{ ...styles.estadoBadge, backgroundColor: estadoColor[etapa.estado] + '20', color: estadoColor[etapa.estado] }}>
                  {estadoIcono[etapa.estado]} {estadoLabel[etapa.estado]}
                </span>
              </div>
              {etapa.notas && <p style={{ fontSize: '13px', color: '#636e72', marginTop: '4px' }}>{etapa.notas}</p>}
              {etapa.fecha_completado && (
                <p style={{ fontSize: '12px', color: '#00b894', marginTop: '4px' }}>
                  Completado: {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function DocumentosTab({ casoId }) {
  const [documentos, setDocumentos] = useState([])

  useEffect(() => { fetchDocumentos() }, [casoId])

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', casoId)
      .eq('visible_cliente', true)
    setDocumentos(data || [])
  }

  const descargar = async (doc) => {
    const { data } = await supabase.storage.from('documentos').download(doc.url)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nombre
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div style={styles.panel}>
      {documentos.length === 0 ? (
        <div style={styles.empty}>
          <FileText size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay documentos disponibles aún</p>
        </div>
      ) : (
        documentos.map(doc => (
          <div key={doc.id} style={styles.docRow}>
            <span style={{ fontSize: '14px', color: '#2d3436' }}>{doc.nombre}</span>
            <button style={styles.btnDescargar} onClick={() => descargar(doc)}>
              <Download size={14} /> Descargar
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function AudienciasCliente({ casoId }) {
  const [audiencias, setAudiencias] = useState([])

  useEffect(() => { fetchAudiencias() }, [casoId])

  const fetchAudiencias = async () => {
    const { data } = await supabase
      .from('audiencias')
      .select('*')
      .eq('case_id', casoId)
      .order('fecha_hora', { ascending: true })
    setAudiencias(data || [])
  }

  return (
    <div style={styles.panel}>
      {audiencias.length === 0 ? (
        <div style={styles.empty}>
          <Calendar size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay audiencias programadas</p>
        </div>
      ) : (
        audiencias.map(a => {
          const fecha = a.fecha_hora ? new Date(a.fecha_hora) : null
          return (
            <div key={a.id} style={styles.docRow}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>{a.titulo}</p>
                <p style={{ fontSize: '13px', color: '#636e72', margin: '4px 0 0' }}>
                  {fecha
                    ? fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Sin fecha'}
                  {a.lugar ? ` · ${a.lugar}` : ''}
                </p>
              </div>
              <span style={{
                ...styles.badge,
                backgroundColor: '#0984e320',
                color: '#0984e3',
                textTransform: 'capitalize',
              }}>
                {a.estado || 'programada'}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

function MensajesTab({ casoId, session }) {
  const [mensajes, setMensajes] = useState([])
  const [nuevo, setNuevo] = useState('')

  useEffect(() => { fetchMensajes() }, [casoId])

  const fetchMensajes = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('case_id', casoId)
      .order('creado_en', { ascending: true })
    setMensajes(data || [])
  }

  const enviar = async () => {
    if (!nuevo.trim()) return
    await supabase.from('messages').insert([{
      case_id: casoId,
      remitente_id: session.user.id,
      contenido: nuevo,
    }])
    setNuevo('')
    fetchMensajes()
  }

  return (
    <div style={{ ...styles.panel, display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {mensajes.length === 0 ? (
          <div style={styles.empty}>
            <MessageSquare size={40} color="#dfe6e9" />
            <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay mensajes aún</p>
          </div>
        ) : (
          mensajes.map(m => {
            const esMio = m.remitente_id === session.user.id
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: esMio ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  backgroundColor: esMio ? '#1a1a2e' : '#f0f2f5',
                  padding: '10px 14px',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '14px', color: esMio ? '#c9a84c' : '#2d3436', marginBottom: '4px' }}>{m.contenido}</p>
                <span style={{ fontSize: '11px', color: esMio ? '#a0aec0' : '#b2bec3' }}>
                  {new Date(m.creado_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
        />
        <button style={styles.btnEnviar} onClick={enviar}><Send size={18} /></button>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' },
  sidebar: {
    backgroundColor: '#1a1a2e', display: 'flex', flexDirection: 'column',
    transition: 'width 0.3s ease', position: 'fixed', height: '100vh', zIndex: 100, overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '88px',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  logoText: { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 },
  logoSub: {
    color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '600',
    letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2, maxWidth: '140px',
  },
  menuBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', cursor: 'pointer', color: '#a0aec0', padding: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nav: { flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
    borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
  },
  navLabel: { fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  logoutWrap: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '12px 14px', border: '1px solid rgba(214,48,49,0.35)',
    borderRadius: '10px', background: 'rgba(214,48,49,0.12)', cursor: 'pointer',
  },
  logoutLabel: { fontSize: '14px', fontWeight: '600', color: '#fab1a0', whiteSpace: 'nowrap' },
  main: { flex: 1, transition: 'margin 0.3s ease' },
  topbar: {
    background: 'linear-gradient(180deg, #22223a 0%, #1a1a2e 100%)',
    padding: '22px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 4px 16px rgba(26,26,46,0.25)', borderBottom: '1px solid rgba(201,168,76,0.15)',
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
    width: '48px', height: '3px', backgroundColor: '#c9a84c', borderRadius: '2px', marginTop: '10px',
  },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' },
  avatar: {
    width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(201,168,76,0.12)',
    color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '700', fontSize: '18px', border: '2px solid #c9a84c',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)', flexShrink: 0,
  },
  userName: { fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 },
  userEmail: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '3px 0 0' },
  userRol: {
    fontSize: '11px', fontWeight: '700', color: '#c9a84c', textTransform: 'capitalize',
    margin: '4px 0 0', letterSpacing: '0.04em',
  },
  content: { padding: '32px' },
  estadoCard: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '40px 32px', textAlign: 'center',
    border: '1px solid #eef0f3', boxShadow: '0 2px 10px rgba(26,26,46,0.06)', maxWidth: '560px', margin: '0 auto',
  },
  estadoIcon: {
    width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'rgba(201,168,76,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
  },
  estadoTitulo: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 10px' },
  estadoTexto: { fontSize: '14px', color: '#636e72', margin: '0 auto', maxWidth: '440px', lineHeight: 1.5 },
  estadoEmail: { fontSize: '13px', color: '#b2bec3', margin: '16px 0 0' },
  welcomeCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 100%)',
    borderRadius: '14px', padding: '28px 32px', marginBottom: '20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px',
  },
  welcomeEyebrow: { fontSize: '12px', color: '#c9a84c', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 },
  welcomeTitle: { fontSize: '22px', fontWeight: '700', color: '#fff', margin: '8px 0' },
  welcomeText: { fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '0 0 16px', maxWidth: '480px', lineHeight: 1.5 },
  btnPrimario: {
    backgroundColor: '#c9a84c', color: '#1a1a2e', border: 'none', padding: '10px 18px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  statCard: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '20px',
    border: '1px solid #eef0f3', boxShadow: '0 2px 10px rgba(26,26,46,0.06)',
  },
  statLabel: { fontSize: '12px', color: '#8b949e', fontWeight: '600', textTransform: 'uppercase', margin: 0 },
  statValueSmall: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: '8px 0 0' },
  casoCard: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '24px', marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.06)', border: '1px solid #eef0f3',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px',
  },
  casoTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', display: 'inline-block' },
  radicado: { fontSize: '12px', color: '#b2bec3' },
  casoTitulo: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' },
  casoDesc: { fontSize: '14px', color: '#636e72', margin: 0 },
  casoMeta: { display: 'flex', gap: '20px', flexShrink: 0 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaLabel: { fontSize: '11px', color: '#b2bec3', textTransform: 'uppercase' },
  metaValor: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  panel: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '24px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.06)', border: '1px solid #eef0f3',
  },
  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' },
  etapaRow: { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' },
  etapaNum: {
    width: '28px', height: '28px', borderRadius: '50%', color: '#c9a84c',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700', flexShrink: 0,
  },
  etapaInfo: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 14px' },
  estadoBadge: {
    display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
    borderRadius: '20px', fontSize: '12px', fontWeight: '600',
  },
  docRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px', gap: '12px',
  },
  btnDescargar: {
    display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0984e320',
    color: '#0984e3', border: 'none', padding: '6px 14px', borderRadius: '6px',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
  },
  input: {
    flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9',
    fontSize: '14px', outline: 'none',
  },
  btnEnviar: {
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none',
    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
  },
}
