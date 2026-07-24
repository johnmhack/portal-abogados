import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Search, Calendar, Plus, X, Pencil, Trash2 } from 'lucide-react'

const ESTADOS = {
  programada: { label: 'Programada', color: '#0984e3' },
  realizada: { label: 'Realizada', color: '#00b894' },
  aplazada: { label: 'Aplazada', color: '#c9a84c' },
  cancelada: { label: 'Cancelada', color: '#d63031' },
}

const formVacio = {
  case_id: '',
  titulo: '',
  descripcion: '',
  fecha_hora: '',
  lugar: '',
  juzgado: '',
  tipo: 'presencial',
  estado: 'programada',
  notas: '',
}

export default function Audiencias() {
  const [audiencias, setAudiencias] = useState([])
  const [casos, setCasos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCaso, setFiltroCaso] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [eliminarId, setEliminarId] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    fetchAudiencias()
    fetchCasos()
  }, [])

  const fetchAudiencias = async () => {
    const { data } = await supabase
      .from('audiencias')
      .select('*, cases(titulo, clients(nombre, apellido))')
      .order('fecha_hora', { ascending: true })
    setAudiencias(data || [])
    setLoading(false)
  }

  const fetchCasos = async () => {
    const { data } = await supabase.from('cases').select('id, titulo').order('titulo')
    setCasos(data || [])
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setEliminarId(null)
    setModalOpen(true)
  }

  const abrirEditar = (a) => {
    setEditando(a)
    setForm({
      case_id: a.case_id || '',
      titulo: a.titulo || '',
      descripcion: a.descripcion || '',
      fecha_hora: a.fecha_hora ? a.fecha_hora.slice(0, 16) : '',
      lugar: a.lugar || '',
      juzgado: a.juzgado || '',
      tipo: a.tipo || 'presencial',
      estado: a.estado || 'programada',
      notas: a.notas || '',
    })
    setEliminarId(null)
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEditando(null)
    setForm(formVacio)
    setEliminarId(null)
  }

  const guardar = async () => {
    if (!form.titulo.trim() || !form.case_id || !form.fecha_hora) return
    setGuardando(true)
    const payload = {
      case_id: form.case_id,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion || null,
      fecha_hora: new Date(form.fecha_hora).toISOString(),
      lugar: form.lugar || null,
      juzgado: form.juzgado || null,
      tipo: form.tipo,
      estado: form.estado,
      notas: form.notas || null,
      actualizado_en: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from('audiencias').update(payload).eq('id', editando.id)
      : await supabase.from('audiencias').insert([payload])
    setGuardando(false)
    if (error) {
      alert('Error al guardar: ' + error.message)
      return
    }
    cerrarModal()
    fetchAudiencias()
  }

  const eliminar = async () => {
    if (!eliminarId) return
    setEliminando(true)
    const { error } = await supabase.from('audiencias').delete().eq('id', eliminarId)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar.')
      return
    }
    setEliminarId(null)
    cerrarModal()
    fetchAudiencias()
  }

  const filtradas = audiencias.filter(a => {
    const texto = `${a.titulo} ${a.descripcion || ''} ${a.lugar || ''} ${a.juzgado || ''} ${a.cases?.titulo || ''}`.toLowerCase()
    const matchBusqueda = texto.includes(busqueda.toLowerCase())
    const matchCaso = filtroCaso ? a.case_id === filtroCaso : true
    const matchEstado = filtroEstado ? a.estado === filtroEstado : true
    return matchBusqueda && matchCaso && matchEstado
  })

  const ahora = new Date()
  const proximas = filtradas.filter(a => new Date(a.fecha_hora) >= ahora && a.estado !== 'cancelada' && a.estado !== 'realizada')
  const pasadas = filtradas.filter(a => new Date(a.fecha_hora) < ahora || a.estado === 'realizada' || a.estado === 'cancelada')

  const AudienciaCard = ({ a }) => {
    const estado = ESTADOS[a.estado] || ESTADOS.programada
    const fecha = new Date(a.fecha_hora)
    const cliente = a.cases?.clients
      ? `${a.cases.clients.nombre} ${a.cases.clients.apellido || ''}`.trim()
      : null
    return (
      <div style={styles.card}>
        <div style={{ ...styles.fechaBox, backgroundColor: '#1a1a2e' }}>
          <span style={styles.dia}>{fecha.getDate()}</span>
          <span style={styles.mes}>{fecha.toLocaleString('es-CO', { month: 'short' })}</span>
          <span style={styles.hora}>{fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style={styles.cardInfo}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={styles.casoTag}>{a.cases?.titulo || '—'}</span>
            {cliente && <span style={styles.casoTag}>{cliente}</span>}
          </div>
          <p style={styles.titulo}>{a.titulo}</p>
          {(a.lugar || a.juzgado) && (
            <p style={styles.meta}>{[a.juzgado, a.lugar].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div style={styles.cardActions}>
          <span style={{ ...styles.badge, backgroundColor: estado.color + '20', color: estado.color }}>
            {estado.label}
          </span>
          <button style={styles.btnIcon} onClick={() => abrirEditar(a)} title="Editar">
            <Pencil size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.filtros}>
        <div style={styles.searchBox}>
          <Search size={16} color="#b2bec3" />
          <input style={styles.searchInput} placeholder="Buscar audiencia..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select style={styles.select} value={filtroCaso} onChange={e => setFiltroCaso(e.target.value)}>
          <option value="">Todos los casos</option>
          {casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
        <select style={styles.select} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button style={styles.btnNuevo} onClick={abrirNuevo}>
          <Plus size={18} /> Nueva
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statPill}>
          <Calendar size={14} color="#0984e3" />
          <span>{proximas.length} próximas</span>
        </div>
        <div style={styles.statPill}>
          <Calendar size={14} color="#636e72" />
          <span>{pasadas.length} pasadas / cerradas</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#b2bec3' }}>Cargando...</p>
      ) : filtradas.length === 0 ? (
        <div style={styles.empty}>
          <Calendar size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay audiencias</p>
        </div>
      ) : (
        <>
          {proximas.length > 0 && (
            <>
              <h3 style={styles.seccion}>Próximas</h3>
              {proximas.map(a => <AudienciaCard key={a.id} a={a} />)}
            </>
          )}
          {pasadas.length > 0 && (
            <>
              <h3 style={{ ...styles.seccion, marginTop: '24px' }}>Pasadas / cerradas</h3>
              {pasadas.map(a => <AudienciaCard key={a.id} a={a} />)}
            </>
          )}
        </>
      )}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>{editando ? 'Editar audiencia' : 'Nueva audiencia'}</h3>
              <button style={styles.closeBtn} onClick={cerrarModal}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <select style={styles.input} value={form.case_id} onChange={e => setForm({ ...form, case_id: e.target.value })}>
                <option value="">Seleccionar caso *</option>
                {casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
              </select>
              <input style={styles.input} placeholder="Título *" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
              <input
                style={styles.input}
                type="datetime-local"
                value={form.fecha_hora}
                onChange={e => setForm({ ...form, fecha_hora: e.target.value })}
              />
              <textarea
                style={{ ...styles.input, height: '70px', resize: 'none' }}
                placeholder="Descripción"
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
              />
              <input style={styles.input} placeholder="Juzgado" value={form.juzgado} onChange={e => setForm({ ...form, juzgado: e.target.value })} />
              <input style={styles.input} placeholder="Lugar / link" value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select style={styles.input} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="telefonica">Telefónica</option>
                </select>
                <select style={styles.input} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                style={{ ...styles.input, height: '70px', resize: 'none' }}
                placeholder="Notas"
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
              />
              <button style={styles.btnGuardar} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>

              {editando && (
                eliminarId !== editando.id ? (
                  <button style={styles.btnEliminar} onClick={() => setEliminarId(editando.id)}>
                    <Trash2 size={14} /> Eliminar audiencia
                  </button>
                ) : (
                  <div style={styles.confirmBox}>
                    <p style={styles.confirmText}>¿Eliminar esta audiencia? No se puede deshacer.</p>
                    <div style={styles.confirmActions}>
                      <button style={styles.btnCancelar} onClick={() => setEliminarId(null)} disabled={eliminando}>Cancelar</button>
                      <button style={styles.btnConfirmarEliminar} onClick={eliminar} disabled={eliminando}>
                        {eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  filtros: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: '180px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' },
  btnNuevo: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  statPill: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#636e72', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  seccion: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '12px' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' },
  fechaBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#c9a84c', borderRadius: '10px', padding: '10px 14px', minWidth: '70px' },
  dia: { fontSize: '22px', fontWeight: '700' },
  mes: { fontSize: '11px', textTransform: 'uppercase' },
  hora: { fontSize: '11px', marginTop: '4px', color: '#fff' },
  cardInfo: { flex: 1 },
  casoTag: { fontSize: '12px', backgroundColor: '#f0f2f5', padding: '3px 10px', borderRadius: '20px', color: '#636e72', display: 'inline-block' },
  titulo: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e', margin: 0 },
  meta: { fontSize: '12px', color: '#b2bec3', marginTop: '4px' },
  cardActions: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  btnIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #dfe6e9', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#636e72' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  btnEliminar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#fff', color: '#d63031', border: '1px solid #d63031', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  confirmBox: { backgroundColor: '#fff5f5', border: '1px solid #fab1a0', borderRadius: '8px', padding: '14px' },
  confirmText: { fontSize: '13px', color: '#636e72', marginBottom: '12px', lineHeight: 1.4 },
  confirmActions: { display: 'flex', gap: '8px' },
  btnCancelar: { flex: 1, backgroundColor: '#fff', color: '#636e72', border: '1px solid #dfe6e9', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnConfirmarEliminar: { flex: 1, backgroundColor: '#d63031', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
}
