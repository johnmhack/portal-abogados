import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Plus, Search, Users, X, Phone, Mail, Pencil } from 'lucide-react'

export default function Clientes({ userProfile }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [clienteEditar, setClienteEditar] = useState(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [nuevo, setNuevo] = useState({
    nombre: '', apellido: '', documento: '',
    correo: '', telefono: '', direccion: '',
    ciudad: '', tipo_persona: 'natural',
    calidad_procesal: 'demandante'
  })

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    let query = supabase.from('clients').select('*').order('creado_en', { ascending: false })
    if (userProfile?.id && !['admin', 'superadmin'].includes(userProfile?.rol)) {
      query = query.eq('abogado_id', userProfile.id)
    }
    const { data } = await query
    setClientes(data || [])
    setLoading(false)
  }

  const crearCliente = async () => {
  if (!nuevo.nombre) return

  const payload = {
      nombre: nuevo.nombre,
      apellido: nuevo.apellido,
      documento: nuevo.documento,
      correo: nuevo.correo,
      telefono: nuevo.telefono,
      ciudad: nuevo.ciudad,
      direccion: nuevo.direccion,
      tipo_persona: nuevo.tipo_persona,
      calidad_procesal: nuevo.calidad_procesal || null
  }
  if (userProfile?.id) payload.abogado_id = userProfile.id

  const { data: clienteCreado, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.log(error)
    alert('No se pudo crear el cliente: ' + error.message)
    return
  }

  if (nuevo.crearAcceso && nuevo.correo && clienteCreado) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            nombre: clienteCreado.nombre,
            apellido: clienteCreado.apellido || '',
            email: clienteCreado.correo,
            telefono: clienteCreado.telefono || '',
            rol: 'cliente',
            client_id: clienteCreado.id
          })
        }
      )
      const data = await response.json()
      if (data.error) {
        alert('Cliente creado pero error al crear acceso: ' + data.error)
      } else {
        alert(`✅ Cliente creado con acceso al portal!\n\nCorreo: ${clienteCreado.correo}\nContraseña: Temporal123!`)
      }
    } catch (e) {
      alert('Cliente creado pero error: ' + e.message)
    }
  }

  setModalOpen(false)
  setNuevo({ nombre: '', apellido: '', documento: '', correo: '', telefono: '', direccion: '', ciudad: '', tipo_persona: 'natural', calidad_procesal: 'demandante', crearAcceso: false })
  fetchClientes()
}

const clientesFiltrados = clientes.filter(c =>
  `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
  c.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
  c.documento?.toLowerCase().includes(busqueda.toLowerCase())
  )
  
const editarCliente = async () => {
  if (!clienteEditar.nombre) return
  const { error } = await supabase
    .from('clients')
    .update({
      nombre: clienteEditar.nombre,
      apellido: clienteEditar.apellido,
      documento: clienteEditar.documento,
      correo: clienteEditar.correo,
      telefono: clienteEditar.telefono,
      ciudad: clienteEditar.ciudad,
      direccion: clienteEditar.direccion,
      tipo_persona: clienteEditar.tipo_persona,
      calidad_procesal: clienteEditar.calidad_procesal || null
    })
    .eq('id', clienteEditar.id)
  if (!error) {
    setModalEditar(false)
    setClienteEditar(null)
    setConfirmarEliminar(false)
    fetchClientes()
  }
}

  const eliminarCliente = async () => {
    if (!clienteEditar?.id) return
    setEliminando(true)
    const { error } = await supabase.from('clients').delete().eq('id', clienteEditar.id)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar. Puede tener casos asociados.')
      return
    }
    setModalEditar(false)
    setClienteEditar(null)
    setConfirmarEliminar(false)
    fetchClientes()
  }

  const cerrarEditar = () => {
    setModalEditar(false)
    setClienteEditar(null)
    setConfirmarEliminar(false)
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.searchBox}>
          <Search size={18} color="#8b949e" />
          <input
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button style={styles.btnNuevo} onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nuevo cliente
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#b2bec3' }}>Cargando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <div style={styles.empty}>
          <Users size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay clientes</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {clientesFiltrados.map(cliente => {
            const esJuridica = cliente.tipo_persona === 'juridica'
            const tipoColor = esJuridica ? '#0984e3' : '#00b894'
            const esDemandante = cliente.calidad_procesal === 'demandante'
            const esDemandado = cliente.calidad_procesal === 'demandado'
            const calidadColor = esDemandante ? '#6c5ce7' : esDemandado ? '#e17055' : '#636e72'
            const calidadLabel = esDemandante ? 'Demandante' : esDemandado ? 'Demandado' : null
            return (
              <div key={cliente.id} style={styles.card}>
                <div style={styles.avatar}>
                  {cliente.nombre?.[0]}{cliente.apellido?.[0]}
                </div>
                <div style={styles.cardInfo}>
                  <div style={styles.cardTop}>
                    <h3 style={styles.cardName}>{cliente.nombre} {cliente.apellido}</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ ...styles.badge, backgroundColor: tipoColor + '18', color: tipoColor }}>
                        {esJuridica ? 'Jurídica' : 'Natural'}
                      </span>
                      {calidadLabel && (
                        <span style={{ ...styles.badge, backgroundColor: calidadColor + '18', color: calidadColor }}>
                          {calidadLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {cliente.documento && <p style={styles.cardDoc}>Doc: {cliente.documento}</p>}
                  <div style={styles.cardDetails}>
                    {cliente.correo && (
                      <div style={styles.cardDetail}>
                        <Mail size={13} color="#8b949e" />
                        <span style={styles.cardText}>{cliente.correo}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div style={styles.cardDetail}>
                        <Phone size={13} color="#8b949e" />
                        <span style={styles.cardText}>{cliente.telefono}</span>
                      </div>
                    )}
                    {cliente.ciudad && (
                      <span style={styles.cardCiudad}>{cliente.ciudad}</span>
                    )}
                  </div>
                </div>
                <button
                  style={styles.btnEditar}
                  onClick={() => { setClienteEditar(cliente); setConfirmarEliminar(false); setModalEditar(true) }}
                  title="Editar cliente"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Nuevo Cliente</h3>
              <button style={styles.closeBtn} onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <select style={styles.input} value={nuevo.tipo_persona} onChange={e => setNuevo({ ...nuevo, tipo_persona: e.target.value })}>
                <option value="natural">Persona Natural</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
              <select style={styles.input} value={nuevo.calidad_procesal} onChange={e => setNuevo({ ...nuevo, calidad_procesal: e.target.value })}>
                <option value="demandante">Demandante</option>
                <option value="demandado">Demandado</option>
              </select>
              <div style={styles.row}>
                <input style={styles.input} placeholder="Nombre *" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
                <input style={styles.input} placeholder="Apellido" value={nuevo.apellido} onChange={e => setNuevo({ ...nuevo, apellido: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="crearAcceso"
                  checked={nuevo.crearAcceso || false}
                  onChange={e => setNuevo({ ...nuevo, crearAcceso: e.target.checked })}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="crearAcceso" style={{ fontSize: '13px', color: '#636e72', cursor: 'pointer' }}>
                  Crear acceso al portal para este cliente
                </label>
              </div>

              <input style={styles.input} placeholder="Documento (CC/NIT)" value={nuevo.documento} onChange={e => setNuevo({ ...nuevo, documento: e.target.value })} />
              <input style={styles.input} placeholder="Correo" type="email" value={nuevo.correo} onChange={e => setNuevo({ ...nuevo, correo: e.target.value })} />
              <input style={styles.input} placeholder="Teléfono" value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })} />
              <input style={styles.input} placeholder="Ciudad" value={nuevo.ciudad} onChange={e => setNuevo({ ...nuevo, ciudad: e.target.value })} />
              <input style={styles.input} placeholder="Dirección" value={nuevo.direccion} onChange={e => setNuevo({ ...nuevo, direccion: e.target.value })} />
              <button style={styles.btnGuardar} onClick={crearCliente}>Guardar Cliente</button>
            </div>
          </div>
        </div>
      )}
      {modalEditar && clienteEditar && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Editar Cliente</h3>
              <button style={styles.closeBtn} onClick={cerrarEditar}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <select style={styles.input} value={clienteEditar.tipo_persona || 'natural'} onChange={e => setClienteEditar({ ...clienteEditar, tipo_persona: e.target.value })}>
                <option value="natural">Persona Natural</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
              <select style={styles.input} value={clienteEditar.calidad_procesal || ''} onChange={e => setClienteEditar({ ...clienteEditar, calidad_procesal: e.target.value })}>
                <option value="">Sin definir</option>
                <option value="demandante">Demandante</option>
                <option value="demandado">Demandado</option>
              </select>
              <div style={styles.row}>
                <input style={styles.input} placeholder="Nombre *" value={clienteEditar.nombre || ''} onChange={e => setClienteEditar({ ...clienteEditar, nombre: e.target.value })} />
                <input style={styles.input} placeholder="Apellido" value={clienteEditar.apellido || ''} onChange={e => setClienteEditar({ ...clienteEditar, apellido: e.target.value })} />
              </div>
              <input style={styles.input} placeholder="Documento (CC/NIT)" value={clienteEditar.documento || ''} onChange={e => setClienteEditar({ ...clienteEditar, documento: e.target.value })} />
              <input style={styles.input} placeholder="Correo" type="email" value={clienteEditar.correo || ''} onChange={e => setClienteEditar({ ...clienteEditar, correo: e.target.value })} />
              <input style={styles.input} placeholder="Teléfono" value={clienteEditar.telefono || ''} onChange={e => setClienteEditar({ ...clienteEditar, telefono: e.target.value })} />
              <input style={styles.input} placeholder="Ciudad" value={clienteEditar.ciudad || ''} onChange={e => setClienteEditar({ ...clienteEditar, ciudad: e.target.value })} />
              <input style={styles.input} placeholder="Dirección" value={clienteEditar.direccion || ''} onChange={e => setClienteEditar({ ...clienteEditar, direccion: e.target.value })} />
              <button style={styles.btnGuardar} onClick={editarCliente}>Guardar Cambios</button>

              {!confirmarEliminar ? (
                <button style={styles.btnEliminar} onClick={() => setConfirmarEliminar(true)}>
                  Eliminar cliente
                </button>
              ) : (
                <div style={styles.confirmBox}>
                  <p style={styles.confirmText}>
                    ¿Seguro que deseas eliminar a <strong>{clienteEditar.nombre} {clienteEditar.apellido || ''}</strong>? Esta acción no se puede deshacer.
                  </p>
                  <div style={styles.confirmActions}>
                    <button style={styles.btnCancelar} onClick={() => setConfirmarEliminar(false)} disabled={eliminando}>
                      Cancelar
                    </button>
                    <button style={styles.btnConfirmarEliminar} onClick={eliminarCliente} disabled={eliminando}>
                      {eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
                    </button>
                  </div>
                </div>
              )}
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
  grid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '16px 18px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    border: '1px solid #eef0f3',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1a1a2e',
    color: '#c9a84c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '15px',
    flexShrink: 0,
    border: '2px solid rgba(201,168,76,0.35)',
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '2px' },
  cardName: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  cardDoc: { fontSize: '12px', color: '#8b949e', margin: '2px 0 6px', fontWeight: '500' },
  cardDetails: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' },
  cardDetail: { display: 'flex', alignItems: 'center', gap: '6px' },
  cardText: { fontSize: '13px', color: '#636e72' },
  cardCiudad: { fontSize: '12px', color: '#8b949e', fontWeight: '500' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  btnEditar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    border: '1px solid #e1e4e8',
    borderRadius: '10px',
    padding: '10px',
    cursor: 'pointer',
    color: '#1a1a2e',
    flexShrink: 0,
  },
  btnEliminar: { backgroundColor: '#fff', color: '#d63031', border: '1px solid #d63031', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  confirmBox: { backgroundColor: '#fff5f5', border: '1px solid #fab1a0', borderRadius: '8px', padding: '14px' },
  confirmText: { fontSize: '13px', color: '#636e72', marginBottom: '12px', lineHeight: 1.4 },
  confirmActions: { display: 'flex', gap: '8px' },
  btnCancelar: { flex: 1, backgroundColor: '#fff', color: '#636e72', border: '1px solid #dfe6e9', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnConfirmarEliminar: { flex: 1, backgroundColor: '#d63031', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
}