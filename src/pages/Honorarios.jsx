import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { Search, Wallet } from 'lucide-react'
import { formatearCOP } from '../lib/dinero'

function hoyISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function etiquetaCaso(c) {
  if (!c) return '—'
  const cliente = c.clients ? `${c.clients.nombre || ''} ${c.clients.apellido || ''}`.trim() : ''
  return [c.titulo, cliente].filter(Boolean).join(' — ')
}

export default function Honorarios({ onAbrirCaso }) {
  const [honorarios, setHonorarios] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [abonos, setAbonos] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorSql, setErrorSql] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('proximas')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    const { data: h, error } = await supabase
      .from('honorarios')
      .select('*, cases(id, titulo, clients(nombre, apellido))')
      .order('creado_en', { ascending: false })

    if (error) {
      setErrorSql(true)
      setHonorarios([])
      setCuotas([])
      setAbonos([])
      setLoading(false)
      return
    }

    setErrorSql(false)
    setHonorarios(h || [])
    const ids = (h || []).map(x => x.id)
    if (ids.length === 0) {
      setCuotas([])
      setAbonos([])
      setLoading(false)
      return
    }

    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('honorario_cuotas').select('*').in('honorario_id', ids).order('fecha_vencimiento', { ascending: true }),
      supabase.from('honorario_abonos').select('*').in('honorario_id', ids),
    ])
    setCuotas(c || [])
    setAbonos(a || [])
    setLoading(false)
  }

  const abonadoPorHonorario = useMemo(() => {
    const map = {}
    abonos.forEach(a => {
      map[a.honorario_id] = (map[a.honorario_id] || 0) + Number(a.monto || 0)
    })
    return map
  }, [abonos])

  const q = busqueda.trim().toLowerCase()
  const hoy = hoyISO()

  const honorariosFiltrados = honorarios.filter(h => {
    const texto = etiquetaCaso(h.cases).toLowerCase()
    return !q || texto.includes(q)
  })

  const cuotasVista = cuotas.filter(c => {
    const h = honorarios.find(x => x.id === c.honorario_id)
    if (q && !etiquetaCaso(h?.cases).toLowerCase().includes(q)) return false
    if (c.estado === 'pagada') return filtro === 'todas'
    if (filtro === 'vencidas') return c.fecha_vencimiento && c.fecha_vencimiento < hoy
    if (filtro === 'proximas') return !c.fecha_vencimiento || c.fecha_vencimiento >= hoy
    return true
  })

  if (loading) return <p style={{ color: '#b2bec3' }}>Cargando honorarios...</p>

  if (errorSql) {
    return (
      <div style={styles.empty}>
        <Wallet size={40} color="#dfe6e9" />
        <p style={{ color: '#636e72', marginTop: '12px', textAlign: 'center', maxWidth: '420px' }}>
          Falta crear las tablas. En Supabase → SQL Editor ejecuta <strong>supabase/honorarios.sql</strong>.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.filtros}>
        <div style={styles.searchBox}>
          <Search size={16} color="#b2bec3" />
          <input
            style={styles.searchInput}
            placeholder="Buscar por caso o cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select style={styles.select} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="proximas">Cuotas próximas</option>
          <option value="vencidas">Cuotas vencidas</option>
          <option value="todas">Todas las cuotas</option>
        </select>
      </div>

      <h3 style={styles.seccion}>Acuerdos por caso</h3>
      {honorariosFiltrados.length === 0 ? (
        <div style={styles.empty}>
          <Wallet size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>Aún no hay honorarios. Ábrelos desde cada caso, pestaña Honorarios.</p>
        </div>
      ) : (
        honorariosFiltrados.map(h => {
          const abonado = abonadoPorHonorario[h.id] || 0
          const saldo = Number(h.total_pactado || 0) - abonado
          return (
            <div key={h.id} style={styles.card}>
              <div style={{ flex: 1 }}>
                <p style={styles.titulo}>{etiquetaCaso(h.cases)}</p>
                <p style={styles.meta}>
                  Pactado {formatearCOP(h.total_pactado)} · Abonado {formatearCOP(abonado)} · Saldo {formatearCOP(saldo)}
                </p>
              </div>
              {onAbrirCaso && (
                <button style={styles.btn} onClick={() => onAbrirCaso(h.case_id)}>
                  Abrir caso
                </button>
              )}
            </div>
          )
        })
      )}

      <h3 style={{ ...styles.seccion, marginTop: '28px' }}>
        {filtro === 'vencidas' ? 'Cuotas vencidas' : filtro === 'todas' ? 'Cuotas' : 'Próximos vencimientos'}
      </h3>
      {cuotasVista.length === 0 ? (
        <p style={{ color: '#b2bec3', fontSize: '13px' }}>No hay cuotas en este filtro.</p>
      ) : (
        cuotasVista.map(c => {
          const h = honorarios.find(x => x.id === c.honorario_id)
          const vencida = c.estado !== 'pagada' && c.fecha_vencimiento && c.fecha_vencimiento < hoy
          return (
            <div key={c.id} style={styles.card}>
              <div style={styles.fechaBox}>
                <span style={styles.dia}>
                  {c.fecha_vencimiento ? new Date(c.fecha_vencimiento + 'T12:00:00').getDate() : '—'}
                </span>
                <span style={styles.mes}>
                  {c.fecha_vencimiento
                    ? new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleString('es-CO', { month: 'short' })
                    : 's/fecha'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.titulo}>{c.concepto}</p>
                <p style={styles.meta}>{etiquetaCaso(h?.cases)} · {formatearCOP(c.monto)}</p>
              </div>
              <span style={{
                ...styles.badge,
                backgroundColor: c.estado === 'pagada' ? '#00b89420' : vencida ? '#d6303120' : '#c9a84c20',
                color: c.estado === 'pagada' ? '#00b894' : vencida ? '#d63031' : '#c9a84c',
              }}>
                {c.estado === 'pagada' ? 'Pagada' : vencida ? 'Vencida' : 'Pendiente'}
              </span>
              {onAbrirCaso && (
                <button style={styles.btn} onClick={() => onAbrirCaso(c.case_id)}>Abrir caso</button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

const styles = {
  filtros: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff',
    padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: '180px',
  },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', backgroundColor: '#fff' },
  seccion: { fontSize: '15px', fontWeight: 600, color: '#1a1a2e', marginBottom: '12px' },
  card: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px',
  },
  fechaBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#c9a84c',
    backgroundColor: '#1a1a2e', borderRadius: '10px', padding: '10px 14px', minWidth: '64px',
  },
  dia: { fontSize: '20px', fontWeight: 700 },
  mes: { fontSize: '11px', textTransform: 'uppercase' },
  titulo: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e', margin: 0 },
  meta: { fontSize: '12px', color: '#8a94a6', margin: '4px 0 0' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' },
  btn: {
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '8px 12px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap',
  },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', backgroundColor: '#fff', borderRadius: '12px' },
}
