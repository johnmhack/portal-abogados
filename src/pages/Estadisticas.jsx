import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { Briefcase, TrendingUp, Calendar, Target, Download, Users, Printer } from 'lucide-react'

const ESTADOS_CERRADOS = ['cerrado', 'ganado', 'perdido']

const statusColor = {
  activo: '#0984e3',
  en_proceso: '#c9a84c',
  audiencia: '#6c5ce7',
  cerrado: '#636e72',
  ganado: '#00b894',
  perdido: '#d63031',
}

const PERIODOS = [
  { id: 'mes', label: 'Último mes' },
  { id: 'trimestre', label: 'Último trimestre' },
  { id: 'anio', label: 'Último año' },
  { id: 'todo', label: 'Todo el historial' },
]

function inicioPeriodo(clave) {
  if (clave === 'todo') return null
  const d = new Date()
  if (clave === 'mes') d.setMonth(d.getMonth() - 1)
  else if (clave === 'trimestre') d.setMonth(d.getMonth() - 3)
  else if (clave === 'anio') d.setFullYear(d.getFullYear() - 1)
  return d
}

const etiqueta = (st) => (st || 'sin estado').replace(/_/g, ' ')
const nombreCompleto = (u) => `${u?.nombre || ''} ${u?.apellido || ''}`.trim()

function Donut({ data, total }) {
  const radio = 62
  const grosor = 20
  const circunferencia = 2 * Math.PI * radio
  let acumulado = 0

  return (
    <div style={styles.donutWrap}>
      <div style={styles.donutBox}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radio} fill="none" stroke="#f0f2f5" strokeWidth={grosor} />
          {total > 0 && data.map(([st, n]) => {
            const fraccion = n / total
            const dash = fraccion * circunferencia
            const offset = acumulado * circunferencia
            acumulado += fraccion
            return (
              <circle
                key={st}
                cx="80"
                cy="80"
                r={radio}
                fill="none"
                stroke={statusColor[st] || '#636e72'}
                strokeWidth={grosor}
                strokeDasharray={`${dash} ${circunferencia - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
                strokeLinecap="butt"
              />
            )
          })}
        </svg>
        <div style={styles.donutCentro}>
          <span style={styles.donutNum}>{total}</span>
          <span style={styles.donutLabel}>casos</span>
        </div>
      </div>

      <div style={styles.leyenda}>
        {data.length === 0 ? (
          <p style={styles.empty}>Sin datos en el periodo</p>
        ) : data.map(([st, n]) => (
          <div key={st} style={styles.leyendaFila}>
            <span style={{ ...styles.punto, backgroundColor: statusColor[st] || '#636e72' }} />
            <span style={styles.leyendaNombre}>{etiqueta(st)}</span>
            <span style={styles.leyendaValor}>
              {n} <span style={styles.leyendaPct}>({total ? Math.round((n / total) * 100) : 0}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarrasVerticales({ series }) {
  const tope = Math.max(...series.map(s => s.valor), 1)
  return (
    <div style={styles.vbarWrap}>
      {series.map(s => (
        <div key={s.label} style={styles.vbarCol}>
          <span style={styles.vbarNum}>{s.valor || ''}</span>
          <div style={styles.vbarTrack}>
            <div style={{ ...styles.vbarFill, height: `${(s.valor / tope) * 100}%` }} />
          </div>
          <span style={styles.vbarLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function BarrasHorizontales({ items, color }) {
  if (!items.length) return <p style={styles.empty}>Sin datos</p>
  const tope = Math.max(...items.map(([, n]) => n), 1)
  return (
    <div style={styles.hbarList}>
      {items.map(([label, n]) => (
        <div key={label} style={styles.hbarRow}>
          <span style={styles.hbarLabel} title={label}>{label}</span>
          <div style={styles.hbarTrack}>
            <div style={{ ...styles.hbarFill, width: `${Math.max(4, (n / tope) * 100)}%`, backgroundColor: color }} />
          </div>
          <span style={styles.hbarNum}>{n}</span>
        </div>
      ))}
    </div>
  )
}

export default function Estadisticas() {
  const [periodo, setPeriodo] = useState('anio')
  const [abogadoId, setAbogadoId] = useState('')
  const [casos, setCasos] = useState([])
  const [abogados, setAbogados] = useState([])
  const [avancePorCaso, setAvancePorCaso] = useState({})
  const [audiencias, setAudiencias] = useState([])
  const [clientes, setClientes] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchDatos = async () => {
    setLoading(true)
    const desde = inicioPeriodo(periodo)
    const ahora = new Date()
    const hasta = new Date()
    hasta.setDate(hasta.getDate() + 30)

    let qCasos = supabase
      .from('cases')
      .select('id, titulo, ciudad, status, creado_en, abogado_id, users!abogado_id(id, nombre, apellido)')
      .order('creado_en', { ascending: false })
    if (desde) qCasos = qCasos.gte('creado_en', desde.toISOString())

    const [{ data: casosData }, { data: equipo }, { count: totalClientes }, { data: auds }] = await Promise.all([
      qCasos,
      supabase.from('users').select('id, nombre, apellido, rol').in('rol', ['abogado', 'socio']).order('nombre'),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase
        .from('audiencias')
        .select('id, titulo, fecha_hora, estado, cases(titulo, abogado_id)')
        .gte('fecha_hora', ahora.toISOString())
        .lte('fecha_hora', hasta.toISOString())
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
        .limit(50),
    ])

    const lista = casosData || []
    setCasos(lista)
    setAbogados(equipo || [])
    setClientes(totalClientes || 0)
    setAudiencias(auds || [])

    const ids = lista.map(c => c.id)
    const avance = {}
    if (ids.length > 0) {
      const { data: etapas } = await supabase
        .from('case_stages')
        .select('case_id, estado')
        .in('case_id', ids)
      const agrupado = {}
      for (const e of etapas || []) {
        agrupado[e.case_id] = agrupado[e.case_id] || { total: 0, hechas: 0 }
        agrupado[e.case_id].total += 1
        if (e.estado === 'completado') agrupado[e.case_id].hechas += 1
      }
      for (const id of ids) {
        const g = agrupado[id]
        avance[id] = g && g.total ? Math.round((g.hechas / g.total) * 100) : 0
      }
    }
    setAvancePorCaso(avance)
    setLoading(false)
  }

  useEffect(() => {
    fetchDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const casosFiltrados = useMemo(
    () => (abogadoId ? casos.filter(c => c.abogado_id === abogadoId) : casos),
    [casos, abogadoId]
  )

  const audienciasFiltradas = useMemo(
    () => (abogadoId ? audiencias.filter(a => a.cases?.abogado_id === abogadoId) : audiencias),
    [audiencias, abogadoId]
  )

  const resumen = useMemo(() => {
    const porEstado = {}
    const porCiudad = {}
    for (const c of casosFiltrados) {
      const st = c.status || 'sin_estado'
      porEstado[st] = (porEstado[st] || 0) + 1
      const ciu = c.ciudad?.trim() || 'Sin ciudad'
      porCiudad[ciu] = (porCiudad[ciu] || 0) + 1
    }

    const total = casosFiltrados.length
    const abiertos = casosFiltrados.filter(c => !ESTADOS_CERRADOS.includes(c.status))
    const ganados = porEstado.ganado || 0
    const perdidos = porEstado.perdido || 0
    const resueltos = ganados + perdidos
    const exito = resueltos ? Math.round((ganados / resueltos) * 100) : 0
    const avanceMedio = abiertos.length
      ? Math.round(abiertos.reduce((sum, c) => sum + (avancePorCaso[c.id] || 0), 0) / abiertos.length)
      : 0

    const ordenEstados = Object.keys(statusColor)
    const estadosOrdenados = Object.entries(porEstado).sort(
      (a, b) => ordenEstados.indexOf(a[0]) - ordenEstados.indexOf(b[0])
    )

    return {
      total,
      abiertos: abiertos.length,
      ganados,
      perdidos,
      exito,
      avanceMedio,
      porEstado: estadosOrdenados,
      porCiudad: Object.entries(porCiudad).sort((a, b) => b[1] - a[1]).slice(0, 8),
    }
  }, [casosFiltrados, avancePorCaso])

  const tablaAbogados = useMemo(() => {
    const mapa = new Map()
    for (const c of casosFiltrados) {
      const key = c.abogado_id || 'sin'
      if (!mapa.has(key)) {
        mapa.set(key, {
          nombre: c.users ? nombreCompleto(c.users) || 'Sin nombre' : 'Sin asignar',
          total: 0, abiertos: 0, ganados: 0, perdidos: 0, sumaAvance: 0,
        })
      }
      const fila = mapa.get(key)
      fila.total += 1
      if (ESTADOS_CERRADOS.includes(c.status)) {
        if (c.status === 'ganado') fila.ganados += 1
        if (c.status === 'perdido') fila.perdidos += 1
      } else {
        fila.abiertos += 1
        fila.sumaAvance += avancePorCaso[c.id] || 0
      }
    }
    return [...mapa.values()]
      .map(f => ({
        ...f,
        avance: f.abiertos ? Math.round(f.sumaAvance / f.abiertos) : 0,
        exito: f.ganados + f.perdidos ? Math.round((f.ganados / (f.ganados + f.perdidos)) * 100) : null,
      }))
      .sort((a, b) => b.total - a.total)
  }, [casosFiltrados, avancePorCaso])

  const tendencia = useMemo(() => {
    const meses = []
    const base = new Date()
    base.setDate(1)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(base)
      d.setMonth(d.getMonth() - i)
      meses.push({
        clave: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
        valor: 0,
      })
    }
    const indice = new Map(meses.map((m, i) => [m.clave, i]))
    for (const c of casosFiltrados) {
      if (!c.creado_en) continue
      const d = new Date(c.creado_en)
      const i = indice.get(`${d.getFullYear()}-${d.getMonth()}`)
      if (i !== undefined) meses[i].valor += 1
    }
    return meses
  }, [casosFiltrados])

  const exportarCSV = () => {
    const filas = [
      ['Abogado', 'Casos', 'Abiertos', 'Ganados', 'Perdidos', 'Éxito %', 'Avance promedio %'],
      ...tablaAbogados.map(f => [
        f.nombre, f.total, f.abiertos, f.ganados, f.perdidos,
        f.exito === null ? '' : f.exito, f.avance,
      ]),
    ]
    const csv = filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `estadisticas-sar-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const kpis = [
    { label: 'Casos en el periodo', value: resumen.total, hint: `${resumen.abiertos} abiertos`, icon: Briefcase, color: '#0984e3' },
    { label: 'Tasa de éxito', value: `${resumen.exito}%`, hint: `${resumen.ganados} ganados · ${resumen.perdidos} perdidos`, icon: Target, color: '#00b894' },
    { label: 'Avance promedio', value: `${resumen.avanceMedio}%`, hint: 'Etapas de casos abiertos', icon: TrendingUp, color: '#c9a84c' },
    { label: 'Audiencias 30 días', value: audienciasFiltradas.length, hint: 'Agenda confirmada', icon: Calendar, color: '#6c5ce7' },
    { label: 'Clientes', value: clientes, hint: 'Cartera total del despacho', icon: Users, color: '#2d6a4f' },
  ]

  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.label || ''
  const abogadoFiltro = abogadoId
    ? nombreCompleto(abogados.find(a => a.id === abogadoId)) || 'Abogado'
    : 'Todo el equipo'

  return (
    <div className="estadisticas-print">
      <div style={styles.toolbar} className="no-print">
        <div style={styles.filtros}>
          <div style={styles.campo}>
            <label style={styles.campoLabel}>Periodo</label>
            <select style={styles.select} value={periodo} onChange={e => setPeriodo(e.target.value)}>
              {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div style={styles.campo}>
            <label style={styles.campoLabel}>Abogado</label>
            <select style={styles.select} value={abogadoId} onChange={e => setAbogadoId(e.target.value)}>
              <option value="">Todo el equipo</option>
              {abogados.map(a => (
                <option key={a.id} value={a.id}>{nombreCompleto(a) || a.id}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={styles.toolbarBtns}>
          <button style={styles.btnExport} onClick={exportarCSV} disabled={loading || !tablaAbogados.length}>
            <Download size={15} /> Exportar CSV
          </button>
          <button
            style={styles.btnPrint}
            onClick={() => window.print()}
            disabled={loading}
            title="Abre el diálogo de impresión. Elige «Guardar como PDF» para descargar."
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div style={styles.printHeader} className="print-only">
        <h2 style={styles.printTitulo}>SAR Consultores Integrales</h2>
        <p style={styles.printSubtitulo}>Informe de estadísticas del despacho</p>
        <div style={styles.printMeta}>
          <span>Periodo: {periodoLabel}</span>
          <span>Alcance: {abogadoFiltro}</span>
          <span>Generado: {new Date().toLocaleString('es-CO')}</span>
        </div>
      </div>

      {loading ? (
        <p style={styles.loading}>Cargando estadísticas...</p>
      ) : (
        <>
          <div style={styles.kpiGrid}>
            {kpis.map(k => {
              const Icon = k.icon
              return (
                <div key={k.label} style={styles.kpiCard}>
                  <div style={styles.kpiTop}>
                    <span style={styles.kpiLabel}>{k.label}</span>
                    <div style={{ ...styles.kpiIcon, backgroundColor: k.color + '15' }}>
                      <Icon size={16} color={k.color} />
                    </div>
                  </div>
                  <h2 style={{ ...styles.kpiValue, color: k.color }}>{k.value}</h2>
                  <p style={styles.kpiHint}>{k.hint}</p>
                </div>
              )
            })}
          </div>

          <div style={styles.grid2}>
            <div style={styles.card}>
              <div style={styles.cardHead}>
                <h3 style={styles.cardTitle}>Distribución por estado</h3>
                <span style={styles.cardTag}>{PERIODOS.find(p => p.id === periodo)?.label}</span>
              </div>
              <Donut data={resumen.porEstado} total={resumen.total} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardHead}>
                <h3 style={styles.cardTitle}>Casos por ciudad</h3>
                <span style={styles.cardTag}>Top 8</span>
              </div>
              <BarrasHorizontales items={resumen.porCiudad} color="#0984e3" />
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Casos nuevos por mes</h3>
              <span style={styles.cardTag}>Últimos 12 meses</span>
            </div>
            <BarrasVerticales series={tendencia} />
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Rendimiento por abogado</h3>
              <span style={styles.cardTag}>{tablaAbogados.length} con cartera</span>
            </div>
            {tablaAbogados.length === 0 ? (
              <p style={styles.empty}>Sin casos en el periodo</p>
            ) : (
              <div style={styles.tabla}>
                <div style={styles.tablaHead}>
                  <span>Abogado</span>
                  <span style={styles.center}>Casos</span>
                  <span style={styles.center}>Abiertos</span>
                  <span style={styles.center}>Ganados</span>
                  <span style={styles.center}>Perdidos</span>
                  <span style={styles.center}>Éxito</span>
                  <span>Avance</span>
                </div>
                {tablaAbogados.map(f => (
                  <div key={f.nombre} style={styles.tablaFila}>
                    <span style={styles.celdaNombre}>{f.nombre}</span>
                    <span style={{ ...styles.celda, ...styles.center }}>{f.total}</span>
                    <span style={{ ...styles.celda, ...styles.center }}>{f.abiertos}</span>
                    <span style={{ ...styles.celda, ...styles.center, color: '#00b894', fontWeight: 600 }}>{f.ganados}</span>
                    <span style={{ ...styles.celda, ...styles.center, color: '#d63031', fontWeight: 600 }}>{f.perdidos}</span>
                    <span style={{ ...styles.celda, ...styles.center }}>{f.exito === null ? '—' : `${f.exito}%`}</span>
                    <div style={styles.celdaAvance}>
                      <div style={styles.miniTrack}>
                        <div style={{ ...styles.miniFill, width: `${f.avance}%` }} />
                      </div>
                      <span style={styles.miniNum}>{f.avance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Audiencias próximas</h3>
              <span style={styles.cardTag}>30 días</span>
            </div>
            {audienciasFiltradas.length === 0 ? (
              <p style={styles.empty}>No hay audiencias programadas en los próximos 30 días</p>
            ) : (
              <div style={styles.audList} className="aud-list-print">
                {audienciasFiltradas.map(a => (
                  <div key={a.id} style={styles.audRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.audTitulo}>{a.titulo}</p>
                      <p style={styles.audMeta}>{a.cases?.titulo || 'Caso'}</p>
                    </div>
                    <span style={styles.audFecha}>
                      {new Date(a.fecha_hora).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.printFooter} className="print-only">
            <p>Informe interno — {new Date().toLocaleString('es-CO')} — SAR Consultores Integrales</p>
            <p>Documento confidencial. Uso exclusivo de la dirección del despacho.</p>
          </div>
        </>
      )}

      <style>{`
        .print-only { display: none; }
        @media print {
          @page { margin: 12mm; size: A4; }
          body * { visibility: hidden !important; }
          .estadisticas-print, .estadisticas-print * { visibility: visible !important; }
          .estadisticas-print {
            position: absolute !important;
            left: 0; top: 0; width: 100%;
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .estadisticas-print * {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .aud-list-print {
            max-height: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  )
}

const styles = {
  loading: { color: '#b2bec3', textAlign: 'center', padding: '48px' },
  empty: { margin: 0, color: '#b2bec3', fontSize: '13px' },
  center: { textAlign: 'center' },

  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  filtros: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  campo: { display: 'flex', flexDirection: 'column', gap: '5px' },
  campoLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#8a94a6',
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #dfe4ec',
    background: '#fff',
    fontSize: '13px',
    color: '#1a1a2e',
    minWidth: '180px',
    cursor: 'pointer',
  },
  btnExport: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #c9a84c',
    background: '#fff',
    color: '#a8873a',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  toolbarBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  btnPrint: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#1a1a2e',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  printHeader: {
    marginBottom: '20px',
    paddingBottom: '14px',
    borderBottom: '2px solid #1a1a2e',
  },
  printTitulo: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#1a1a2e' },
  printSubtitulo: { margin: '4px 0 12px', fontSize: '13px', color: '#636e72' },
  printMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '12px',
    color: '#2d3436',
    fontWeight: 500,
  },
  printFooter: {
    marginTop: '24px',
    paddingTop: '12px',
    borderTop: '1px solid #dfe6e9',
    fontSize: '11px',
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginBottom: '18px',
  },
  kpiCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px 18px',
    border: '1px solid #eef0f4',
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
  },
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  kpiLabel: { fontSize: '12px', color: '#636e72', fontWeight: 500 },
  kpiIcon: {
    width: '30px', height: '30px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  kpiValue: { margin: '10px 0 2px', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em' },
  kpiHint: { margin: 0, fontSize: '11.5px', color: '#8a94a6' },

  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #eef0f4',
    boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    marginBottom: '16px',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a2e' },
  cardTag: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#8a94a6',
    background: '#f4f6f9',
    padding: '4px 9px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },

  donutWrap: { display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  donutBox: { position: 'relative', width: '160px', height: '160px', flexShrink: 0 },
  donutCentro: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  donutNum: { fontSize: '30px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 },
  donutLabel: { fontSize: '11px', color: '#8a94a6', marginTop: '3px' },
  leyenda: { flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '9px' },
  leyendaFila: { display: 'flex', alignItems: 'center', gap: '9px' },
  punto: { width: '9px', height: '9px', borderRadius: '3px', flexShrink: 0 },
  leyendaNombre: { flex: 1, fontSize: '13px', color: '#2d3436', textTransform: 'capitalize' },
  leyendaValor: { fontSize: '13px', fontWeight: 600, color: '#1a1a2e' },
  leyendaPct: { fontWeight: 500, color: '#8a94a6' },

  hbarList: { display: 'flex', flexDirection: 'column', gap: '11px' },
  hbarRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  hbarLabel: {
    width: '120px', flexShrink: 0, fontSize: '13px', color: '#2d3436',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  hbarTrack: { flex: 1, height: '8px', background: '#f0f2f5', borderRadius: '4px', overflow: 'hidden' },
  hbarFill: { height: '100%', borderRadius: '4px' },
  hbarNum: { width: '30px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#636e72' },

  vbarWrap: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '190px' },
  vbarCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: '6px' },
  vbarNum: { fontSize: '11px', fontWeight: 600, color: '#636e72', height: '14px' },
  vbarTrack: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' },
  vbarFill: {
    width: '100%',
    minHeight: '2px',
    borderRadius: '5px 5px 0 0',
    background: 'linear-gradient(180deg, #c9a84c, #e0c877)',
  },
  vbarLabel: { fontSize: '11px', color: '#8a94a6', textTransform: 'capitalize' },

  tabla: { display: 'flex', flexDirection: 'column' },
  tablaHead: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 0.7fr 0.8fr 0.8fr 0.8fr 0.7fr 1.4fr',
    gap: '10px',
    padding: '0 4px 10px',
    borderBottom: '1px solid #eef0f4',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#8a94a6',
  },
  tablaFila: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 0.7fr 0.8fr 0.8fr 0.8fr 0.7fr 1.4fr',
    gap: '10px',
    alignItems: 'center',
    padding: '12px 4px',
    borderBottom: '1px solid #f6f7f9',
  },
  celdaNombre: {
    fontSize: '13.5px', fontWeight: 600, color: '#1a1a2e',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  celda: { fontSize: '13px', color: '#636e72' },
  celdaAvance: { display: 'flex', alignItems: 'center', gap: '8px' },
  miniTrack: { flex: 1, height: '6px', background: '#f0f2f5', borderRadius: '3px', overflow: 'hidden' },
  miniFill: { height: '100%', background: '#0984e3', borderRadius: '3px' },
  miniNum: { fontSize: '12px', fontWeight: 600, color: '#636e72', width: '34px', textAlign: 'right' },

  audList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' },
  audRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '11px 13px', background: '#f8f9fb', borderRadius: '8px',
  },
  audTitulo: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#1a1a2e' },
  audMeta: { margin: '2px 0 0', fontSize: '12px', color: '#8a94a6' },
  audFecha: { fontSize: '12px', color: '#6c5ce7', fontWeight: 600, whiteSpace: 'nowrap' },
}
