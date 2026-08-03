import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Plus, Search, Briefcase, X } from 'lucide-react'
import DetalleCaso from './DetalleCaso'

export default function Casos({ session, userProfile, casoInicialId = null, onLimpiarCasoInicial }) {
  const [casos, setCasos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [casoSeleccionado, setCasoSeleccionado] = useState(casoInicialId || null)
  const [procesosTypes, setProcesosTypes] = useState([])
  const [juzgados, setJuzgados] = useState([])
  const [nuevoJuzgadoNombre, setNuevoJuzgadoNombre] = useState('')
  const [creandoJuzgado, setCreandoJuzgado] = useState(false)
  const [nuevo, setNuevo] = useState({
    titulo: '', descripcion: '', numero_radicado: '',
    ciudad: '', status: 'activo', client_id: '', juzgado_id: ''
  })

  useEffect(() => {
    fetchCasos()
    fetchProcesosTypes()
    fetchClientes()
    fetchJuzgados()
  }, [])

  useEffect(() => {
    if (casoInicialId) {
      setCasoSeleccionado(casoInicialId)
      onLimpiarCasoInicial?.()
    }
  }, [casoInicialId])

  const fetchCasos = async () => {
    let query = supabase
      .from('cases')
      .select('*, clients(nombre, apellido), juzgados(nombre, ciudad)')
      .order('creado_en', { ascending: false })

    if (userProfile?.id && !['admin', 'superadmin'].includes(userProfile?.rol)) {
      query = query.eq('abogado_id', userProfile.id)
    }

    let { data, error } = await query

    if (error) {
      console.log('fetchCasos con juzgados:', error.message)
      let fallback = supabase
        .from('cases')
        .select('*, clients(nombre, apellido)')
        .order('creado_en', { ascending: false })
      if (userProfile?.id && !['admin', 'superadmin'].includes(userProfile?.rol)) {
        fallback = fallback.eq('abogado_id', userProfile.id)
      }
      const res = await fallback
      data = res.data
    }

    setCasos(data || [])
    setLoading(false)
  }

  const fetchProcesosTypes = async () => {
  const { data } = await supabase
    .from('process_types')
    .select('*')
    .order('modulo')
  setProcesosTypes(data || [])
  }

  const fetchClientes = async () => {
    let query = supabase.from('clients').select('id, nombre, apellido')
    if (userProfile?.id && !['admin', 'superadmin'].includes(userProfile?.rol)) {
      query = query.eq('abogado_id', userProfile.id)
    }
    const { data } = await query
    setClientes(data || [])
  }

  const fetchJuzgados = async () => {
    const { data } = await supabase.from('juzgados').select('id, nombre, ciudad').order('nombre')
    setJuzgados(data || [])
  }

  const crearJuzgadoRapido = async () => {
    if (!nuevoJuzgadoNombre.trim()) return
    setCreandoJuzgado(true)
    const { data, error } = await supabase
      .from('juzgados')
      .insert([{ nombre: nuevoJuzgadoNombre.trim(), ciudad: nuevo.ciudad || null }])
      .select()
      .single()
    setCreandoJuzgado(false)
    if (error) {
      alert('Error al crear juzgado: ' + error.message)
      return
    }
    await fetchJuzgados()
    setNuevo({ ...nuevo, juzgado_id: data.id })
    setNuevoJuzgadoNombre('')
  }

  const crearCaso = async () => {
  if (!nuevo.titulo) return
  const datos = { ...nuevo }
  if (!datos.client_id) delete datos.client_id
  if (!datos.process_type_id) delete datos.process_type_id
  if (!datos.juzgado_id) delete datos.juzgado_id
  if (userProfile?.id) datos.abogado_id = userProfile.id

  // Crear el caso
  const { data: casoCreado, error } = await supabase
    .from('cases')
    .insert([datos])
    .select()
    .single()

  if (error) {
    console.log('error:', error)
    alert('No se pudo crear el caso: ' + error.message)
    return
  }

  // Si tiene tipo de proceso, cargar etapas automáticamente
  if (nuevo.process_type_id && casoCreado) {
    // Buscar la plantilla del proceso
    const { data: template } = await supabase
      .from('process_templates')
      .select('id')
      .eq('process_type_id', nuevo.process_type_id)
      .single()

    if (template) {
      // Cargar etapas de la plantilla
      const { data: etapas } = await supabase
        .from('template_stages')
        .select('*')
        .eq('template_id', template.id)
        .order('orden')

      if (etapas && etapas.length > 0) {
        const etapasACrgar = etapas.map(e => ({
          case_id: casoCreado.id,
          template_stage_id: e.id,
          nombre: e.nombre,
          notas: e.descripcion,
          orden: e.orden,
          estado: 'pendiente'
        }))
        await supabase.from('case_stages').insert(etapasACrgar)
      }
    }
  }

  setModalOpen(false)
  setNuevo({ titulo: '', descripcion: '', numero_radicado: '', ciudad: '', status: 'activo', client_id: '', process_type_id: '', juzgado_id: '' })
  setNuevoJuzgadoNombre('')
  fetchCasos()

}

  const casosFiltrados = casos.filter(c =>
    c.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.clients?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const statusColor = {
    activo: '#0984e3',
    en_proceso: '#c9a84c',
    audiencia: '#6c5ce7',
    cerrado: '#636e72',
    ganado: '#00b894',
    perdido: '#d63031'
  }

  if (casoSeleccionado) return <DetalleCaso casoId={casoSeleccionado} userProfile={userProfile} onBack={() => setCasoSeleccionado(null)} />

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.searchBox}>
          <Search size={18} color="#8b949e" />
          <input
            style={styles.searchInput}
            placeholder="Buscar caso o cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button style={styles.btnNuevo} onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nuevo caso
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#b2bec3' }}>Cargando...</p>
      ) : casosFiltrados.length === 0 ? (
        <div style={styles.empty}>
          <Briefcase size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay casos</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {casosFiltrados.map(caso => {
            const color = statusColor[caso.status] || '#636e72'
            return (
              <div
                key={caso.id}
                style={{ ...styles.card, borderTop: `3px solid ${color}`, cursor: 'pointer' }}
                onClick={() => setCasoSeleccionado(caso.id)}
              >
                <div style={styles.cardHeader}>
                  <span style={{ ...styles.badge, backgroundColor: color + '18', color }}>
                    {caso.status.replace('_', ' ')}
                  </span>
                  {caso.numero_radicado && (
                    <span style={styles.radicado}>{caso.numero_radicado}</span>
                  )}
                </div>
                <h3 style={styles.cardTitle}>{caso.titulo}</h3>
                {caso.descripcion && (
                  <p style={styles.cardDesc}>{caso.descripcion}</p>
                )}
                <div style={styles.cardFooter}>
                  <span style={styles.tag}>
                    {caso.clients ? `${caso.clients.nombre} ${caso.clients.apellido || ''}` : 'Sin cliente'}
                  </span>
                  {(caso.juzgados?.nombre || caso.ciudad) && (
                    <span style={styles.ciudad}>{caso.juzgados?.nombre || caso.ciudad}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Nuevo Caso</h3>
              <button style={styles.closeBtn} onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <input style={styles.input} placeholder="Título del caso *" value={nuevo.titulo} onChange={e => setNuevo({ ...nuevo, titulo: e.target.value })} />
              <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Descripción" value={nuevo.descripcion} onChange={e => setNuevo({ ...nuevo, descripcion: e.target.value })} />
              <select style={styles.input} value={nuevo.client_id} onChange={e => setNuevo({ ...nuevo, client_id: e.target.value })}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                ))}
              </select>
              <input style={styles.input} placeholder="Número de radicado" value={nuevo.numero_radicado} onChange={e => setNuevo({ ...nuevo, numero_radicado: e.target.value })} />
              <input style={styles.input} placeholder="Ciudad" value={nuevo.ciudad} onChange={e => setNuevo({ ...nuevo, ciudad: e.target.value })} />
              <select style={styles.input} value={nuevo.juzgado_id || ''} onChange={e => setNuevo({ ...nuevo, juzgado_id: e.target.value })}>
                <option value="">Seleccionar juzgado</option>
                {juzgados.map(j => (
                  <option key={j.id} value={j.id}>{j.nombre}{j.ciudad ? ` (${j.ciudad})` : ''}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={styles.input}
                  placeholder="O crear juzgado nuevo..."
                  value={nuevoJuzgadoNombre}
                  onChange={e => setNuevoJuzgadoNombre(e.target.value)}
                />
                <button
                  type="button"
                  style={styles.btnCrearJuzgado}
                  onClick={crearJuzgadoRapido}
                  disabled={creandoJuzgado || !nuevoJuzgadoNombre.trim()}
                >
                  {creandoJuzgado ? '...' : 'Crear'}
                </button>
              </div>

              <select
                style={styles.input}
                value={nuevo.process_type_id || ''}
                onChange={e => setNuevo({ ...nuevo, process_type_id: e.target.value })}
              >
                <option value="">Seleccionar tipo de proceso</option>
                {Object.entries(
                  procesosTypes.reduce((acc, p) => {
                    if (!acc[p.modulo]) acc[p.modulo] = []
                    acc[p.modulo].push(p)
                    return acc
                  }, {})
                ).map(([modulo, procesos]) => (
                  <optgroup key={modulo} label={`${modulo}\u00A0\u00A0\u00A0`}>
                    {procesos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select style={styles.input} value={nuevo.status} onChange={e => setNuevo({ ...nuevo, status: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="en_proceso">En proceso</option>
                <option value="audiencia">Audiencia</option>
                <option value="cerrado">Cerrado</option>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>
              <button style={styles.btnGuardar} onClick={crearCaso}>Guardar Caso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#fff',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #eef0f3',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    flex: 1,
    minWidth: '220px',
    maxWidth: '420px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    color: '#1a1a2e',
    background: 'transparent',
  },
  btnNuevo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1a1a2e',
    color: '#c9a84c',
    border: '1px solid rgba(201,168,76,0.35)',
    padding: '12px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(26,26,46,0.18)',
    whiteSpace: 'nowrap',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '14px',
    border: '1px solid #eef0f3',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.06)',
    border: '1px solid #eef0f3',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '180px',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    gap: '8px',
  },
  badge: {
    padding: '5px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  radicado: {
    fontSize: '11px',
    color: '#8b949e',
    fontWeight: '600',
    letterSpacing: '0.02em',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 8px',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: '13px',
    color: '#636e72',
    margin: '0 0 16px',
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '14px',
    borderTop: '1px solid #f0f2f5',
  },
  tag: {
    fontSize: '12px',
    backgroundColor: '#f5f6fa',
    padding: '5px 10px',
    borderRadius: '20px',
    color: '#636e72',
    fontWeight: '600',
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ciudad: {
    fontSize: '12px',
    color: '#8b949e',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '40%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnCrearJuzgado: { backgroundColor: '#c9a84c', color: '#1a1a2e', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }
}