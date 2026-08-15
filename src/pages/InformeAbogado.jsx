import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { Download } from 'lucide-react'

const statusColor = {
  activo: '#0984e3',
  en_proceso: '#c9a84c',
  audiencia: '#6c5ce7',
  cerrado: '#636e72',
  ganado: '#00b894',
  perdido: '#d63031',
}

function inicioPeriodo(clave) {
  const ahora = new Date()
  if (clave === 'todo') return null
  const d = new Date(ahora)
  if (clave === 'mes') d.setMonth(d.getMonth() - 1)
  else if (clave === 'trimestre') d.setMonth(d.getMonth() - 3)
  else if (clave === 'anio') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString()
}

function etiquetaPeriodo(clave) {
  if (clave === 'mes') return 'Último mes'
  if (clave === 'trimestre') return 'Último trimestre'
  if (clave === 'anio') return 'Último año'
  return 'Todo el historial'
}

export default function InformeAbogado({ abogado, generadoPor, onClose }) {
  const [periodo, setPeriodo] = useState('mes')
  const [casos, setCasos] = useState([])
  const [progresoPorCaso, setProgresoPorCaso] = useState({})
  const [audienciasProx, setAudienciasProx] = useState([])
  const [actividad, setActividad] = useState({ eventos: 0, documentos: 0, tareasHechas: 0, tareasPend: 0 })
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (abogado?.id) fetchDatos()
  }, [abogado?.id, periodo])

  const fetchDatos = async () => {
    setLoading(true)
    const desde = inicioPeriodo(periodo)

    // Cartera actual: todos los casos asignados al abogado
    const { data: casosData } = await supabase
      .from('cases')
      .select('id, titulo, numero_radicado, ciudad, status, creado_en, fecha_apertura, clients(nombre, apellido)')
      .eq('abogado_id', abogado.id)
      .order('creado_en', { ascending: false })

    const lista = casosData || []
    setCasos(lista)

    const ids = lista.map(c => c.id)
    const progreso = {}

    if (ids.length > 0) {
      const { data: etapas } = await supabase
        .from('case_stages')
        .select('case_id, estado')
        .in('case_id', ids)

      for (const id of ids) {
        const et = (etapas || []).filter(e => e.case_id === id)
        const done = et.filter(e => e.estado === 'completado').length
        progreso[id] = et.length ? Math.round((done / et.length) * 100) : 0
      }

      const ahora = new Date()
      const hasta = new Date()
      hasta.setDate(hasta.getDate() + 15)

      const { data: auds } = await supabase
        .from('audiencias')
        .select('id, titulo, fecha_hora, estado, case_id, cases(titulo)')
        .in('case_id', ids)
        .gte('fecha_hora', ahora.toISOString())
        .lte('fecha_hora', hasta.toISOString())
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
        .limit(10)
      setAudienciasProx(auds || [])

      let qEvt = supabase.from('events').select('id', { count: 'exact', head: true }).in('case_id', ids)
      let qDoc = supabase.from('documents').select('id', { count: 'exact', head: true }).in('case_id', ids)
      let qTarOk = supabase.from('tasks').select('id', { count: 'exact', head: true }).in('case_id', ids).eq('completado', true)
      let qTarPend = supabase.from('tasks').select('id', { count: 'exact', head: true }).in('case_id', ids).eq('completado', false)
      if (desde) {
        qEvt = qEvt.gte('creado_en', desde)
        qDoc = qDoc.gte('creado_en', desde)
      }
      const [evt, doc, tarOk, tarPend] = await Promise.all([qEvt, qDoc, qTarOk, qTarPend])
      setActividad({
        eventos: evt.count || 0,
        documentos: doc.count || 0,
        tareasHechas: tarOk.count || 0,
        tareasPend: tarPend.count || 0,
      })
    } else {
      setAudienciasProx([])
      setActividad({ eventos: 0, documentos: 0, tareasHechas: 0, tareasPend: 0 })
    }

    setProgresoPorCaso(progreso)
    setLoading(false)
  }

  const resumen = useMemo(() => {
    const porEstado = {}
    const porCiudad = {}
    for (const c of casos) {
      const st = c.status || 'sin_estado'
      porEstado[st] = (porEstado[st] || 0) + 1
      const ciu = c.ciudad?.trim() || 'Sin ciudad'
      porCiudad[ciu] = (porCiudad[ciu] || 0) + 1
    }
    const abiertos = casos.filter(c => !['cerrado', 'ganado', 'perdido'].includes(c.status)).length
    const atrasados = casos.filter(c => {
      if (['cerrado', 'ganado', 'perdido'].includes(c.status)) return false
      return (progresoPorCaso[c.id] || 0) < 30
    }).length
    return { porEstado, porCiudad, abiertos, atrasados, total: casos.length }
  }, [casos, progresoPorCaso])

  const ciudadesTop = Object.entries(resumen.porCiudad)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const nombreAbogado = `${abogado?.nombre || ''} ${abogado?.apellido || ''}`.trim()
  const generado = generadoPor
    ? `${generadoPor.nombre || ''} ${generadoPor.apellido || ''}`.trim()
    : 'Despacho SAR'

  if (!abogado) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="informe-abogado-print">
        <div style={styles.header} className="no-print">
          <div>
            <h2 style={styles.titulo}>SAR Consultores Integrales</h2>
            <p style={styles.subtitulo}>Informe de gestión por abogado</p>
          </div>
          <div style={styles.headerBtns}>
            <select style={styles.select} value={periodo} onChange={e => setPeriodo(e.target.value)}>
              <option value="mes">Último mes</option>
              <option value="trimestre">Último trimestre</option>
              <option value="anio">Último año</option>
              <option value="todo">Todo el historial</option>
            </select>
            <button style={styles.btnImprimir} onClick={() => window.print()}>
              <Download size={16} /> Imprimir / PDF
            </button>
            <button style={styles.btnCerrar} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={styles.printOnlyHeader} className="print-only">
          <h2 style={styles.titulo}>SAR Consultores Integrales</h2>
          <p style={styles.subtitulo}>Informe de gestión por abogado</p>
        </div>

        <div style={styles.infoBox}>
          <div style={styles.infoGrid}>
            <div>
              <p style={styles.infoLabel}>Abogado</p>
              <p style={styles.infoValor}>{nombreAbogado || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Rol</p>
              <p style={styles.infoValor}>{abogado.rol || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Estado acceso</p>
              <p style={styles.infoValor}>{abogado.activo === false ? 'Inactivo' : 'Activo'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Periodo</p>
              <p style={styles.infoValor}>{etiquetaPeriodo(periodo)}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Generado por</p>
              <p style={styles.infoValor}>{generado || '—'}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Fecha</p>
              <p style={styles.infoValor}>{new Date().toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#b2bec3', textAlign: 'center', padding: '40px' }}>Cargando informe...</p>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Casos asignados</p>
                <p style={styles.statValue}>{resumen.total}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Abiertos</p>
                <p style={{ ...styles.statValue, color: '#0984e3' }}>{resumen.abiertos}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Ganados</p>
                <p style={{ ...styles.statValue, color: '#00b894' }}>{resumen.porEstado.ganado || 0}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Bajo avance (&lt;30%)</p>
                <p style={{ ...styles.statValue, color: '#d63031' }}>{resumen.atrasados}</p>
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Por estado</h3>
            <div style={styles.chips}>
              {Object.keys(resumen.porEstado).length === 0 ? (
                <span style={{ color: '#b2bec3', fontSize: '13px' }}>Sin casos en este periodo</span>
              ) : (
                Object.entries(resumen.porEstado).map(([st, n]) => (
                  <span
                    key={st}
                    style={{
                      ...styles.chip,
                      backgroundColor: (statusColor[st] || '#636e72') + '18',
                      color: statusColor[st] || '#636e72',
                    }}
                  >
                    {st.replace('_', ' ')}: {n}
                  </span>
                ))
              )}
            </div>

            <h3 style={styles.sectionTitle}>Por ciudad</h3>
            {ciudadesTop.length === 0 ? (
              <p style={{ color: '#b2bec3', fontSize: '13px' }}>Sin datos</p>
            ) : (
              <div style={styles.ciudadList}>
                {ciudadesTop.map(([ciu, n]) => (
                  <div key={ciu} style={styles.ciudadRow}>
                    <span style={styles.ciudadNombre}>{ciu}</span>
                    <div style={styles.ciudadBarTrack}>
                      <div
                        style={{
                          ...styles.ciudadBarFill,
                          width: `${Math.max(8, (n / resumen.total) * 100)}%`,
                        }}
                      />
                    </div>
                    <span style={styles.ciudadNum}>{n}</span>
                  </div>
                ))}
              </div>
            )}

            <h3 style={styles.sectionTitle}>Actividad en el periodo</h3>
            <div style={styles.actGrid}>
              <div style={styles.actItem}><span style={styles.actNum}>{actividad.eventos}</span><span style={styles.actLabel}>Actuaciones</span></div>
              <div style={styles.actItem}><span style={styles.actNum}>{actividad.documentos}</span><span style={styles.actLabel}>Documentos</span></div>
              <div style={styles.actItem}><span style={styles.actNum}>{actividad.tareasHechas}</span><span style={styles.actLabel}>Tareas hechas</span></div>
              <div style={styles.actItem}><span style={styles.actNum}>{actividad.tareasPend}</span><span style={styles.actLabel}>Tareas pendientes</span></div>
            </div>

            <h3 style={styles.sectionTitle}>Audiencias próximas (15 días)</h3>
            {audienciasProx.length === 0 ? (
              <p style={{ color: '#b2bec3', fontSize: '13px', marginBottom: '16px' }}>No hay audiencias próximas</p>
            ) : (
              audienciasProx.map(a => (
                <div key={a.id} style={styles.casoRow}>
                  <div style={{ flex: 1 }}>
                    <p style={styles.casoTitulo}>{a.titulo}</p>
                    <p style={styles.casoMeta}>{a.cases?.titulo || 'Caso'}</p>
                  </div>
                  <span style={styles.casoMeta}>
                    {new Date(a.fecha_hora).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))
            )}

            <h3 style={styles.sectionTitle}>Casos asignados</h3>
            {casos.length === 0 ? (
              <p style={{ color: '#b2bec3', fontSize: '13px' }}>Sin casos asignados</p>
            ) : (
              casos.map(c => (
                <div key={c.id} style={styles.casoRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.casoTitulo}>{c.titulo}</p>
                    <p style={styles.casoMeta}>
                      {c.clients ? `${c.clients.nombre} ${c.clients.apellido || ''}` : 'Sin cliente'}
                      {c.numero_radicado ? ` · ${c.numero_radicado}` : ''}
                      {c.ciudad ? ` · ${c.ciudad}` : ''}
                    </p>
                    <div style={styles.miniBarTrack}>
                      <div style={{ ...styles.miniBarFill, width: `${progresoPorCaso[c.id] || 0}%` }} />
                    </div>
                    <p style={styles.casoMeta}>Avance etapas: {progresoPorCaso[c.id] || 0}%</p>
                  </div>
                  <span style={{
                    ...styles.chip,
                    backgroundColor: (statusColor[c.status] || '#636e72') + '18',
                    color: statusColor[c.status] || '#636e72',
                    alignSelf: 'flex-start',
                  }}>
                    {(c.status || '—').replace('_', ' ')}
                  </span>
                </div>
              ))
            )}

            <h3 style={styles.sectionTitle}>Observaciones del despacho</h3>
            <textarea
              className="no-print-border"
              style={styles.notas}
              placeholder="Notas internas: priorizar, reasignar, seguimiento..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
            />
            {notas.trim() && (
              <p className="print-only" style={{ fontSize: '13px', color: '#2d3436', whiteSpace: 'pre-wrap' }}>{notas}</p>
            )}

            <div style={styles.footer}>
              <p>Informe interno — {new Date().toLocaleString('es-CO')} — SAR Consultores Integrales</p>
              <p>Documento confidencial. Uso exclusivo del despacho.</p>
            </div>
          </>
        )}
      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .informe-abogado-print, .informe-abogado-print * { visibility: visible !important; }
          .informe-abogado-print {
            position: absolute !important;
            left: 0; top: 0; width: 100%;
            max-height: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 12px !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .no-print-border { border: none !important; }
        }
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
    backgroundColor: '#fff', borderRadius: '16px', padding: '28px',
    width: '100%', maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #1a1a2e',
    gap: '12px', flexWrap: 'wrap',
  },
  printOnlyHeader: { marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #1a1a2e' },
  titulo: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  subtitulo: { fontSize: '13px', color: '#636e72', marginTop: '4px' },
  headerBtns: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  select: {
    padding: '8px 10px', borderRadius: '8px', border: '1px solid #dfe6e9',
    fontSize: '13px', outline: 'none', background: '#fff',
  },
  btnImprimir: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none',
    padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
    fontWeight: '600', fontSize: '13px',
  },
  btnCerrar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#636e72' },
  infoBox: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '18px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  infoLabel: { fontSize: '11px', color: '#b2bec3', textTransform: 'uppercase', marginBottom: '4px' },
  infoValor: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e', textTransform: 'capitalize', margin: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  statCard: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '14px', border: '1px solid #eef0f3' },
  statLabel: { fontSize: '11px', color: '#8b949e', margin: 0, fontWeight: 600, textTransform: 'uppercase' },
  statValue: { fontSize: '26px', fontWeight: 700, color: '#1a1a2e', margin: '6px 0 0' },
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e', margin: '18px 0 10px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' },
  chip: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' },
  ciudadList: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' },
  ciudadRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  ciudadNombre: { width: '120px', fontSize: '13px', color: '#2d3436', flexShrink: 0 },
  ciudadBarTrack: { flex: 1, height: '8px', backgroundColor: '#eef0f3', borderRadius: '4px', overflow: 'hidden' },
  ciudadBarFill: { height: '100%', backgroundColor: '#c9a84c', borderRadius: '4px' },
  ciudadNum: { width: '28px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#1a1a2e' },
  actGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '8px' },
  actItem: { background: '#f8f9fa', borderRadius: '10px', padding: '12px', textAlign: 'center' },
  actNum: { display: 'block', fontSize: '22px', fontWeight: 700, color: '#1a1a2e' },
  actLabel: { fontSize: '11px', color: '#8b949e', fontWeight: 600 },
  casoRow: {
    display: 'flex', gap: '12px', alignItems: 'flex-start',
    background: '#f8f9fa', borderRadius: '10px', padding: '12px 14px',
    marginBottom: '8px', border: '1px solid #eef0f3',
  },
  casoTitulo: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e', margin: 0 },
  casoMeta: { fontSize: '12px', color: '#636e72', margin: '4px 0 0' },
  miniBarTrack: { height: '6px', background: '#dfe6e9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' },
  miniBarFill: { height: '100%', background: '#00b894', borderRadius: '3px' },
  notas: {
    width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px',
    border: '1px solid #dfe6e9', fontSize: '13px', resize: 'vertical', outline: 'none',
    fontFamily: 'inherit',
  },
  footer: {
    marginTop: '28px', paddingTop: '14px', borderTop: '1px solid #f0f2f5',
    fontSize: '11px', color: '#b2bec3', textAlign: 'center', lineHeight: 1.6,
  },
}
