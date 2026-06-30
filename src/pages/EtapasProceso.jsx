import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Plus, X, CheckCircle, Clock, XCircle, Loader } from 'lucide-react'

const ETAPAS_PREDEFINIDAS = {
  ejecutivo: [
    'Radicación de demanda',
    'Admisión de demanda',
    'Mandamiento de pago',
    'Notificación al demandado',
    'Excepciones',
    'Sentencia',
    'Ejecución'
  ],
  laboral: [
    'Radicación de demanda',
    'Admisión de demanda',
    'Notificación',
    'Audiencia de conciliación',
    'Audiencia de trámite',
    'Audiencia de juzgamiento',
    'Sentencia',
    'Apelación'
  ],
  administrativo: [
    'Radicación de demanda',
    'Admisión de demanda',
    'Notificación',
    'Periodo probatorio',
    'Alegatos de conclusión',
    'Sentencia',
    'Apelación'
  ],
  civil: [
    'Radicación de demanda',
    'Admisión de demanda',
    'Notificación',
    'Periodo probatorio',
    'Audiencia',
    'Sentencia'
  ]
}

const estadoIcono = {
  pendiente: <Clock size={18} color="#b2bec3" />,
  en_proceso: <Loader size={18} color="#c9a84c" />,
  completado: <CheckCircle size={18} color="#00b894" />,
  rechazado: <XCircle size={18} color="#d63031" />
}

const estadoColor = {
  pendiente: '#b2bec3',
  en_proceso: '#c9a84c',
  completado: '#00b894',
  rechazado: '#d63031'
}

export default function EtapasProceso({ casoId, tipoDerecho }) {
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', descripcion: '' })

  useEffect(() => { fetchEtapas() }, [casoId])

  const fetchEtapas = async () => {
    const { data } = await supabase
      .from('etapas_proceso')
      .select('*')
      .eq('caso_id', casoId)
      .order('orden', { ascending: true })
    setEtapas(data || [])
    setLoading(false)
  }

  const cargarPlantilla = async () => {
    const tipo = tipoDerecho?.toLowerCase()
    const plantilla = ETAPAS_PREDEFINIDAS[tipo] || ETAPAS_PREDEFINIDAS.civil
    const etapasAInsertar = plantilla.map((nombre, i) => ({
      caso_id: casoId,
      nombre,
      orden: i + 1,
      estado: 'pendiente'
    }))
    await supabase.from('etapas_proceso').insert(etapasAInsertar)
    fetchEtapas()
  }

  const cambiarEstado = async (id, estado) => {
    const update = { estado }
    if (estado === 'completado') update.fecha_completado = new Date().toISOString()
    await supabase.from('etapas_proceso').update(update).eq('id', id)
    fetchEtapas()
  }

  const agregarEtapa = async () => {
    if (!nueva.nombre.trim()) return
    const maxOrden = etapas.length > 0 ? Math.max(...etapas.map(e => e.orden)) : 0
    await supabase.from('etapas_proceso').insert([{
      caso_id: casoId,
      nombre: nueva.nombre,
      descripcion: nueva.descripcion,
      orden: maxOrden + 1,
      estado: 'pendiente'
    }])
    setModalNueva(false)
    setNueva({ nombre: '', descripcion: '' })
    fetchEtapas()
  }

  const completadas = etapas.filter(e => e.estado === 'completado').length
  const progreso = etapas.length > 0 ? Math.round((completadas / etapas.length) * 100) : 0

  if (loading) return <p style={{ color: '#b2bec3' }}>Cargando...</p>

  return (
    <div>
      {/* ACCIONES */}
      <div style={styles.header}>
        {etapas.length === 0 && (
          <button style={styles.btnPlantilla} onClick={cargarPlantilla}>
            ⚡ Cargar etapas predefinidas
          </button>
        )}
        <button style={styles.btnNueva} onClick={() => setModalNueva(true)}>
          <Plus size={16} /> Agregar etapa
        </button>
      </div>

      {/* PROGRESO */}
      {etapas.length > 0 && (
        <div style={styles.progresoBox}>
          <div style={styles.progresoHeader}>
            <span style={styles.progresoLabel}>Progreso del proceso</span>
            <span style={styles.progresoNum}>{progreso}%</span>
          </div>
          <div style={styles.progresoBar}>
            <div style={{ ...styles.progresoFill, width: `${progreso}%` }} />
          </div>
          <p style={styles.progresoSub}>{completadas} de {etapas.length} etapas completadas</p>
        </div>
      )}

      {/* ETAPAS */}
      {etapas.length === 0 ? (
        <div style={styles.empty}>
          <Clock size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay etapas. Carga una plantilla o agrega manualmente.</p>
        </div>
      ) : (
        <div style={styles.timeline}>
          {etapas.map((etapa, i) => (
            <div key={etapa.id} style={styles.etapaRow}>
              <div style={styles.timelineLeft}>
                <div style={{ ...styles.circulo, borderColor: estadoColor[etapa.estado], backgroundColor: etapa.estado === 'completado' ? '#00b89420' : etapa.estado === 'rechazado' ? '#d6303120' : etapa.estado === 'en_proceso' ? '#c9a84c20' : '#f0f2f5' }}>
                  {estadoIcono[etapa.estado]}
                </div>
                {i < etapas.length - 1 && <div style={styles.lineaVertical} />}
              </div>
              <div style={styles.etapaCard}>
                <div style={styles.etapaTop}>
                  <h4 style={styles.etapaNombre}>{etapa.nombre}</h4>
                  <select
                    style={{ ...styles.selectEstado, color: estadoColor[etapa.estado] }}
                    value={etapa.estado}
                    onChange={e => cambiarEstado(etapa.id, e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="completado">Completado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
                {etapa.descripcion && <p style={styles.etapaDesc}>{etapa.descripcion}</p>}
                {etapa.fecha_completado && (
                  <p style={styles.etapaFecha}>✅ Completado: {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalNueva && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Nueva Etapa</h3>
              <button style={styles.closeBtn} onClick={() => setModalNueva(false)}><X size={20} /></button>
            </div>
            <div style={styles.form}>
              <input style={styles.input} placeholder="Nombre de la etapa *" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} />
              <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Descripción (opcional)" value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} />
              <button style={styles.btnGuardar} onClick={agregarEtapa}>Guardar Etapa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  btnPlantilla: { backgroundColor: '#c9a84c20', color: '#c9a84c', border: '1px solid #c9a84c', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnNueva: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
  progresoHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  progresoLabel: { fontSize: '13px', color: '#636e72', fontWeight: '600' },
  progresoNum: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e' },
  progresoBar: { height: '8px', backgroundColor: '#dfe6e9', borderRadius: '4px', overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#00b894', borderRadius: '4px', transition: 'width 0.3s ease' },
  progresoSub: { fontSize: '12px', color: '#b2bec3', marginTop: '6px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' },
  timeline: { display: 'flex', flexDirection: 'column' },
  etapaRow: { display: 'flex', gap: '16px' },
  timelineLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  circulo: { width: '40px', height: '40px', borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lineaVertical: { width: '2px', flex: 1, backgroundColor: '#f0f2f5', margin: '4px 0' },
  etapaCard: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' },
  etapaTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  etapaNombre: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  selectEstado: { border: '1px solid #dfe6e9', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', fontWeight: '600' },
  etapaDesc: { fontSize: '13px', color: '#636e72', marginTop: '4px' },
  etapaFecha: { fontSize: '12px', color: '#00b894', marginTop: '6px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%' },
  btnGuardar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' },
}