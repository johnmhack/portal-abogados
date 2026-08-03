import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Plus, Trash2 } from 'lucide-react'

const calidadColor = {
  demandante: '#6c5ce7',
  demandado: '#e17055',
}

export default function PartesCaso({ casoId, clientes = [], puedeEditar = true }) {
  const [partes, setPartes] = useState([])
  const [loading, setLoading] = useState(true)
  const [nueva, setNueva] = useState({ client_id: '', nombre: '', calidad: 'demandado' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { fetchPartes() }, [casoId])

  const fetchPartes = async () => {
    const { data } = await supabase
      .from('case_parties')
      .select('*, clients(nombre, apellido)')
      .eq('case_id', casoId)
      .order('creado_en', { ascending: true })
    setPartes(data || [])
    setLoading(false)
  }

  const etiqueta = (p) => {
    if (p.clients) return `${p.clients.nombre} ${p.clients.apellido || ''}`.trim()
    return p.nombre || 'Sin nombre'
  }

  const agregar = async () => {
    if (!nueva.calidad) return
    if (!nueva.client_id && !nueva.nombre.trim()) return
    setGuardando(true)
    const cli = nueva.client_id ? clientes.find(c => c.id === nueva.client_id) : null
    const { error } = await supabase.from('case_parties').insert([{
      case_id: casoId,
      client_id: nueva.client_id || null,
      nombre: cli ? `${cli.nombre} ${cli.apellido || ''}`.trim() : nueva.nombre.trim(),
      calidad: nueva.calidad,
      es_nuestro_cliente: false,
    }])
    setGuardando(false)
    if (error) {
      alert('No se pudo agregar: ' + error.message)
      return
    }
    setNueva({ client_id: '', nombre: '', calidad: 'demandado' })
    fetchPartes()
  }

  const cambiarCalidad = async (id, calidad) => {
    const { error } = await supabase.from('case_parties').update({ calidad }).eq('id', id)
    if (error) alert(error.message)
    else fetchPartes()
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Quitar esta parte del caso?')) return
    const { error } = await supabase.from('case_parties').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchPartes()
  }

  const demandantes = partes.filter(p => p.calidad === 'demandante')
  const demandados = partes.filter(p => p.calidad === 'demandado')

  if (loading) return <p style={{ color: '#b2bec3', fontSize: '13px' }}>Cargando partes...</p>

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Partes del proceso</h3>

      <div style={styles.cols}>
        <div style={styles.col}>
          <p style={{ ...styles.colTitle, color: calidadColor.demandante }}>Demandantes</p>
          {demandantes.length === 0 && <p style={styles.empty}>Ninguno</p>}
          {demandantes.map(p => (
            <div key={p.id} style={styles.row}>
              <div style={{ flex: 1 }}>
                <span style={styles.nombre}>{etiqueta(p)}</span>
                {p.es_nuestro_cliente && <span style={styles.badgeNuestro}>Nuestro cliente</span>}
              </div>
              {puedeEditar && (
                <div style={styles.actions}>
                  <select
                    style={styles.selectMini}
                    value={p.calidad}
                    onChange={e => cambiarCalidad(p.id, e.target.value)}
                  >
                    <option value="demandante">Demandante</option>
                    <option value="demandado">Demandado</option>
                  </select>
                  <button style={styles.btnDel} onClick={() => eliminar(p.id)} title="Quitar"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.col}>
          <p style={{ ...styles.colTitle, color: calidadColor.demandado }}>Demandados</p>
          {demandados.length === 0 && <p style={styles.empty}>Ninguno</p>}
          {demandados.map(p => (
            <div key={p.id} style={styles.row}>
              <div style={{ flex: 1 }}>
                <span style={styles.nombre}>{etiqueta(p)}</span>
                {p.es_nuestro_cliente && <span style={styles.badgeNuestro}>Nuestro cliente</span>}
              </div>
              {puedeEditar && (
                <div style={styles.actions}>
                  <select
                    style={styles.selectMini}
                    value={p.calidad}
                    onChange={e => cambiarCalidad(p.id, e.target.value)}
                  >
                    <option value="demandante">Demandante</option>
                    <option value="demandado">Demandado</option>
                  </select>
                  <button style={styles.btnDel} onClick={() => eliminar(p.id)} title="Quitar"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {puedeEditar && (
        <div style={styles.addBox}>
          <p style={styles.addLabel}>Agregar parte</p>
          <div style={styles.addRow}>
            <select
              style={styles.input}
              value={nueva.client_id}
              onChange={e => setNueva({ ...nueva, client_id: e.target.value, nombre: '' })}
            >
              <option value="">Del directorio…</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido || ''}</option>
              ))}
            </select>
            {!nueva.client_id && (
              <input
                style={styles.input}
                placeholder="O nombre libre"
                value={nueva.nombre}
                onChange={e => setNueva({ ...nueva, nombre: e.target.value })}
              />
            )}
            <select
              style={styles.input}
              value={nueva.calidad}
              onChange={e => setNueva({ ...nueva, calidad: e.target.value })}
            >
              <option value="demandante">Demandante</option>
              <option value="demandado">Demandado</option>
            </select>
            <button style={styles.btnAdd} onClick={agregar} disabled={guardando}>
              <Plus size={16} /> {guardando ? '...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: {
    backgroundColor: '#fff', borderRadius: '14px', padding: '20px',
    border: '1px solid #eef0f3', boxShadow: '0 2px 10px rgba(26,26,46,0.06)', marginBottom: '20px',
  },
  title: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 14px' },
  cols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  col: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '12px' },
  colTitle: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 10px', letterSpacing: '0.04em' },
  empty: { fontSize: '13px', color: '#b2bec3', margin: 0 },
  row: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  nombre: { fontSize: '13px', fontWeight: '600', color: '#1a1a2e' },
  badgeNuestro: {
    marginLeft: '8px', fontSize: '10px', fontWeight: '700', color: '#c9a84c',
    backgroundColor: 'rgba(201,168,76,0.15)', padding: '2px 6px', borderRadius: '10px',
  },
  actions: { display: 'flex', gap: '6px', alignItems: 'center' },
  selectMini: {
    fontSize: '12px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #dfe6e9',
  },
  btnDel: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#d63031', padding: '4px',
  },
  addBox: { marginTop: '16px', borderTop: '1px solid #f0f2f5', paddingTop: '14px' },
  addLabel: { fontSize: '12px', fontWeight: '600', color: '#636e72', margin: '0 0 8px' },
  addRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  input: {
    flex: 1, minWidth: '140px', padding: '8px 10px', borderRadius: '8px',
    border: '1px solid #dfe6e9', fontSize: '13px', outline: 'none',
  },
  btnAdd: {
    display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1a1a2e',
    color: '#c9a84c', border: 'none', padding: '8px 14px', borderRadius: '8px',
    cursor: 'pointer', fontWeight: '600', fontSize: '13px',
  },
}
