import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Plus, Search, Landmark, X, Pencil } from 'lucide-react'

const formVacio = { nombre: '', ciudad: '', especialidad: '', direccion: '', telefono: '' }

export default function Juzgados() {
  const [juzgados, setJuzgados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchJuzgados() }, [])

  const fetchJuzgados = async () => {
    const { data } = await supabase.from('juzgados').select('*').order('nombre')
    setJuzgados(data || [])
    setLoading(false)
  }

  const abrirNuevo = () => {
    setEditando(null)
    setForm(formVacio)
    setConfirmarEliminar(false)
    setModalOpen(true)
  }

  const abrirEditar = (j) => {
    setEditando(j)
    setForm({
      nombre: j.nombre || '',
      ciudad: j.ciudad || '',
      especialidad: j.especialidad || '',
      direccion: j.direccion || '',
      telefono: j.telefono || '',
    })
    setConfirmarEliminar(false)
    setModalOpen(true)
  }

  const cerrar = () => {
    setModalOpen(false)
    setEditando(null)
    setForm(formVacio)
    setConfirmarEliminar(false)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(),
      ciudad: form.ciudad || null,
      especialidad: form.especialidad || null,
      direccion: form.direccion || null,
      telefono: form.telefono || null,
    }
    const { error } = editando
      ? await supabase.from('juzgados').update(payload).eq('id', editando.id)
      : await supabase.from('juzgados').insert([payload])
    setGuardando(false)
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    cerrar()
    fetchJuzgados()
  }

  const eliminar = async () => {
    if (!editando) return
    setEliminando(true)
    const { error } = await supabase.from('juzgados').delete().eq('id', editando.id)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar. Puede estar asociado a casos.')
      return
    }
    cerrar()
    fetchJuzgados()
  }

  const filtrados = juzgados.filter(j =>
    `${j.nombre} ${j.ciudad || ''} ${j.especialidad || ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.searchBox}>
          <Search size={16} color="#b2bec3" />
          <input style={styles.searchInput} placeholder="Buscar juzgado..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button style={styles.btnNuevo} onClick={abrirNuevo}>
          <Plus size={18} /> Nuevo Juzgado
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#b2bec3' }}>Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div style={styles.empty}>
          <Landmark size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay juzgados. Crea el primero al registrar un caso o aquí.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtrados.map(j => (
            <div key={j.id} style={styles.card}>
              <div style={styles.iconBox}><Landmark size={18} color="#c9a84c" /></div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.nombre}>{j.nombre}</h3>
                <p style={styles.meta}>
                  {[j.ciudad, j.especialidad].filter(Boolean).join(' · ') || 'Sin ciudad / especialidad'}
                </p>
                {j.direccion && <p style={styles.sub}>{j.direccion}</p>}
              </div>
              <button style={styles.btnEditar} onClick={() => abrirEditar(j)}><Pencil size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>{editando ? 'Editar juzgado' : 'Nuevo juzgado'}</h3>
              <button style={styles.closeBtn} onClick={cerrar}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <input style={styles.input} placeholder="Nombre del juzgado *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              <input style={styles.input} placeholder="Ciudad" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} />
              <input style={styles.input} placeholder="Especialidad (civil, laboral, penal...)" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value })} />
              <input style={styles.input} placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              <input style={styles.input} placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              <button style={styles.btnGuardar} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              {editando && (
                !confirmarEliminar ? (
                  <button style={styles.btnEliminar} onClick={() => setConfirmarEliminar(true)}>Eliminar juzgado</button>
                ) : (
                  <div style={styles.confirmBox}>
                    <p style={styles.confirmText}>¿Eliminar <strong>{editando.nombre}</strong>?</p>
                    <div style={styles.confirmActions}>
                      <button style={styles.btnCancelar} onClick={() => setConfirmarEliminar(false)} disabled={eliminando}>Cancelar</button>
                      <button style={styles.btnConfirmar} onClick={eliminar} disabled={eliminando}>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: '300px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  btnNuevo: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' },
  grid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '14px' },
  iconBox: { width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nombre: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e', margin: 0 },
  meta: { fontSize: '13px', color: '#636e72', margin: '2px 0 0' },
  sub: { fontSize: '12px', color: '#b2bec3', margin: '2px 0 0' },
  btnEditar: { background: 'none', border: '1px solid #dfe6e9', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#636e72' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  btnEliminar: { backgroundColor: '#fff', color: '#d63031', border: '1px solid #d63031', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  confirmBox: { backgroundColor: '#fff5f5', border: '1px solid #fab1a0', borderRadius: '8px', padding: '14px' },
  confirmText: { fontSize: '13px', color: '#636e72', marginBottom: '12px' },
  confirmActions: { display: 'flex', gap: '8px' },
  btnCancelar: { flex: 1, backgroundColor: '#fff', color: '#636e72', border: '1px solid #dfe6e9', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnConfirmar: { flex: 1, backgroundColor: '#d63031', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
}
