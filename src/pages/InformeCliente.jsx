import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { CheckCircle, Download, Calendar } from 'lucide-react'
import html2pdf from 'html2pdf.js'

const statusLabel = {
  activo: 'Activo',
  en_proceso: 'En trámite',
  audiencia: 'En etapa de audiencia',
  cerrado: 'Cerrado',
  ganado: 'Favorable',
  perdido: 'Cerrado',
}

function nombreCompleto(u) {
  if (!u) return null
  return `${u.nombre || ''} ${u.apellido || ''}`.trim() || null
}

export default function InformeCliente({ casoId, onClose }) {
  const [caso, setCaso] = useState(null)
  const [etapas, setEtapas] = useState([])
  const [actuaciones, setActuaciones] = useState([])
  const [proximaAudiencia, setProximaAudiencia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generandoPdf, setGenerandoPdf] = useState(false)

  const fetchDatos = async () => {
    setLoading(true)
    const ahora = new Date().toISOString()

    let casoData = null
    const full = await supabase
      .from('cases')
      .select('*, clients(nombre, apellido), users!abogado_id(nombre, apellido), juzgados(nombre, ciudad)')
      .eq('id', casoId)
      .single()

    if (full.error) {
      const fallback = await supabase
        .from('cases')
        .select('*, clients(nombre, apellido)')
        .eq('id', casoId)
        .single()
      casoData = fallback.data
    } else {
      casoData = full.data
    }

    const [{ data: etapasData }, { data: eventosData }, { data: auds }] = await Promise.all([
      supabase
        .from('case_stages')
        .select('*')
        .eq('case_id', casoId)
        .order('orden', { ascending: true }),
      supabase
        .from('events')
        .select('id, descripcion, tipo, creado_en')
        .eq('case_id', casoId)
        .order('creado_en', { ascending: false })
        .limit(6),
      supabase
        .from('audiencias')
        .select('id, titulo, fecha_hora, lugar, estado')
        .eq('case_id', casoId)
        .gte('fecha_hora', ahora)
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
        .limit(1),
    ])

    setCaso(casoData)
    setEtapas(etapasData || [])
    setActuaciones(eventosData || [])
    setProximaAudiencia(auds?.[0] || null)
    setLoading(false)
  }

  useEffect(() => {
    if (casoId) fetchDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoId])

  const resumen = useMemo(() => {
    const completadas = etapas.filter(e => e.estado === 'completado')
    const enCurso = etapas.find(e => e.estado === 'en_proceso')
    const omitidas = etapas.filter(e => e.estado === 'omitido').length
    const relevantes = etapas.length - omitidas
    const progreso = relevantes > 0
      ? Math.round((completadas.length / relevantes) * 100)
      : 0

    let situacion = 'El proceso se encuentra en gestión inicial por el despacho.'
    if (['cerrado', 'ganado', 'perdido'].includes(caso?.status)) {
      situacion = caso.status === 'ganado'
        ? 'El proceso culminó con resultado favorable.'
        : 'El proceso se encuentra cerrado.'
    } else if (enCurso) {
      situacion = `El proceso se encuentra actualmente en: ${enCurso.nombre}.`
    } else if (completadas.length > 0) {
      const ultima = completadas[completadas.length - 1]
      situacion = `La etapa más reciente culminada es: ${ultima.nombre}. El despacho continúa con el trámite correspondiente.`
    }

    return { completadas, enCurso, progreso, situacion }
  }, [etapas, caso?.status])

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p style={styles.loading}>Preparando informe...</p>
        </div>
      </div>
    )
  }

  if (!caso) return null

  const cliente = caso.clients
  const abogado = nombreCompleto(caso.users)
  const juzgado = caso.juzgados?.nombre
    ? `${caso.juzgados.nombre}${caso.juzgados.ciudad ? ` (${caso.juzgados.ciudad})` : ''}`
    : null

  const descargarPdf = async () => {
    const fuente = document.getElementById('informe-cliente-contenido')
    if (!fuente || generandoPdf) return

    setGenerandoPdf(true)
    try {
      const clone = fuente.cloneNode(true)
      clone.querySelectorAll('.no-print, .pdf-omit').forEach((el) => el.remove())
      clone.querySelectorAll('.print-only').forEach((el) => {
        el.style.display = 'block'
      })
      clone.style.maxHeight = 'none'
      clone.style.overflow = 'visible'
      clone.style.boxShadow = 'none'
      clone.style.borderRadius = '0'
      clone.style.width = '720px'
      clone.style.padding = '28px'
      clone.style.background = '#fff'
      clone.style.margin = '0'

      const wrap = document.createElement('div')
      wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;background:#fff;z-index:-1;'
      wrap.appendChild(clone)
      document.body.appendChild(wrap)

      const clienteNombre = cliente
        ? `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()
        : 'Cliente'
      const archivo = `Informe_${clienteNombre.replace(/[^\wáéíóúñÁÉÍÓÚÑ\s-]/gi, '').trim().replace(/\s+/g, '_') || 'cliente'}.pdf`

      const fechaGen = new Date().toLocaleString('es-CO')
      const pie1 = `Informe generado el ${fechaGen} — SAR Consultores Integrales`
      const pie2 = 'Documento confidencial. Uso exclusivo del cliente y del despacho.'

      const worker = html2pdf()
        .set({
          margin: [12, 12, 22, 12],
          filename: archivo,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.timeline-item-print', '.bloque-print', '.act-row-print', '.aud-box-print'] },
        })
        .from(clone)

      const pdf = await worker.toPdf().get('pdf')
      const total = pdf.internal.getNumberOfPages()
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      for (let i = 1; i <= total; i++) {
        pdf.setPage(i)
        pdf.setDrawColor(210, 210, 210)
        pdf.setLineWidth(0.25)
        pdf.line(12, pageH - 16, pageW - 12, pageH - 16)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor(99, 110, 114)
        pdf.text(pie1, pageW / 2, pageH - 11, { align: 'center' })
        pdf.text(pie2, pageW / 2, pageH - 6.5, { align: 'center' })
        pdf.setFontSize(7)
        pdf.setTextColor(150, 150, 150)
        pdf.text(`${i} / ${total}`, pageW - 12, pageH - 6.5, { align: 'right' })
      }

      await worker.save()
      document.body.removeChild(wrap)
    } catch (e) {
      alert('No se pudo generar el PDF: ' + (e.message || e))
    } finally {
      setGenerandoPdf(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="informe-cliente-print" id="informe-cliente-contenido">
        <div style={styles.header} className="no-print">
          <div>
            <h2 style={styles.titulo}>SAR Consultores Integrales</h2>
            <p style={styles.subtitulo}>Informe de avance del proceso</p>
          </div>
          <div style={styles.headerBtns}>
            <button
              style={{ ...styles.btnImprimir, opacity: generandoPdf ? 0.7 : 1 }}
              onClick={descargarPdf}
              disabled={generandoPdf}
              title="Descarga el informe en PDF sin encabezados del navegador."
            >
              <Download size={16} /> {generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <button style={styles.btnCerrar} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={styles.printHeader} className="print-only">
          <p style={styles.printBrand}>SAR Consultores Integrales</p>
          <h2 style={styles.titulo}>Informe de avance del proceso</h2>
          <p style={styles.subtitulo}>Documento confidencial para el cliente</p>
        </div>

        <div style={styles.infoCaso} className="bloque-print">
          <div style={styles.infoGrid}>
            <div>
              <p style={styles.infoLabel}>Cliente</p>
              <p style={styles.infoValor}>
                {cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : '—'}
              </p>
            </div>
            <div>
              <p style={styles.infoLabel}>Asunto</p>
              <p style={styles.infoValor}>{caso.titulo}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Radicado</p>
              <p style={styles.infoValor}>{caso.numero_radicado || 'En trámite'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Ciudad</p>
              <p style={styles.infoValor}>{caso.ciudad || caso.juzgados?.ciudad || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Estado del caso</p>
              <p style={styles.infoValor}>{statusLabel[caso.status] || caso.status || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Fecha de apertura</p>
              <p style={styles.infoValor}>
                {caso.fecha_apertura
                  ? new Date(caso.fecha_apertura).toLocaleDateString('es-CO')
                  : '—'}
              </p>
            </div>
            {abogado && (
              <div>
                <p style={styles.infoLabel}>Abogado a cargo</p>
                <p style={styles.infoValor}>{abogado}</p>
              </div>
            )}
            {juzgado && (
              <div>
                <p style={styles.infoLabel}>Despacho judicial</p>
                <p style={styles.infoValor}>{juzgado}</p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.situacionBox} className="bloque-print">
          <p style={styles.situacionLabel}>Situación actual</p>
          <p style={styles.situacionTexto}>{resumen.situacion}</p>
          {resumen.enCurso && !['cerrado', 'ganado', 'perdido'].includes(caso.status) && (
            <p style={styles.situacionHint}>
              Esta es la etapa en la que se encuentra el proceso en este momento.
            </p>
          )}
        </div>

        <div style={styles.progresoBox} className="bloque-print">
          <div style={styles.progresoHeader}>
            <span style={styles.progresoLabel}>Avance del proceso</span>
            <span style={styles.progresoNum}>{resumen.progreso}%</span>
          </div>
          <div style={styles.progresoBar}>
            <div style={{ ...styles.progresoFill, width: `${resumen.progreso}%` }} />
          </div>
          <p style={styles.progresoSub}>
            {resumen.progreso === 0
              ? 'El proceso ha iniciado y se encuentra en gestión por el despacho.'
              : resumen.progreso === 100
                ? 'Se han culminado las etapas previstas del proceso.'
                : 'Indicador del avance logrado hasta la fecha.'}
          </p>
        </div>

        <h3 style={styles.sectionTitle}>Lo realizado hasta ahora</h3>
        {resumen.completadas.length === 0 && !resumen.enCurso ? (
          <p style={styles.empty}>
            El proceso fue aperturado. A medida que avancen las gestiones, aquí se reflejarán los hitos cumplidos.
          </p>
        ) : (
          <div style={styles.timeline}>
            {resumen.completadas.map((etapa) => (
              <div key={etapa.id} style={styles.timelineItem} className="timeline-item-print">
                <div style={styles.timelineIcon}>
                  <CheckCircle size={18} color="#00b894" />
                </div>
                <div style={styles.timelineBody}>
                  <p style={styles.timelineNombre}>{etapa.nombre}</p>
                  {etapa.fecha_completado && (
                    <p style={styles.timelineFecha}>
                      Culminado el {new Date(etapa.fecha_completado).toLocaleDateString('es-CO')}
                    </p>
                  )}
                  {etapa.notas?.trim() && (
                    <p style={styles.timelineNotas}>{etapa.notas.trim()}</p>
                  )}
                </div>
              </div>
            ))}
            {resumen.enCurso && (
              <div style={styles.timelineItem} className="timeline-item-print">
                <div style={{ ...styles.timelineIcon, backgroundColor: '#c9a84c18' }}>
                  <div style={styles.puntoActual} />
                </div>
                <div style={styles.timelineBody}>
                  <p style={styles.timelineNombre}>{resumen.enCurso.nombre}</p>
                  <p style={styles.badgeActual}>En curso</p>
                  {resumen.enCurso.notas?.trim() && (
                    <p style={styles.timelineNotas}>{resumen.enCurso.notas.trim()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {actuaciones.length > 0 && (
          <>
            <h3 style={styles.sectionTitle}>Actuaciones recientes</h3>
            <div style={styles.actList}>
              {actuaciones.map((a) => (
                <div key={a.id} style={styles.actRow} className="act-row-print">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.actDesc}>{a.descripcion}</p>
                    {a.tipo && a.tipo !== 'otro' && (
                      <p style={styles.actTipo}>{a.tipo.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                  <span style={styles.actFecha}>
                    {new Date(a.creado_en).toLocaleDateString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {proximaAudiencia && (
          <>
            <h3 style={styles.sectionTitle}>Próxima audiencia</h3>
            <div style={styles.audBox} className="aud-box-print">
              <Calendar size={18} color="#6c5ce7" />
              <div style={{ flex: 1 }}>
                <p style={styles.audTitulo}>{proximaAudiencia.titulo}</p>
                <p style={styles.audMeta}>
                  {new Date(proximaAudiencia.fecha_hora).toLocaleString('es-CO', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                  {proximaAudiencia.lugar ? ` · ${proximaAudiencia.lugar}` : ''}
                </p>
              </div>
            </div>
          </>
        )}

        <div style={styles.footer} className="pdf-omit">
          <p>Informe generado el {new Date().toLocaleString('es-CO')} — SAR Consultores Integrales</p>
          <p>Documento confidencial. Uso exclusivo del cliente y del despacho.</p>
        </div>
      </div>

      <style>{`
        .print-only { display: none; }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 300, padding: '20px',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '16px', padding: '32px',
    width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto',
  },
  loading: { textAlign: 'center', color: '#b2bec3', padding: '40px' },
  empty: { color: '#8a94a6', fontSize: '13px', lineHeight: 1.5, margin: '0 0 8px' },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #1a1a2e',
    gap: '12px', flexWrap: 'wrap',
  },
  printHeader: {
    marginBottom: '20px', paddingBottom: '14px', borderBottom: '2px solid #1a1a2e',
  },
  printBrand: {
    margin: '0 0 6px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#c9a84c',
  },
  titulo: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subtitulo: { fontSize: '13px', color: '#636e72', marginTop: '4px' },
  headerBtns: { display: 'flex', gap: '10px', alignItems: 'center' },
  btnImprimir: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none',
    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 600, fontSize: '13px',
  },
  btnCerrar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#636e72' },

  infoCaso: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', marginBottom: '18px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' },
  infoLabel: { fontSize: '11px', color: '#8a94a6', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.03em' },
  infoValor: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e', margin: 0 },

  situacionBox: {
    backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '18px 20px', marginBottom: '18px',
  },
  situacionLabel: {
    fontSize: '11px', color: '#c9a84c', textTransform: 'uppercase',
    letterSpacing: '0.05em', fontWeight: 700, margin: '0 0 8px',
  },
  situacionTexto: { fontSize: '15px', color: '#fff', fontWeight: 600, margin: 0, lineHeight: 1.45 },
  situacionHint: { fontSize: '12px', color: '#a0aec0', margin: '8px 0 0' },

  progresoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '22px' },
  progresoHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  progresoLabel: { fontSize: '13px', color: '#636e72', fontWeight: 600 },
  progresoNum: { fontSize: '13px', fontWeight: 700, color: '#1a1a2e' },
  progresoBar: { height: '10px', backgroundColor: '#dfe6e9', borderRadius: '5px', overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#00b894', borderRadius: '5px' },
  progresoSub: { fontSize: '12px', color: '#8a94a6', marginTop: '6px', marginBottom: 0 },

  sectionTitle: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 14px' },

  timeline: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' },
  timelineItem: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  timelineIcon: {
    width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#00b89418',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  puntoActual: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#c9a84c' },
  timelineBody: {
    flex: 1, backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '12px 14px',
  },
  timelineNombre: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e', margin: 0 },
  timelineFecha: { fontSize: '12px', color: '#00b894', margin: '4px 0 0' },
  timelineNotas: { fontSize: '13px', color: '#636e72', margin: '6px 0 0', lineHeight: 1.4 },
  badgeActual: {
    display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 700,
    color: '#c9a84c', backgroundColor: '#c9a84c20', padding: '2px 8px', borderRadius: '10px',
  },

  actList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' },
  actRow: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    padding: '11px 13px', backgroundColor: '#f8f9fa', borderRadius: '8px',
  },
  actDesc: { margin: 0, fontSize: '13px', color: '#1a1a2e', fontWeight: 500 },
  actTipo: { margin: '3px 0 0', fontSize: '11px', color: '#8a94a6', textTransform: 'capitalize' },
  actFecha: { fontSize: '12px', color: '#8a94a6', whiteSpace: 'nowrap' },

  audBox: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    padding: '14px 16px', backgroundColor: '#6c5ce712', borderRadius: '10px',
    marginBottom: '8px',
  },
  audTitulo: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  audMeta: { margin: '4px 0 0', fontSize: '12px', color: '#636e72', lineHeight: 1.4 },

  footer: {
    marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #f0f2f5',
    fontSize: '11px', color: '#b2bec3', textAlign: 'center', lineHeight: 1.6,
  },
}
