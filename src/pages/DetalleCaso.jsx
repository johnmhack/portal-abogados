import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ArrowLeft, FileText, MessageSquare, Calendar, Plus, X, TrendingUp, CheckSquare } from 'lucide-react'
import InformeCliente from './InformeCliente'

export default function DetalleCaso({ casoId, onBack }) {
  const [caso, setCaso] = useState(null)
  const [tab, setTab] = useState('eventos')
  const [mostrarInforme, setMostrarInforme] = useState(false)

  useEffect(() => { fetchCaso() }, [casoId])

  const fetchCaso = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido, correo, telefono)')
      .eq('id', casoId)
      .single()
    setCaso(data)
  }

  const statusColor = {
    activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7',
    cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031'
  }

  if (!caso) return <p style={{ color: '#b2bec3' }}>Cargando...</p>

  return (
    <div>
      {/* BACK + INFORME */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> Volver a Casos
        </button>
        <button style={styles.btnInforme} onClick={() => setMostrarInforme(true)}>
          📊 Generar Informe
        </button>
      </div>

      {mostrarInforme && <InformeCliente casoId={casoId} onClose={() => setMostrarInforme(false)} />}

      {/* HEADER CASO */}
      <div style={styles.casoHeader}>
        <div style={{ flex: 1 }}>
          <div style={styles.headerTop}>
            <span style={{ ...styles.badge, backgroundColor: statusColor[caso.status] + '20', color: statusColor[caso.status] }}>
              {caso.status?.replace('_', ' ')}
            </span>
            <span style={styles.radicado}>{caso.numero_radicado}</span>
          </div>
          <h2 style={styles.casoTitulo}>{caso.titulo}</h2>
          <p style={styles.casoDesc}>{caso.descripcion}</p>
        </div>
        <div style={styles.casoMeta}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Cliente</span>
            <span style={styles.metaValue}>{caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : '—'}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Ciudad</span>
            <span style={styles.metaValue}>{caso.ciudad || '—'}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Fecha apertura</span>
            <span style={styles.metaValue}>{new Date(caso.fecha_apertura).toLocaleDateString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        {[
          { id: 'eventos', label: 'Actuaciones', icon: MessageSquare },
          { id: 'etapas', label: 'Proceso', icon: TrendingUp },
          { id: 'tareas', label: 'Tareas', icon: CheckSquare },
          { id: 'documentos', label: 'Documentos', icon: FileText },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} style={{ ...styles.tab, borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent', color: tab === t.id ? '#1a1a2e' : '#b2bec3' }} onClick={() => setTab(t.id)}>
              <Icon size={16} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* CONTENIDO */}
      {tab === 'eventos' && <EventosTab casoId={casoId} />}
      {tab === 'etapas' && <EtapasTab casoId={casoId} />}
      {tab === 'tareas' && <TareasTab casoId={casoId} />}
      {tab === 'documentos' && <DocumentosTab casoId={casoId} />}
    </div>
  )
}

// ── EVENTOS ──
function EventosTab({ casoId }) {
  const [eventos, setEventos] = useState([])
  const [nuevo, setNuevo] = useState('')
  const [tipo, setTipo] = useState('actuacion')

  useEffect(() => { fetchEventos() }, [casoId])

  const fetchEventos = async () => {
    const { data } = await supabase.from('events').select('*').eq('case_id', casoId).order('creado_en', { ascending: false })
    setEventos(data || [])
  }

  const agregar = async () => {
    if (!nuevo.trim()) return
    await supabase.from('events').insert([{ case_id: casoId, descripcion: nuevo, tipo }])
    setNuevo('')
    fetchEventos()
  }

  const tipoColor = { actuacion: '#0984e3', audiencia: '#6c5ce7', notificacion: '#c9a84c', decision: '#00b894', otro: '#636e72' }

  return (
    <div style={styles.tabContent}>
      <div style={styles.inputRow}>
        <select style={{ ...styles.input, maxWidth: '160px' }} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="actuacion">Actuación</option>
          <option value="audiencia">Audiencia</option>
          <option value="notificacion">Notificación</option>
          <option value="decision">Decisión</option>
          <option value="otro">Otro</option>
        </select>
        <textarea style={{ ...styles.textarea, flex: 1 }} placeholder="Describe la actuación..." value={nuevo} onChange={e => setNuevo(e.target.value)} />
        <button style={styles.btnAgregar} onClick={agregar}><Plus size={18} /> Agregar</button>
      </div>
      {eventos.length === 0 ? (
        <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>No hay actuaciones</p>
      ) : (
        eventos.map(e => (
          <div key={e.id} style={styles.eventoCard}>
            <div style={{ ...styles.eventoBadge, backgroundColor: tipoColor[e.tipo] + '20', color: tipoColor[e.tipo] }}>{e.tipo}</div>
            <div style={{ flex: 1 }}>
              <p style={styles.eventoTexto}>{e.descripcion}</p>
              <span style={styles.eventoFecha}>{new Date(e.creado_en).toLocaleDateString('es-CO')}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── ETAPAS ──
function EtapasTab({ casoId }) {
  const [etapas, setEtapas] = useState([])
  const [modalNueva, setModalNueva] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', notas: '' })

  useEffect(() => { fetchEtapas() }, [casoId])

  const fetchEtapas = async () => {
    const { data } = await supabase.from('case_stages').select('*').eq('case_id', casoId).order('orden', { ascending: true })
    setEtapas(data || [])
  }

  const cambiarEstado = async (id, estado) => {
    const update = { estado }
    if (estado === 'completado') update.fecha_completado = new Date().toISOString()
    await supabase.from('case_stages').update(update).eq('id', id)
    fetchEtapas()
  }

  const agregarEtapa = async () => {
    if (!nueva.nombre.trim()) return
    const maxOrden = etapas.length > 0 ? Math.max(...etapas.map(e => e.orden)) : 0
    await supabase.from('case_stages').insert([{ case_id: casoId, nombre: nueva.nombre, notas: nueva.notas, orden: maxOrden + 1, estado: 'pendiente' }])
    setModalNueva(false)
    setNueva({ nombre: '', notas: '' })
    fetchEtapas()
  }

  const completadas = etapas.filter(e => e.estado === 'completado').length
  const progreso = etapas.length > 0 ? Math.round((completadas / etapas.length) * 100) : 0
  const estadoColor = { pendiente: '#b2bec3', en_proceso: '#c9a84c', completado: '#00b894', omitido: '#636e72' }

  return (
    <div style={styles.tabContent}>
      <button style={styles.btnNuevo} onClick={() => setModalNueva(true)}><Plus size={16} /> Agregar etapa</button>

      {etapas.length > 0 && (
        <div style={styles.progresoBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#636e72' }}>Progreso</span>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{progreso}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#dfe6e9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progreso}%`, backgroundColor: '#00b894', borderRadius: '4px' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#b2bec3', marginTop: '6px' }}>{completadas} de {etapas.length} etapas completadas</p>
        </div>
      )}

      {etapas.length === 0 ? (
        <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>No hay etapas</p>
      ) : (
        etapas.map(etapa => (
          <div key={etapa.id} style={styles.etapaCard}>
            <div style={{ ...styles.etapaCirculo, borderColor: estadoColor[etapa.estado] }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: estadoColor[etapa.estado] }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{etapa.nombre}</span>
                <select style={{ ...styles.selectEstado, color: estadoColor[etapa.estado] }} value={etapa.estado} onChange={e => cambiarEstado(etapa.id, e.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="completado">Completado</option>
                  <option value="omitido">Omitido</option>
                </select>
              </div>
              {etapa.notas && <p style={{ fontSize: '13px', color: '#636e72', marginTop: '4px' }}>{etapa.notas}</p>}
              {etapa.fecha_completado && <p style={{ fontSize: '12px', color: '#00b894', marginTop: '4px' }}>✅ {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}</p>}
            </div>
          </div>
        ))
      )}

      {modalNueva && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Nueva Etapa</h3>
              <button style={styles.closeBtn} onClick={() => setModalNueva(false)}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <input style={styles.input} placeholder="Nombre de la etapa *" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} />
              <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Notas (opcional)" value={nueva.notas} onChange={e => setNueva({ ...nueva, notas: e.target.value })} />
              <button style={styles.btnGuardar} onClick={agregarEtapa}>Guardar Etapa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TAREAS ──
function TareasTab({ casoId }) {
  const [tareas, setTareas] = useState([])
  const [nueva, setNueva] = useState('')

  useEffect(() => { fetchTareas() }, [casoId])

  const fetchTareas = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('case_id', casoId).order('creado_en', { ascending: false })
    setTareas(data || [])
  }

  const agregar = async () => {
    if (!nueva.trim()) return
    await supabase.from('tasks').insert([{ case_id: casoId, titulo: nueva }])
    setNueva('')
    fetchTareas()
  }

  const toggleTarea = async (id, completado) => {
    await supabase.from('tasks').update({ completado: !completado, fecha_completado: !completado ? new Date().toISOString() : null }).eq('id', id)
    fetchTareas()
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.inputRow}>
        <input style={{ ...styles.input, flex: 1 }} placeholder="Nueva tarea..." value={nueva} onChange={e => setNueva(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} />
        <button style={styles.btnAgregar} onClick={agregar}><Plus size={18} /> Agregar</button>
      </div>
      {tareas.length === 0 ? (
        <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>No hay tareas</p>
      ) : (
        tareas.map(t => (
          <div key={t.id} style={{ ...styles.tareaCard, opacity: t.completado ? 0.6 : 1 }}>
            <input type="checkbox" checked={t.completado} onChange={() => toggleTarea(t.id, t.completado)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
            <span style={{ fontSize: '14px', color: '#2d3436', textDecoration: t.completado ? 'line-through' : 'none', flex: 1 }}>{t.titulo}</span>
            {t.fecha_completado && <span style={{ fontSize: '12px', color: '#b2bec3' }}>{new Date(t.fecha_completado).toLocaleDateString('es-CO')}</span>}
          </div>
        ))
      )}
    </div>
  )
}

// ── DOCUMENTOS ──
function DocumentosTab({ casoId }) {
  const [documentos, setDocumentos] = useState([])
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => { fetchDocumentos() }, [casoId])

  const fetchDocumentos = async () => {
    const { data } = await supabase.from('documents').select('*').eq('case_id', casoId)
    setDocumentos(data || [])
  }

  const subirArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSubiendo(true)
    const path = `${casoId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file)
    if (!uploadError) {
      await supabase.from('documents').insert([{ case_id: casoId, nombre: file.name, tipo_documento: file.type, url: path }])
      fetchDocumentos()
    }
    setSubiendo(false)
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
      <label style={styles.btnSubir}>
        {subiendo ? 'Subiendo...' : '📎 Subir documento'}
        <input type="file" style={{ display: 'none' }} onChange={subirArchivo} disabled={subiendo} />
      </label>
      {documentos.length === 0 ? (
        <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>No hay documentos</p>
      ) : (
        documentos.map(doc => (
          <div key={doc.id} style={styles.docCard}>
            <span style={{ fontSize: '14px', color: '#2d3436' }}>📄 {doc.nombre}</span>
            <button style={styles.btnDescargar} onClick={() => descargar(doc)}>Descargar</button>
          </div>
        ))
      )}
    </div>
  )
}

const styles = {
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#636e72', fontSize: '14px' },
  btnInforme: { backgroundColor: '#c9a84c', color: '#1a1a2e', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  casoHeader: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' },
  radicado: { fontSize: '12px', color: '#b2bec3' },
  casoTitulo: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' },
  casoDesc: { fontSize: '14px', color: '#636e72' },
  casoMeta: { display: 'flex', gap: '24px', flexShrink: 0 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaLabel: { fontSize: '11px', color: '#b2bec3', textTransform: 'uppercase' },
  metaValue: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  tabs: { display: 'flex', gap: '4px', backgroundColor: '#fff', borderRadius: '12px', padding: '4px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  tabContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  inputRow: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' },
  textarea: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', resize: 'none', height: '60px' },
  btnAgregar: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
  eventoCard: { display: 'flex', gap: '12px', alignItems: 'flex-start', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px', marginBottom: '10px' },
  eventoBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', whiteSpace: 'nowrap' },
  eventoTexto: { fontSize: '14px', color: '#2d3436', marginBottom: '4px' },
  eventoFecha: { fontSize: '12px', color: '#b2bec3' },
  btnNuevo: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginBottom: '16px' },
  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '16px' },
  etapaCard: { display: 'flex', gap: '14px', alignItems: 'flex-start', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px', marginBottom: '10px' },
  etapaCirculo: { width: '28px', height: '28px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' },
  selectEstado: { border: '1px solid #dfe6e9', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', fontWeight: '600' },
  tareaCard: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' },
  btnSubir: { display: 'inline-block', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginBottom: '16px' },
  docCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' },
  btnDescargar: { backgroundColor: '#0984e320', color: '#0984e3', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
}