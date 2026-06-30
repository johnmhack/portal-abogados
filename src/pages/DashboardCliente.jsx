import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { FileText, MessageSquare, TrendingUp, LogOut, CheckCircle, Clock, Loader, XCircle, Download, Send } from 'lucide-react'

export default function DashboardCliente({ session, userProfile }) {
  const [caso, setCaso] = useState(null)
  const [tab, setTab] = useState('proceso')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCaso() }, [])

  const fetchCaso = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido)')
      .eq('client_id', userProfile.id)
      .single()
    setCaso(data)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#b2bec3' }}>Cargando...</p>
    </div>
  )

  if (!caso) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#636e72', fontSize: '16px' }}>No tienes casos asignados aún.</p>
      <button style={styles.btnLogout} onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )

  const statusColor = {
    activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7',
    cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031'
  }

  return (
    <div style={styles.container}>
      {/* TOPBAR */}
      <div style={styles.topbar}>
        <div>
          <h1 style={styles.titulo}>SAR Abogados</h1>
          <p style={styles.subtitulo}>Portal del Cliente</p>
        </div>
        <div style={styles.topRight}>
          <span style={styles.userNombre}>Hola, {userProfile.nombre} 👋</span>
          <button style={styles.btnLogout} onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* CASO HEADER */}
        <div style={styles.casoCard}>
          <div>
            <div style={styles.casoTop}>
              <span style={{ ...styles.badge, backgroundColor: statusColor[caso.status] + '20', color: statusColor[caso.status] }}>
                {caso.status?.replace('_', ' ')}
              </span>
              {caso.numero_radicado && <span style={styles.radicado}>Rad. {caso.numero_radicado}</span>}
            </div>
            <h2 style={styles.casoTitulo}>{caso.titulo}</h2>
            <p style={styles.casoDesc}>{caso.descripcion}</p>
          </div>
          <div style={styles.casoMeta}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Ciudad</span>
              <span style={styles.metaValor}>{caso.ciudad || '—'}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Fecha apertura</span>
              <span style={styles.metaValor}>{new Date(caso.fecha_apertura).toLocaleDateString('es-CO')}</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={styles.tabs}>
          {[
            { id: 'proceso', label: 'Mi Proceso', icon: TrendingUp },
            { id: 'documentos', label: 'Documentos', icon: FileText },
            { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
          ].map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} style={{ ...styles.tab, borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent', color: tab === t.id ? '#1a1a2e' : '#b2bec3' }} onClick={() => setTab(t.id)}>
                <Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'proceso' && <ProcesoTab casoId={caso.id} />}
        {tab === 'documentos' && <DocumentosTab casoId={caso.id} />}
        {tab === 'mensajes' && <MensajesTab casoId={caso.id} session={session} userProfile={userProfile} />}
      </div>
    </div>
  )
}

function ProcesoTab({ casoId }) {
  const [etapas, setEtapas] = useState([])

  useEffect(() => { fetchEtapas() }, [casoId])

  const fetchEtapas = async () => {
    const { data } = await supabase.from('case_stages').select('*').eq('case_id', casoId).order('orden', { ascending: true })
    setEtapas(data || [])
  }

  const completadas = etapas.filter(e => e.estado === 'completado').length
  const progreso = etapas.length > 0 ? Math.round((completadas / etapas.length) * 100) : 0

  const estadoColor = { pendiente: '#b2bec3', en_proceso: '#c9a84c', completado: '#00b894', omitido: '#636e72' }
  const estadoIcono = {
    pendiente: <Clock size={16} color="#b2bec3" />,
    en_proceso: <Loader size={16} color="#c9a84c" />,
    completado: <CheckCircle size={16} color="#00b894" />,
    omitido: <XCircle size={16} color="#636e72" />
  }
  const estadoLabel = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado', omitido: 'Omitido' }

  return (
    <div style={styles.tabContent}>
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
              {etapa.fecha_completado && <p style={{ fontSize: '12px', color: '#00b894', marginTop: '4px' }}>✅ {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}</p>}
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
    const { data } = await supabase.from('documents').select('*').eq('case_id', casoId).eq('visible_cliente', true)
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
    }
  }

  return (
    <div style={styles.tabContent}>
      {documentos.length === 0 ? (
        <div style={styles.empty}>
          <FileText size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay documentos disponibles aún</p>
        </div>
      ) : (
        documentos.map(doc => (
          <div key={doc.id} style={styles.docRow}>
            <span style={{ fontSize: '14px', color: '#2d3436' }}>📄 {doc.nombre}</span>
            <button style={styles.btnDescargar} onClick={() => descargar(doc)}>
              <Download size={14} /> Descargar
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function MensajesTab({ casoId, session, userProfile }) {
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
      contenido: nuevo
    }])
    setNuevo('')
    fetchMensajes()
  }

  return (
    <div style={{ ...styles.tabContent, display: 'flex', flexDirection: 'column', height: '400px' }}>
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
              <div key={m.id} style={{ alignSelf: esMio ? 'flex-end' : 'flex-start', maxWidth: '70%', backgroundColor: esMio ? '#1a1a2e' : '#f0f2f5', padding: '10px 14px', borderRadius: '12px' }}>
                <p style={{ fontSize: '14px', color: esMio ? '#c9a84c' : '#2d3436', marginBottom: '4px' }}>{m.contenido}</p>
                <span style={{ fontSize: '11px', color: esMio ? '#a0aec0' : '#b2bec3' }}>{new Date(m.creado_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )
          })
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <input style={styles.input} placeholder="Escribe un mensaje..." value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} />
        <button style={styles.btnEnviar} onClick={enviar}><Send size={18} /></button>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f6fa' },
  topbar: { backgroundColor: '#1a1a2e', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontSize: '20px', fontWeight: '700', color: '#c9a84c' },
  subtitulo: { fontSize: '12px', color: '#a0aec0', marginTop: '2px' },
  topRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  userNombre: { fontSize: '14px', color: '#a0aec0' },
  btnLogout: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#a0aec0', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  content: { padding: '32px', maxWidth: '800px', margin: '0 auto' },
  casoCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' },
  casoTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' },
  radicado: { fontSize: '12px', color: '#b2bec3' },
  casoTitulo: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' },
  casoDesc: { fontSize: '14px', color: '#636e72' },
  casoMeta: { display: 'flex', gap: '20px', flexShrink: 0 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaLabel: { fontSize: '11px', color: '#b2bec3', textTransform: 'uppercase' },
  metaValor: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  tabs: { display: 'flex', gap: '4px', backgroundColor: '#fff', borderRadius: '12px', padding: '4px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  tabContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' },
  etapaRow: { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' },
  etapaNum: { width: '28px', height: '28px', borderRadius: '50%', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  etapaInfo: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 14px' },
  estadoBadge: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' },
  btnDescargar: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0984e320', color: '#0984e3', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  input: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none' },
  btnEnviar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
}