import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Search, Send } from 'lucide-react'

export default function Mensajes({ session }) {
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [nuevo, setNuevo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { fetchClientes() }, [])

  useEffect(() => {
    if (seleccionado) fetchMensajes()
  }, [seleccionado])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clients').select('*').order('nombre')
    setClientes(data || [])
  }

  const fetchMensajes = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`remitente_id.eq.${session.user.id},destinatario_id.eq.${session.user.id}`)
      .order('creado_en', { ascending: true })
    setMensajes(data || [])
  }

  const enviarMensaje = async () => {
    if (!nuevo.trim() || !seleccionado) return
    await supabase.from('messages').insert([{
      remitente_id: session.user.id,
      destinatario_id: seleccionado.id,
      contenido: nuevo,
      case_id: null
    }])
    setNuevo('')
    fetchMensajes()
  }

  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.searchBox}>
            <Search size={14} color="#b2bec3" />
            <input style={styles.searchInput} placeholder="Buscar cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
        {clientesFiltrados.length === 0 ? (
          <p style={{ color: '#b2bec3', padding: '20px', fontSize: '13px' }}>No hay clientes</p>
        ) : (
          clientesFiltrados.map(c => (
            <div key={c.id} style={{ ...styles.clienteItem, backgroundColor: seleccionado?.id === c.id ? 'rgba(201,168,76,0.1)' : 'transparent', borderLeft: seleccionado?.id === c.id ? '3px solid #c9a84c' : '3px solid transparent' }} onClick={() => setSeleccionado(c)}>
              <div style={styles.avatar}>{c.nombre[0]}{c.apellido?.[0]}</div>
              <div>
                <p style={styles.clienteNombre}>{c.nombre} {c.apellido}</p>
                <p style={styles.clienteEmail}>{c.correo}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CHAT */}
      <div style={styles.chat}>
        {!seleccionado ? (
          <div style={styles.empty}>
            <Send size={40} color="#dfe6e9" />
            <p style={{ color: '#b2bec3', marginTop: '12px' }}>Selecciona un cliente para chatear</p>
          </div>
        ) : (
          <>
            <div style={styles.chatHeader}>
              <div style={styles.avatar}>{seleccionado.nombre[0]}{seleccionado.apellido?.[0]}</div>
              <div>
                <p style={styles.chatNombre}>{seleccionado.nombre} {seleccionado.apellido}</p>
                <p style={styles.chatEmail}>{seleccionado.correo}</p>
              </div>
            </div>
            <div style={styles.mensajesBox}>
              {mensajes.length === 0 ? (
                <p style={{ color: '#b2bec3', textAlign: 'center', marginTop: '40px' }}>No hay mensajes</p>
              ) : (
                mensajes.map(m => {
                  const esMio = m.remitente_id === session.user.id
                  return (
                    <div key={m.id} style={{ ...styles.burbuja, alignSelf: esMio ? 'flex-end' : 'flex-start', backgroundColor: esMio ? '#1a1a2e' : '#f0f2f5' }}>
                      <p style={{ ...styles.burbujaTexto, color: esMio ? '#c9a84c' : '#2d3436' }}>{m.contenido}</p>
                      <span style={{ ...styles.burbujaFecha, color: esMio ? '#a0aec0' : '#b2bec3' }}>
                        {new Date(m.creado_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
            <div style={styles.inputBox}>
              <input style={styles.input} placeholder="Escribe un mensaje..." value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMensaje()} />
              <button style={styles.btnEnviar} onClick={enviarMensaje}><Send size={18} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 'calc(100vh - 180px)', overflow: 'hidden' },
  sidebar: { width: '280px', borderRight: '1px solid #f0f2f5', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarHeader: { padding: '16px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8f9fa', padding: '8px 12px', borderRadius: '8px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '13px', width: '100%', backgroundColor: 'transparent' },
  clienteItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#1a1a2e', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', flexShrink: 0 },
  clienteNombre: { fontSize: '14px', fontWeight: '600', color: '#1a1a2e' },
  clienteEmail: { fontSize: '12px', color: '#b2bec3' },
  chat: { flex: 1, display: 'flex', flexDirection: 'column' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f0f2f5' },
  chatNombre: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e' },
  chatEmail: { fontSize: '12px', color: '#b2bec3' },
  mensajesBox: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  burbuja: { maxWidth: '60%', padding: '10px 14px', borderRadius: '12px' },
  burbujaTexto: { fontSize: '14px', marginBottom: '4px' },
  burbujaFecha: { fontSize: '11px' },
  inputBox: { display: 'flex', gap: '12px', padding: '16px', borderTop: '1px solid #f0f2f5' },
  input: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none' },
  btnEnviar: { backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' },
}