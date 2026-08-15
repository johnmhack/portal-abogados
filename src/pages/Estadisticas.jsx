import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { Briefcase, CheckCircle, Calendar, AlertCircle } from 'lucide-react'

const statusColor = {
  activo: '#0984e3',
  en_proceso: '#c9a84c',
  audiencia: '#6c5ce7',
  cerrado: '#636e72',
  ganado: '#00b894',
  perdido: '#d63031',
}

const statusLabel = (st) => (st || 'sin estado').replace(/_/g, ' ')

function BarList({ items, max, colorFn }) {
  if (!items.length) {
    return <p style={styles.empty}>Sin datos</p>
  }
  const tope = max || Math.max(...items.map(([, n]) => n), 1)
  return (
    <div style={styles.barList}>
      {items.map(([label, n]) => (
        <div key={label} style={styles.barRow}>
          <span style={styles.barLabel} title={label}>{label}</span>
          <div style={styles.barTrack}>
            <div
              style={{
                ...styles.barFill,
                width: `${Math.max(6, (n / tope) * 100)}%`,
                backgroundColor: colorFn ? colorFn(label) : '#c9a84c',
              }}
            />
          </div>
          <span style={styles.barNum}>{n}</span>
        </div>
      ))}
    </div>
  )
}

export default function Estadisticas() {
  const [casos, setCasos] = useState([])
  const [audiencias, setAudiencias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDatos()
  }, [])

  const fetchDatos = async () => {
    setLoading(true)
    const ahora = new Date()
    const hasta = new Date()
    hasta.setDate(hasta.getDate() + 30)

    const [{ data: casosData }, { data: auds }] = await Promise.all([
      supabase
        .from('cases')
        .select('id, titulo, ciudad, status, abogado_id, users!abogado_id(nombre, apellido)')
        .order('creado_en', { ascending: false }),
      supabase
        .from('audiencias')
        .select('id, titulo, fecha_hora, estado, cases(titulo)')
        .gte('fecha_hora', ahora.toISOString())
        .lte('fecha_hora', hasta.toISOString())
        .neq('estado', 'cancelada')
        .order('fecha_hora', { ascending: true })
        .limit(20),
    ])

    setCasos(casosData || [])
    setAudiencias(auds || [])
    setLoading(false)
  }

  const resumen = useMemo(() => {
    const porEstado = {}
    const porCiudad = {}
    const porAbogado = {}

    for (const c of casos) {
      const st = c.status || 'sin_estado'
      porEstado[st] = (porEstado[st] || 0) + 1

      const ciu = c.ciudad?.trim() || 'Sin ciudad'
      porCiudad[ciu] = (porCiudad[ciu] || 0) + 1

      const ab = c.users
        ? `${c.users.nombre || ''} ${c.users.apellido || ''}`.trim() || 'Sin nombre'
        : 'Sin asignar'
      porAbogado[ab] = (porAbogado[ab] || 0) + 1
    }

    const abiertos = casos.filter(c => !['cerrado', 'ganado', 'perdido'].includes(c.status)).length
    const ganados = porEstado.ganado || 0

    return {
      total: casos.length,
      abiertos,
      ganados,
      porEstado: Object.entries(porEstado).sort((a, b) => b[1] - a[1]),
      porCiudad: Object.entries(porCiudad).sort((a, b) => b[1] - a[1]).slice(0, 10),
      porAbogado: Object.entries(porAbogado).sort((a, b) => b[1] - a[1]),
    }
  }, [casos])

  if (loading) {
    return <p style={styles.loading}>Cargando estadísticas...</p>
  }

  const kpis = [
    { label: 'Total casos', value: resumen.total, icon: Briefcase, color: '#0984e3' },
    { label: 'Abiertos', value: resumen.abiertos, icon: AlertCircle, color: '#c9a84c' },
    { label: 'Ganados', value: resumen.ganados, icon: CheckCircle, color: '#00b894' },
    { label: 'Audiencias (30 días)', value: audiencias.length, icon: Calendar, color: '#6c5ce7' },
  ]

  return (
    <div>
      <div style={styles.statsGrid}>
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={styles.statCard}>
              <div>
                <p style={styles.statLabel}>{k.label}</p>
                <h2 style={{ ...styles.statValue, color: k.color }}>{k.value}</h2>
              </div>
              <div style={{ ...styles.statIcon, backgroundColor: k.color + '18' }}>
                <Icon size={22} color={k.color} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Casos por estado</h3>
          <BarList
            items={resumen.porEstado.map(([st, n]) => [statusLabel(st), n])}
            colorFn={(label) => {
              const key = Object.keys(statusColor).find(k => statusLabel(k) === label)
              return statusColor[key] || '#636e72'
            }}
          />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Casos por ciudad</h3>
          <BarList items={resumen.porCiudad} colorFn={() => '#0984e3'} />
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Casos por abogado</h3>
          <BarList items={resumen.porAbogado} colorFn={() => '#6c5ce7'} />
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Audiencias próximas (30 días)</h3>
          {audiencias.length === 0 ? (
            <p style={styles.empty}>No hay audiencias en los próximos 30 días</p>
          ) : (
            <div style={styles.audList}>
              {audiencias.map((a) => (
                <div key={a.id} style={styles.audRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.audTitulo}>{a.titulo}</p>
                    <p style={styles.audMeta}>{a.cases?.titulo || 'Caso'}</p>
                  </div>
                  <span style={styles.audFecha}>
                    {new Date(a.fecha_hora).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  loading: { color: '#b2bec3', textAlign: 'center', padding: '48px' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #eef0f4',
  },
  statLabel: { margin: 0, fontSize: '12px', color: '#636e72', fontWeight: 500 },
  statValue: { margin: '6px 0 0', fontSize: '28px', fontWeight: 700, color: '#1a1a2e' },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #eef0f4',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  empty: { margin: 0, color: '#b2bec3', fontSize: '13px' },
  barList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  barLabel: {
    width: '110px',
    flexShrink: 0,
    fontSize: '13px',
    color: '#2d3436',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textTransform: 'capitalize',
  },
  barTrack: {
    flex: 1,
    height: '8px',
    background: '#f0f2f5',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  barNum: { width: '28px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#636e72' },
  audList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' },
  audRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: '#f8f9fb',
    borderRadius: '8px',
  },
  audTitulo: { margin: 0, fontSize: '13px', fontWeight: 600, color: '#1a1a2e' },
  audMeta: { margin: '2px 0 0', fontSize: '12px', color: '#636e72' },
  audFecha: { fontSize: '12px', color: '#6c5ce7', fontWeight: 600, whiteSpace: 'nowrap' },
}
