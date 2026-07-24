import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ArrowLeft, FileText, MessageSquare, Plus, X, TrendingUp, CheckSquare, Pencil, Eye, Download, Trash2 } from 'lucide-react'
import InformeCliente from './InformeCliente'

export default function DetalleCaso({ casoId, onBack }) {
  const [caso, setCaso] = useState(null)
  const [tab, setTab] = useState('eventos')
  const [mostrarInforme, setMostrarInforme] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [clientes, setClientes] = useState([])
  const [editCaso, setEditCaso] = useState({})
  const [editCliente, setEditCliente] = useState({})
  const [juzgados, setJuzgados] = useState([])
  const [nuevoJuzgadoNombre, setNuevoJuzgadoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchCaso() }, [casoId])

  const fetchCaso = async () => {
    const { data } = await supabase
      .from('cases')
      .select('*, clients(id, nombre, apellido, correo, telefono, documento, ciudad, direccion), juzgados(id, nombre, ciudad, especialidad)')
      .eq('id', casoId)
      .single()
    setCaso(data)
  }

  const abrirEditar = async () => {
    const [{ data: clientesData }, { data: juzgadosData }] = await Promise.all([
      supabase.from('clients').select('id, nombre, apellido').order('nombre'),
      supabase.from('juzgados').select('id, nombre, ciudad').order('nombre'),
    ])
    setClientes(clientesData || [])
    setJuzgados(juzgadosData || [])
    setEditCaso({
      titulo: caso.titulo || '',
      descripcion: caso.descripcion || '',
      numero_radicado: caso.numero_radicado || '',
      ciudad: caso.ciudad || '',
      status: caso.status || 'activo',
      client_id: caso.client_id || '',
      juzgado_id: caso.juzgado_id || ''
    })
    setEditCliente({
      nombre: caso.clients?.nombre || '',
      apellido: caso.clients?.apellido || '',
      correo: caso.clients?.correo || '',
      telefono: caso.clients?.telefono || '',
      documento: caso.clients?.documento || '',
      ciudad: caso.clients?.ciudad || '',
      direccion: caso.clients?.direccion || ''
    })
    setNuevoJuzgadoNombre('')
    setConfirmarEliminar(false)
    setModalEditar(true)
  }

  const crearJuzgadoRapido = async () => {
    if (!nuevoJuzgadoNombre.trim()) return
    const { data, error } = await supabase
      .from('juzgados')
      .insert([{ nombre: nuevoJuzgadoNombre.trim(), ciudad: editCaso.ciudad || null }])
      .select()
      .single()
    if (error) {
      alert('Error al crear juzgado: ' + error.message)
      return
    }
    const { data: lista } = await supabase.from('juzgados').select('id, nombre, ciudad').order('nombre')
    setJuzgados(lista || [])
    setEditCaso({ ...editCaso, juzgado_id: data.id })
    setNuevoJuzgadoNombre('')
  }

  const guardarEdicion = async () => {
    if (!editCaso.titulo.trim()) return
    setGuardando(true)
    const casoUpdate = { ...editCaso }
    if (!casoUpdate.client_id) casoUpdate.client_id = null
    if (!casoUpdate.juzgado_id) casoUpdate.juzgado_id = null
    await supabase.from('cases').update(casoUpdate).eq('id', casoId)
    if (caso.client_id || editCaso.client_id) {
      const clientId = editCaso.client_id || caso.client_id
      if (clientId && editCliente.nombre.trim()) {
        await supabase.from('clients').update(editCliente).eq('id', clientId)
      }
    }
    setGuardando(false)
    setModalEditar(false)
    setConfirmarEliminar(false)
    fetchCaso()
  }

  const eliminarCaso = async () => {
    setEliminando(true)
    const { error } = await supabase.from('cases').delete().eq('id', casoId)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar el caso. Puede tener registros asociados.')
      return
    }
    setModalEditar(false)
    setConfirmarEliminar(false)
    onBack()
  }

  const cerrarEditar = () => {
    setModalEditar(false)
    setConfirmarEliminar(false)
  }

  const statusColor = {
    activo: '#0984e3', en_proceso: '#c9a84c', audiencia: '#6c5ce7',
    cerrado: '#636e72', ganado: '#00b894', perdido: '#d63031'
  }

  if (!caso) return <p style={{ color: '#b2bec3' }}>Cargando...</p>

  return (
    <div>
      {/* BACK + ACCIONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> Volver a Casos
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.btnEditar} onClick={abrirEditar}>
            <Pencil size={16} /> Editar caso
          </button>
          <button style={styles.btnInforme} onClick={() => setMostrarInforme(true)}>
            📊 Generar Informe
          </button>
        </div>
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
            <span style={styles.metaLabel}>Juzgado</span>
            <span style={styles.metaValue}>{caso.juzgados?.nombre || '—'}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Ciudad</span>
            <span style={styles.metaValue}>{caso.ciudad || caso.juzgados?.ciudad || '—'}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Fecha apertura</span>
            <span style={styles.metaValue}>{new Date(caso.fecha_apertura).toLocaleDateString('es-CO')}</span>
          </div>
        </div>
      </div>

      {modalEditar && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={styles.modalHeader}>
              <h3>Editar caso</h3>
              <button style={styles.closeBtn} onClick={cerrarEditar}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <p style={styles.sectionLabel}>Datos del caso</p>
              <input style={styles.input} placeholder="Título *" value={editCaso.titulo} onChange={e => setEditCaso({ ...editCaso, titulo: e.target.value })} />
              <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Descripción" value={editCaso.descripcion} onChange={e => setEditCaso({ ...editCaso, descripcion: e.target.value })} />
              <select
                style={styles.input}
                value={editCaso.client_id}
                onChange={async e => {
                  const clientId = e.target.value
                  setEditCaso({ ...editCaso, client_id: clientId })
                  if (!clientId) {
                    setEditCliente({ nombre: '', apellido: '', correo: '', telefono: '', documento: '', ciudad: '', direccion: '' })
                    return
                  }
                  const { data } = await supabase.from('clients').select('*').eq('id', clientId).single()
                  if (data) {
                    setEditCliente({
                      nombre: data.nombre || '',
                      apellido: data.apellido || '',
                      correo: data.correo || '',
                      telefono: data.telefono || '',
                      documento: data.documento || '',
                      ciudad: data.ciudad || '',
                      direccion: data.direccion || ''
                    })
                  }
                }}
              >
                <option value="">Sin cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
                ))}
              </select>
              <input style={styles.input} placeholder="Número de radicado" value={editCaso.numero_radicado} onChange={e => setEditCaso({ ...editCaso, numero_radicado: e.target.value })} />
              <input style={styles.input} placeholder="Ciudad" value={editCaso.ciudad} onChange={e => setEditCaso({ ...editCaso, ciudad: e.target.value })} />
              <select style={styles.input} value={editCaso.juzgado_id || ''} onChange={e => setEditCaso({ ...editCaso, juzgado_id: e.target.value })}>
                <option value="">Sin juzgado</option>
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
                  disabled={!nuevoJuzgadoNombre.trim()}
                >
                  Crear
                </button>
              </div>
              <select style={styles.input} value={editCaso.status} onChange={e => setEditCaso({ ...editCaso, status: e.target.value })}>
                <option value="activo">Activo</option>
                <option value="en_proceso">En proceso</option>
                <option value="audiencia">Audiencia</option>
                <option value="cerrado">Cerrado</option>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>

              {(editCaso.client_id || caso.client_id) && (
                <>
                  <p style={styles.sectionLabel}>Info del cliente</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input style={styles.input} placeholder="Nombre" value={editCliente.nombre} onChange={e => setEditCliente({ ...editCliente, nombre: e.target.value })} />
                    <input style={styles.input} placeholder="Apellido" value={editCliente.apellido} onChange={e => setEditCliente({ ...editCliente, apellido: e.target.value })} />
                  </div>
                  <input style={styles.input} placeholder="Documento" value={editCliente.documento} onChange={e => setEditCliente({ ...editCliente, documento: e.target.value })} />
                  <input style={styles.input} placeholder="Correo" value={editCliente.correo} onChange={e => setEditCliente({ ...editCliente, correo: e.target.value })} />
                  <input style={styles.input} placeholder="Teléfono" value={editCliente.telefono} onChange={e => setEditCliente({ ...editCliente, telefono: e.target.value })} />
                  <input style={styles.input} placeholder="Ciudad" value={editCliente.ciudad} onChange={e => setEditCliente({ ...editCliente, ciudad: e.target.value })} />
                  <input style={styles.input} placeholder="Dirección" value={editCliente.direccion} onChange={e => setEditCliente({ ...editCliente, direccion: e.target.value })} />
                </>
              )}

              <button style={styles.btnGuardar} onClick={guardarEdicion} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>

              {!confirmarEliminar ? (
                <button style={styles.btnEliminar} onClick={() => setConfirmarEliminar(true)}>
                  Eliminar caso
                </button>
              ) : (
                <div style={styles.confirmBox}>
                  <p style={styles.confirmText}>
                    ¿Seguro que deseas eliminar el caso <strong>{caso.titulo}</strong>? Esta acción no se puede deshacer.
                  </p>
                  <div style={styles.confirmActions}>
                    <button style={styles.btnCancelar} onClick={() => setConfirmarEliminar(false)} disabled={eliminando}>
                      Cancelar
                    </button>
                    <button style={styles.btnConfirmarEliminar} onClick={eliminarCaso} disabled={eliminando}>
                      {eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
  const [docsPorEtapa, setDocsPorEtapa] = useState({})
  const [tareasPorEtapa, setTareasPorEtapa] = useState({})
  const [expandida, setExpandida] = useState(null)
  const [modalNueva, setModalNueva] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', notas: '' })
  const [nuevaTarea, setNuevaTarea] = useState({})
  const [subiendoStage, setSubiendoStage] = useState(null)

  useEffect(() => { fetchTodo() }, [casoId])

  const fetchTodo = async () => {
    const { data: etapasData } = await supabase
      .from('case_stages')
      .select('*')
      .eq('case_id', casoId)
      .order('orden', { ascending: true })
    setEtapas(etapasData || [])

    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', casoId)
      .not('stage_id', 'is', null)
    const docsMap = {}
    ;(docs || []).forEach(d => {
      if (!docsMap[d.stage_id]) docsMap[d.stage_id] = []
      docsMap[d.stage_id].push(d)
    })
    setDocsPorEtapa(docsMap)

    const { data: tareas } = await supabase
      .from('tasks')
      .select('*')
      .eq('case_id', casoId)
      .not('stage_id', 'is', null)
      .order('creado_en', { ascending: false })
    const tareasMap = {}
    ;(tareas || []).forEach(t => {
      if (!tareasMap[t.stage_id]) tareasMap[t.stage_id] = []
      tareasMap[t.stage_id].push(t)
    })
    setTareasPorEtapa(tareasMap)
  }

  const cambiarEstado = async (id, estado) => {
    const update = { estado }
    if (estado === 'completado') update.fecha_completado = new Date().toISOString()
    await supabase.from('case_stages').update(update).eq('id', id)
    fetchTodo()
  }

  const guardarCampo = async (id, campos) => {
    await supabase.from('case_stages').update(campos).eq('id', id)
    fetchTodo()
  }

  const agregarEtapa = async () => {
    if (!nueva.nombre.trim()) return
    const maxOrden = etapas.length > 0 ? Math.max(...etapas.map(e => e.orden)) : 0
    await supabase.from('case_stages').insert([{
      case_id: casoId,
      nombre: nueva.nombre,
      notas: nueva.notas,
      orden: maxOrden + 1,
      estado: 'pendiente'
    }])
    setModalNueva(false)
    setNueva({ nombre: '', notas: '' })
    fetchTodo()
  }

  const subirDocEtapa = async (stageId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoStage(stageId)
    const path = `${casoId}/${stageId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file)
    if (!uploadError) {
      await supabase.from('documents').insert([{
        case_id: casoId,
        stage_id: stageId,
        nombre: file.name,
        tipo_documento: file.type,
        url: path
      }])
      await fetchTodo()
    }
    setSubiendoStage(null)
    e.target.value = ''
  }

  const eliminarDocEtapa = async (doc) => {
    await supabase.storage.from('documentos').remove([doc.url])
    await supabase.from('documents').delete().eq('id', doc.id)
    fetchTodo()
  }

  const agregarTareaEtapa = async (stageId) => {
    const titulo = (nuevaTarea[stageId] || '').trim()
    if (!titulo) return
    await supabase.from('tasks').insert([{ case_id: casoId, stage_id: stageId, titulo }])
    setNuevaTarea({ ...nuevaTarea, [stageId]: '' })
    fetchTodo()
  }

  const toggleTareaEtapa = async (id, completado) => {
    await supabase.from('tasks').update({
      completado: !completado,
      fecha_completado: !completado ? new Date().toISOString() : null
    }).eq('id', id)
    fetchTodo()
  }

  const eliminarTareaEtapa = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTodo()
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
        etapas.map(etapa => {
          const abierta = expandida === etapa.id
          const docs = docsPorEtapa[etapa.id] || []
          const tareas = tareasPorEtapa[etapa.id] || []
          return (
            <div key={etapa.id} style={styles.etapaCard}>
              <div style={{ ...styles.etapaCirculo, borderColor: estadoColor[etapa.estado] }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: estadoColor[etapa.estado] }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <button
                    style={styles.etapaNombreBtn}
                    onClick={() => setExpandida(abierta ? null : etapa.id)}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{etapa.nombre}</span>
                    <span style={{ fontSize: '11px', color: '#b2bec3' }}>
                      {docs.length} docs · {tareas.length} tareas {abierta ? '▲' : '▼'}
                    </span>
                  </button>
                  <select
                    style={{ ...styles.selectEstado, color: estadoColor[etapa.estado] }}
                    value={etapa.estado}
                    onChange={e => cambiarEstado(etapa.id, e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="completado">Completado</option>
                    <option value="omitido">Omitido</option>
                  </select>
                </div>

                {etapa.fecha && (
                  <p style={{ fontSize: '12px', color: '#636e72', marginTop: '4px' }}>
                    📅 {new Date(etapa.fecha + 'T12:00:00').toLocaleDateString('es-CO')}
                  </p>
                )}
                {etapa.notas && !abierta && (
                  <p style={{ fontSize: '13px', color: '#636e72', marginTop: '4px' }}>{etapa.notas}</p>
                )}

                {abierta && (
                  <div style={styles.etapaDetalle}>
                    <label style={styles.etapaLabel}>Fecha</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={etapa.fecha || ''}
                      onChange={e => guardarCampo(etapa.id, { fecha: e.target.value || null })}
                    />

                    <label style={styles.etapaLabel}>Notas</label>
                    <textarea
                      style={{ ...styles.input, height: '70px', resize: 'none' }}
                      defaultValue={etapa.notas || ''}
                      placeholder="Notas de esta etapa..."
                      onBlur={e => {
                        if (e.target.value !== (etapa.notas || '')) {
                          guardarCampo(etapa.id, { notas: e.target.value })
                        }
                      }}
                    />

                    <label style={styles.etapaLabel}>Documentos</label>
                    {docs.map(doc => (
                      <div key={doc.id} style={styles.etapaDocRow}>
                        <span style={{ fontSize: '13px', color: '#2d3436', flex: 1 }}>📄 {doc.nombre}</span>
                        <button style={styles.btnTareaEliminar} onClick={() => eliminarDocEtapa(doc)} title="Eliminar">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <label style={styles.btnSubirMini}>
                      {subiendoStage === etapa.id ? 'Subiendo...' : '+ Subir documento'}
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        disabled={subiendoStage === etapa.id}
                        onChange={e => subirDocEtapa(etapa.id, e)}
                      />
                    </label>

                    <label style={styles.etapaLabel}>Tareas</label>
                    {tareas.map(t => (
                      <div key={t.id} style={{ ...styles.tareaCard, marginBottom: '6px', padding: '8px 12px' }}>
                        <input
                          type="checkbox"
                          checked={!!t.completado}
                          onChange={() => toggleTareaEtapa(t.id, t.completado)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <span style={{
                          fontSize: '13px',
                          color: '#2d3436',
                          textDecoration: t.completado ? 'line-through' : 'none',
                          flex: 1
                        }}>{t.titulo}</span>
                        <button style={styles.btnTareaEliminar} onClick={() => eliminarTareaEtapa(t.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ ...styles.input, flex: 1 }}
                        placeholder="Nueva tarea de esta etapa..."
                        value={nuevaTarea[etapa.id] || ''}
                        onChange={e => setNuevaTarea({ ...nuevaTarea, [etapa.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && agregarTareaEtapa(etapa.id)}
                      />
                      <button style={styles.btnAgregarMini} onClick={() => agregarTareaEtapa(etapa.id)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })
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
    const { data } = await supabase
      .from('tasks')
      .select('*, case_stages(nombre)')
      .eq('case_id', casoId)
      .order('creado_en', { ascending: false })
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

  const eliminarTarea = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTareas()
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.inputRow}>
        <input style={{ ...styles.input, flex: 1 }} placeholder="Nueva tarea general del caso..." value={nueva} onChange={e => setNueva(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} />
        <button style={styles.btnAgregar} onClick={agregar}><Plus size={18} /> Agregar</button>
      </div>
      {tareas.length === 0 ? (
        <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>No hay tareas</p>
      ) : (
        tareas.map(t => (
          <div key={t.id} style={{ ...styles.tareaCard, opacity: t.completado ? 0.6 : 1 }}>
            <input type="checkbox" checked={t.completado} onChange={() => toggleTarea(t.id, t.completado)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '14px', color: '#2d3436', textDecoration: t.completado ? 'line-through' : 'none' }}>{t.titulo}</span>
              {t.case_stages?.nombre && (
                <span style={{ display: 'block', fontSize: '11px', color: '#c9a84c', marginTop: '2px' }}>Etapa: {t.case_stages.nombre}</span>
              )}
            </div>
            {t.fecha_completado && <span style={{ fontSize: '12px', color: '#b2bec3' }}>{new Date(t.fecha_completado).toLocaleDateString('es-CO')}</span>}
            <button style={styles.btnTareaEliminar} onClick={() => eliminarTarea(t.id)} title="Eliminar tarea">
              <X size={16} />
            </button>
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
  const [vista, setVista] = useState(null)
  const [docEliminar, setDocEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchDocumentos() }, [casoId])
  useEffect(() => () => { if (vista?.url) URL.revokeObjectURL(vista.url) }, [vista])

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

  const obtenerBlobUrl = async (doc) => {
    const { data } = await supabase.storage.from('documentos').download(doc.url)
    if (!data) return null
    return URL.createObjectURL(data)
  }

  const descargar = async (doc) => {
    const url = await obtenerBlobUrl(doc)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nombre
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const visualizar = async (doc) => {
    if (vista?.url) URL.revokeObjectURL(vista.url)
    const url = await obtenerBlobUrl(doc)
    if (url) setVista({ ...doc, url })
  }

  const cerrarVista = () => {
    if (vista?.url) URL.revokeObjectURL(vista.url)
    setVista(null)
  }

  const eliminarDocumento = async () => {
    if (!docEliminar) return
    setEliminando(true)
    await supabase.storage.from('documentos').remove([docEliminar.url])
    const { error } = await supabase.from('documents').delete().eq('id', docEliminar.id)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar el documento.')
      return
    }
    if (vista?.id === docEliminar.id) cerrarVista()
    setDocEliminar(null)
    fetchDocumentos()
  }

  const esImagen = (tipo) => tipo?.startsWith('image/')
  const esPdf = (tipo, nombre) => tipo?.includes('pdf') || nombre?.toLowerCase().endsWith('.pdf')

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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.btnVer} onClick={() => visualizar(doc)}><Eye size={14} /> Ver</button>
              <button style={styles.btnDescargar} onClick={() => descargar(doc)}><Download size={14} /> Descargar</button>
              <button style={styles.btnDocEliminar} onClick={() => setDocEliminar(doc)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))
      )}

      {docEliminar && (
        <div style={styles.confirmBox}>
          <p style={styles.confirmText}>
            ¿Eliminar <strong>{docEliminar.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          <div style={styles.confirmActions}>
            <button style={styles.btnCancelar} onClick={() => setDocEliminar(null)} disabled={eliminando}>Cancelar</button>
            <button style={styles.btnConfirmarEliminar} onClick={eliminarDocumento} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
            </button>
          </div>
        </div>
      )}

      {vista && (
        <div style={styles.viewerBox}>
          <div style={styles.viewerHeader}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{vista.nombre}</span>
            <button style={styles.closeBtn} onClick={cerrarVista}><X size={18} /></button>
          </div>
          {esImagen(vista.tipo_documento) ? (
            <img src={vista.url} alt={vista.nombre} style={styles.viewerImg} />
          ) : esPdf(vista.tipo_documento, vista.nombre) ? (
            <iframe src={vista.url} title={vista.nombre} style={styles.viewerFrame} />
          ) : (
            <div style={styles.viewerFallback}>
              <p style={{ color: '#636e72', marginBottom: '12px' }}>Vista previa no disponible para este tipo de archivo.</p>
              <button style={styles.btnDescargar} onClick={() => descargar(vista)}>Descargar archivo</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#636e72', fontSize: '14px' },
  btnEditar: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', color: '#1a1a2e', border: '1px solid #dfe6e9', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
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
  sectionLabel: { fontSize: '12px', fontWeight: '700', color: '#b2bec3', textTransform: 'uppercase', margin: '8px 0 0' },
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
  etapaNombreBtn: { background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  etapaDetalle: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', gap: '8px' },
  etapaLabel: { fontSize: '11px', fontWeight: '700', color: '#b2bec3', textTransform: 'uppercase', marginTop: '4px' },
  etapaDocRow: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', borderRadius: '6px', padding: '8px 10px' },
  btnSubirMini: { display: 'inline-block', backgroundColor: '#fff', color: '#1a1a2e', border: '1px dashed #dfe6e9', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', textAlign: 'center' },
  btnAgregarMini: { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' },
  selectEstado: { border: '1px solid #dfe6e9', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', fontWeight: '600' },
  tareaCard: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' },
  btnTareaEliminar: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#b2bec3', padding: '4px', borderRadius: '4px' },
  btnSubir: { display: 'inline-block', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginBottom: '16px' },
  docCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' },
  btnVer: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#c9a84c20', color: '#c9a84c', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDescargar: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0984e320', color: '#0984e3', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDocEliminar: { display: 'flex', alignItems: 'center', backgroundColor: '#d6303120', color: '#d63031', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' },
  viewerBox: { marginTop: '16px', border: '1px solid #dfe6e9', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f8f9fa' },
  viewerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #dfe6e9' },
  viewerImg: { display: 'block', maxWidth: '100%', maxHeight: '70vh', margin: '0 auto', padding: '16px' },
  viewerFrame: { width: '100%', height: '70vh', border: 'none', backgroundColor: '#fff' },
  viewerFallback: { padding: '40px', textAlign: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnCrearJuzgado: { backgroundColor: '#c9a84c', color: '#1a1a2e', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  btnEliminar: { backgroundColor: '#fff', color: '#d63031', border: '1px solid #d63031', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
  confirmBox: { backgroundColor: '#fff5f5', border: '1px solid #fab1a0', borderRadius: '8px', padding: '14px' },
  confirmText: { fontSize: '13px', color: '#636e72', marginBottom: '12px', lineHeight: 1.4 },
  confirmActions: { display: 'flex', gap: '8px' },
  btnCancelar: { flex: 1, backgroundColor: '#fff', color: '#636e72', border: '1px solid #dfe6e9', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnConfirmarEliminar: { flex: 1, backgroundColor: '#d63031', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
}