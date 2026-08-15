import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { Bell } from 'lucide-react'
import { veTodoElDespacho } from '../lib/permisos'

const DIAS_PROXIMAS = 3
const HORAS_PROXIMAS = DIAS_PROXIMAS * 24

/**
 * Crea notificaciones in-app para abogado y clientes del caso
 * cuando se agenda/actualiza una audiencia.
 */
export async function notificarAudiencia({ caseId, tituloAudiencia, fechaHoraIso, esEdicion = false }) {
  if (!caseId) return

  const { data: caso } = await supabase
    .from('cases')
    .select('id, titulo, abogado_id, client_id')
    .eq('id', caseId)
    .maybeSingle()

  if (!caso) return

  const fecha = fechaHoraIso ? new Date(fechaHoraIso) : null
  const fechaTxt = fecha && !Number.isNaN(fecha.getTime())
    ? fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    : 'fecha por confirmar'

  const titulo = esEdicion ? 'Audiencia actualizada' : 'Nueva audiencia'
  const mensaje = `${tituloAudiencia} — ${caso.titulo} · ${fechaTxt}`

  const destinatarios = new Set()
  if (caso.abogado_id) destinatarios.add(caso.abogado_id)

  if (caso.client_id) {
    const { data: clientesUsers } = await supabase
      .from('users')
      .select('id')
      .eq('rol', 'cliente')
      .eq('client_id', caso.client_id)
    ;(clientesUsers || []).forEach(u => destinatarios.add(u.id))
  }

  if (destinatarios.size === 0) return

  const rows = [...destinatarios].map(user_id => ({
    user_id,
    titulo,
    mensaje,
    tipo: 'audiencia',
    link_tipo: 'caso',
    link_id: caso.id,
    leida: false,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) console.log('notificarAudiencia:', error.message)
}

export default function NotificacionesCampana({ userProfile, onIrAudiencias }) {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState([])
  const [proximas, setProximas] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (userProfile?.id) cargar()
  }, [userProfile?.id])

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const cargar = async () => {
    if (!userProfile?.id) return
    setLoading(true)

    const [{ data: notifs }, audienciasRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('creado_en', { ascending: false })
        .limit(30),
      cargarProximasAudiencias(userProfile),
    ])

    setItems(notifs || [])
    setProximas(audienciasRes || [])
    setLoading(false)
  }

  const noLeidas = items.filter(n => !n.leida).length
  const badge = noLeidas + proximas.length

  const marcarLeida = async (id) => {
    await supabase.from('notifications').update({ leida: true }).eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  const marcarTodas = async () => {
    const ids = items.filter(n => !n.leida).map(n => n.id)
    if (ids.length === 0) return
    await supabase.from('notifications').update({ leida: true }).in('id', ids)
    setItems(prev => prev.map(n => ({ ...n, leida: true })))
  }

  return (
    <div style={s.wrap} ref={ref}>
      <button
        style={s.bellBtn}
        onClick={() => { setAbierto(v => !v); if (!abierto) cargar() }}
        title="Notificaciones"
      >
        <Bell size={20} color="#c9a84c" />
        {badge > 0 && <span style={s.badge}>{badge > 9 ? '9+' : badge}</span>}
      </button>

      {abierto && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <span style={s.panelTitle}>Notificaciones</span>
            {noLeidas > 0 && (
              <button style={s.linkBtn} onClick={marcarTodas}>Marcar leídas</button>
            )}
          </div>

          {loading ? (
            <p style={s.empty}>Cargando...</p>
          ) : (
            <div style={s.lista}>
              {proximas.length > 0 && (
                <>
                  <p style={s.seccion}>Próximas {DIAS_PROXIMAS} días</p>
                  {proximas.map(a => (
                    <button
                      key={`prox-${a.id}`}
                      style={{ ...s.item, ...s.itemAlerta }}
                      onClick={() => { setAbierto(false); onIrAudiencias?.() }}
                    >
                      <p style={s.itemTitulo}>Audiencia próxima</p>
                      <p style={s.itemMsg}>
                        {a.titulo}
                        {a.fecha_hora
                          ? ` · ${new Date(a.fecha_hora).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
                          : ''}
                      </p>
                    </button>
                  ))}
                </>
              )}

              {items.length > 0 && <p style={s.seccion}>Actividad</p>}
              {items.length === 0 && proximas.length === 0 && (
                <p style={s.empty}>No tienes notificaciones</p>
              )}
              {items.map(n => (
                <button
                  key={n.id}
                  style={{ ...s.item, ...(n.leida ? {} : s.itemNueva) }}
                  onClick={() => {
                    if (!n.leida) marcarLeida(n.id)
                    if (n.tipo === 'audiencia') {
                      setAbierto(false)
                      onIrAudiencias?.()
                    }
                  }}
                >
                  <p style={s.itemTitulo}>{n.titulo}</p>
                  {n.mensaje && <p style={s.itemMsg}>{n.mensaje}</p>}
                  <p style={s.itemFecha}>
                    {n.creado_en
                      ? new Date(n.creado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                      : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

async function cargarProximasAudiencias(userProfile) {
  const ahora = new Date()
  const hasta = new Date(ahora.getTime() + HORAS_PROXIMAS * 60 * 60 * 1000)

  let query = supabase
    .from('audiencias')
    .select('id, titulo, fecha_hora, estado, case_id, cases!inner(abogado_id, client_id)')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString())
    .neq('estado', 'cancelada')
    .neq('estado', 'realizada')
    .order('fecha_hora', { ascending: true })
    .limit(10)

  const { data, error } = await query
  if (error) {
    console.log('proximas audiencias:', error.message)
    return []
  }

  let rows = data || []
  if (userProfile.rol === 'cliente') {
    // RLS ya filtra; reforzamos por client_id del perfil
    rows = rows.filter(a => a.cases?.client_id === userProfile.client_id)
  } else if (!veTodoElDespacho(userProfile.rol)) {
    rows = rows.filter(a => a.cases?.abogado_id === userProfile.id)
  }

  return rows
}

const s = {
  wrap: { position: 'relative' },
  bellBtn: {
    position: 'relative',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '1px solid rgba(201,168,76,0.35)',
    background: 'rgba(201,168,76,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    backgroundColor: '#d63031',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  panel: {
    position: 'absolute',
    top: '52px',
    right: 0,
    width: '340px',
    maxHeight: '420px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(26,26,46,0.25)',
    border: '1px solid #eef0f3',
    zIndex: 300,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #f0f2f5',
  },
  panelTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  linkBtn: {
    background: 'none', border: 'none', color: '#0984e3',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  },
  lista: { overflowY: 'auto', maxHeight: '360px' },
  seccion: {
    fontSize: '11px', fontWeight: '700', color: '#b2bec3',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    margin: '10px 16px 4px',
  },
  item: {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none', borderBottom: '1px solid #f5f6fa',
    padding: '12px 16px', cursor: 'pointer',
  },
  itemNueva: { backgroundColor: 'rgba(201,168,76,0.08)' },
  itemAlerta: { backgroundColor: 'rgba(214,48,49,0.06)' },
  itemTitulo: { fontSize: '13px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  itemMsg: { fontSize: '12px', color: '#636e72', margin: '4px 0 0', lineHeight: 1.4 },
  itemFecha: { fontSize: '11px', color: '#b2bec3', margin: '6px 0 0' },
  empty: { padding: '28px 16px', textAlign: 'center', color: '#b2bec3', fontSize: '13px' },
}
