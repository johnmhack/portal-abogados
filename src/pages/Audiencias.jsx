import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Search, Calendar } from 'lucide-react'

export default function Audiencias() {
  const [eventos, setEventos] = useState([])
  const [casos, setCasos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCaso, setFiltroCaso] = useState('')

  useEffect(() => {
    fetchEventos()
    fetchCasos()
  }, [])

  const fetchEventos = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, cases(titulo)')
      .eq('tipo', 'audiencia')
      .order('creado_en', { ascending: false })
    setEventos(data || [])
    setLoading(false)
  }

  const fetchCasos = async () => {
    const { data } = await supabase.from('cases').select('id, titulo')
    setCasos(data || [])
  }

  const eventosFiltrados = eventos.filter(e => {
    const matchBusqueda = e.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    const matchCaso = filtroCaso ? e.case_id === filtroCaso : true
    return matchBusqueda && matchCaso
  })

  const hoy = new Date()
  const proximas = eventosFiltrados.filter(e => new Date(e.creado_en) >= hoy)
  const pasadas = eventosFiltrados.filter(e => new Date(e.creado_en) < hoy)

  const AudienciaCard = ({ e, pasada }) => (
    <div style={{ ...styles.card, opacity: pasada ? 0.6 : 1 }}>
      <div style={{ ...styles.fechaBox, backgroundColor: pasada ? '#636e72' : '#1a1a2e' }}>
        <span style={styles.dia}>{new Date(e.creado_en).getDate()}</span>
        <span style={styles.mes}>{new Date(e.creado_en).toLocaleString('es-CO', { month: 'short' })}</span>
      </div>
      <div style={styles.cardInfo}>
        <span style={styles.casoTag}>{e.cases?.titulo || '—'}</span>
        <p style={styles.desc}>{e.descripcion}</p>
      </div>
      <span style={{ ...styles.badge, backgroundColor: pasada ? '#63697220' : '#00b89420', color: pasada ? '#636e72' : '#00b894' }}>
        {pasada ? 'Pasada' : 'Reciente'}
      </span>
    </div>
  )

  return (
    <div>
      <div style={styles.filtros}>
        <div style={styles.searchBox}>
          <Search size={16} color="#b2bec3" />
          <input style={styles.searchInput} placeholder="Buscar audiencia..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select style={styles.select} value={filtroCaso} onChange={e => setFiltroCaso(e.target.value)}>
          <option value="">Todos los casos</option>
          {casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statPill}>
          <Calendar size={14} color="#0984e3" />
          <span>{proximas.length} recientes</span>
        </div>
        <div style={styles.statPill}>
          <Calendar size={14} color="#636e72" />
          <span>{pasadas.length} pasadas</span>
        </div>
      </div>

      {loading ? <p style={{ color: '#b2bec3' }}>Cargando...</p> : (
        <>
          {proximas.length > 0 && (
            <>
              <h3 style={styles.seccion}>📅 Audiencias Recientes</h3>
              {proximas.map(e => <AudienciaCard key={e.id} e={e} pasada={false} />)}
            </>
          )}
          {pasadas.length > 0 && (
            <>
              <h3 style={{ ...styles.seccion, marginTop: '24px' }}>🕐 Audiencias Pasadas</h3>
              {pasadas.map(e => <AudienciaCard key={e.id} e={e} pasada={true} />)}
            </>
          )}
          {eventosFiltrados.length === 0 && (
            <div style={styles.empty}>
              <Calendar size={40} color="#dfe6e9" />
              <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay audiencias</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  filtros: { display: 'flex', gap: '12px', marginBottom: '16px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1 },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  statPill: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#636e72', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  seccion: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '12px' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' },
  fechaBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#c9a84c', borderRadius: '10px', padding: '10px 14px', minWidth: '60px' },
  dia: { fontSize: '22px', fontWeight: '700' },
  mes: { fontSize: '11px', textTransform: 'uppercase' },
  cardInfo: { flex: 1 },
  casoTag: { fontSize: '12px', backgroundColor: '#f0f2f5', padding: '3px 10px', borderRadius: '20px', color: '#636e72', display: 'inline-block', marginBottom: '6px' },
  desc: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' },
}