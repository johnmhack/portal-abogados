import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CheckCircle, Clock, XCircle, Loader, Download } from 'lucide-react'

export default function InformeCliente({ casoId, onClose }) {
  const [caso, setCaso] = useState(null)
  const [etapas, setEtapas] = useState([])
  const [cliente, setCliente] = useState(null)

  useEffect(() => { fetchDatos() }, [casoId])

  const fetchDatos = async () => {
    const { data: casoData } = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido)')
      .eq('id', casoId)
      .single()
    setCaso(casoData)
    if (casoData?.clients) setCliente(casoData.clients)

    const { data: etapasData } = await supabase
      .from('case_stages')
      .select('*')
      .eq('case_id', casoId)
      .order('orden', { ascending: true })
    setEtapas(etapasData || [])
  }

  const estadoColor = { pendiente: '#b2bec3', en_proceso: '#c9a84c', completado: '#00b894', omitido: '#636e72' }
  const estadoLabel = { pendiente: 'Pendiente', en_proceso: 'En proceso', completado: 'Completado', omitido: 'Omitido' }
  const estadoIcono = {
    pendiente: <Clock size={16} color="#b2bec3" />,
    en_proceso: <Loader size={16} color="#c9a84c" />,
    completado: <CheckCircle size={16} color="#00b894" />,
    omitido: <XCircle size={16} color="#636e72" />
  }

  const completadas = etapas.filter(e => e.estado === 'completado').length
  const progreso = etapas.length > 0 ? Math.round((completadas / etapas.length) * 100) : 0

  if (!caso) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.titulo}>SAR Abogados Especializados</h2>
            <p style={styles.subtitulo}>Informe de estado del proceso</p>
          </div>
          <div style={styles.headerBtns}>
            <button style={styles.btnImprimir} onClick={() => window.print()}>
              <Download size={16} /> Imprimir / PDF
            </button>
            <button style={styles.btnCerrar} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* INFO CASO */}
        <div style={styles.infoCaso}>
          <div style={styles.infoGrid}>
            <div>
              <p style={styles.infoLabel}>Cliente</p>
              <p style={styles.infoValor}>{cliente ? `${cliente.nombre} ${cliente.apellido || ''}` : '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Caso</p>
              <p style={styles.infoValor}>{caso.titulo}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Radicado</p>
              <p style={styles.infoValor}>{caso.numero_radicado || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Ciudad</p>
              <p style={styles.infoValor}>{caso.ciudad || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Estado</p>
              <p style={styles.infoValor}>{caso.status?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Fecha apertura</p>
              <p style={styles.infoValor}>{new Date(caso.fecha_apertura).toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        </div>

        {/* PROGRESO */}
        <div style={styles.progresoBox}>
          <div style={styles.progresoHeader}>
            <span style={styles.progresoLabel}>Progreso general del proceso</span>
            <span style={styles.progresoNum}>{progreso}%</span>
          </div>
          <div style={styles.progresoBar}>
            <div style={{ ...styles.progresoFill, width: `${progreso}%` }} />
          </div>
          <p style={styles.progresoSub}>{completadas} de {etapas.length} etapas completadas</p>
        </div>

        {/* ETAPAS */}
        <h3 style={styles.etapasTitulo}>Etapas del proceso</h3>
        {etapas.length === 0 ? (
          <p style={{ color: '#b2bec3', textAlign: 'center', padding: '20px' }}>No hay etapas registradas</p>
        ) : (
          etapas.map((etapa, i) => (
            <div key={etapa.id} style={styles.etapaRow}>
              <div style={styles.etapaNum}>{i + 1}</div>
              <div style={styles.etapaInfo}>
                <div style={styles.etapaTop}>
                  <span style={styles.etapaNombre}>{etapa.nombre}</span>
                  <span style={{ ...styles.estadoBadge, backgroundColor: estadoColor[etapa.estado] + '20', color: estadoColor[etapa.estado] }}>
                    {estadoIcono[etapa.estado]} {estadoLabel[etapa.estado]}
                  </span>
                </div>
                {etapa.notas && <p style={styles.etapaDesc}>{etapa.notas}</p>}
                {etapa.fecha_completado && (
                  <p style={styles.etapaFecha}>Completado el {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* FOOTER */}
        <div style={styles.footer}>
          <p>Informe generado el {new Date().toLocaleDateString('es-CO')} — SAR Abogados Especializados</p>
          <p>Este documento es confidencial y de uso exclusivo del cliente.</p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #1a1a2e' },
  titulo: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e' },
  subtitulo: { fontSize: '13px', color: '#636e72', marginTop: '4px' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  btnImprimir: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnCerrar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#636e72' },
  infoCaso: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', marginBottom: '20px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  infoLabel: { fontSize: '11px', color: '#b2bec3', textTransform: 'uppercase', marginBottom: '4px' },
  infoValor: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e', textTransform: 'capitalize' },
  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '24px' },
  progresoHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  progresoLabel: { fontSize: '13px', color: '#636e72', fontWeight: '600' },
  progresoNum: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e' },
  progresoBar: { height: '10px', backgroundColor: '#dfe6e9', borderRadius: '5px', overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#00b894', borderRadius: '5px' },
  progresoSub: { fontSize: '12px', color: '#b2bec3', marginTop: '6px' },
  etapasTitulo: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', marginBottom: '16px' },
  etapaRow: { display: 'flex', gap: '14px', marginBottom: '12px', alignItems: 'flex-start' },
  etapaNum: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1a1a2e', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  etapaInfo: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 14px' },
  etapaTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  etapaNombre: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  estadoBadge: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  etapaDesc: { fontSize: '13px', color: '#636e72', marginTop: '4px' },
  etapaFecha: { fontSize: '12px', color: '#00b894', marginTop: '4px' },
  footer: { marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #f0f2f5', fontSize: '11px', color: '#b2bec3', textAlign: 'center', lineHeight: '1.6' },
}