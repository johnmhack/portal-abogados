import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { Plus, Trash2 } from 'lucide-react'
import { formatearCOP, parseMonto } from '../lib/dinero'
import { notificarHonorario } from '../components/NotificacionesCampana'

function hoyISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function cuotaVencida(c) {
  if (c.estado === 'pagada' || !c.fecha_vencimiento) return false
  return c.fecha_vencimiento < hoyISO()
}

export default function HonorariosTab({ casoId, puedeEditar = true, puedeBorrar = true }) {
  const [honorario, setHonorario] = useState(null)
  const [cuotas, setCuotas] = useState([])
  const [abonos, setAbonos] = useState([])
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorSql, setErrorSql] = useState(false)

  const [total, setTotal] = useState('')
  const [notas, setNotas] = useState('')
  const [guardandoAcuerdo, setGuardandoAcuerdo] = useState(false)

  const [cuota, setCuota] = useState({ concepto: '', monto: '', fecha: '', stage_id: '' })
  const [abono, setAbono] = useState({ monto: '', fecha: hoyISO(), notas: '' })
  const [guardando, setGuardando] = useState(false)
  const [eliminar, setEliminar] = useState(null)

  const cargar = async () => {
    setLoading(true)
    const [{ data: h, error: errH }, { data: etapasData }] = await Promise.all([
      supabase.from('honorarios').select('*').eq('case_id', casoId).maybeSingle(),
      supabase.from('case_stages').select('id, nombre, orden').eq('case_id', casoId).order('orden'),
    ])

    if (errH && (errH.code === '42P01' || errH.message?.includes('honorarios'))) {
      setErrorSql(true)
      setLoading(false)
      return
    }

    setErrorSql(false)
    setHonorario(h || null)
    setTotal(h ? String(h.total_pactado ?? '') : '')
    setNotas(h?.notas || '')
    setEtapas(etapasData || [])

    if (h) {
      const [{ data: cuotasData }, { data: abonosData }] = await Promise.all([
        supabase.from('honorario_cuotas').select('*').eq('honorario_id', h.id).order('fecha_vencimiento', { ascending: true }),
        supabase.from('honorario_abonos').select('*').eq('honorario_id', h.id).order('fecha', { ascending: true }),
      ])
      setCuotas(cuotasData || [])
      setAbonos(abonosData || [])
    } else {
      setCuotas([])
      setAbonos([])
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [casoId])

  const abonado = useMemo(
    () => abonos.reduce((acc, a) => acc + Number(a.monto || 0), 0),
    [abonos]
  )
  const pactado = Number(honorario?.total_pactado || 0)
  const saldo = pactado - abonado

  const guardarAcuerdo = async () => {
    const monto = parseMonto(total)
    if (!Number.isFinite(monto) || monto < 0) {
      alert('Indica un valor de honorarios válido.')
      return
    }
    setGuardandoAcuerdo(true)
    const payload = {
      case_id: casoId,
      total_pactado: monto,
      notas: notas.trim() || null,
      actualizado_en: new Date().toISOString(),
    }
    const { error } = honorario
      ? await supabase.from('honorarios').update(payload).eq('id', honorario.id)
      : await supabase.from('honorarios').insert([payload])
    setGuardandoAcuerdo(false)
    if (error) {
      alert('No se pudo guardar: ' + error.message)
      return
    }
    if (!honorario) {
      await notificarHonorario({
        caseId: casoId,
        titulo: 'Honorarios definidos',
        mensaje: `Se pactaron honorarios por ${formatearCOP(monto)}.`,
      })
    }
    cargar()
  }

  const agregarCuota = async () => {
    if (!honorario) return
    if (!cuota.concepto.trim() || !parseMonto(cuota.monto)) {
      alert('Indica concepto y monto de la cuota.')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('honorario_cuotas').insert([{
      honorario_id: honorario.id,
      case_id: casoId,
      concepto: cuota.concepto.trim(),
      monto: parseMonto(cuota.monto),
      fecha_vencimiento: cuota.fecha || null,
      stage_id: cuota.stage_id || null,
      estado: 'pendiente',
    }])
    setGuardando(false)
    if (error) {
      alert('No se pudo agregar la cuota: ' + error.message)
      return
    }
    await notificarHonorario({
      caseId: casoId,
      titulo: 'Cuota de honorarios',
      mensaje: `${cuota.concepto.trim()} · ${formatearCOP(cuota.monto)}${cuota.fecha ? ` · vence ${cuota.fecha}` : ''}`,
    })
    setCuota({ concepto: '', monto: '', fecha: '', stage_id: '' })
    cargar()
  }

  const marcarCuota = async (c, pagada) => {
    const { error } = await supabase
      .from('honorario_cuotas')
      .update({ estado: pagada ? 'pagada' : 'pendiente' })
      .eq('id', c.id)
    if (error) alert(error.message)
    else cargar()
  }

  const agregarAbono = async () => {
    if (!honorario) return
    const monto = parseMonto(abono.monto)
    if (!Number.isFinite(monto) || monto <= 0 || !abono.fecha) {
      alert('Indica monto y fecha del abono.')
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('honorario_abonos').insert([{
      honorario_id: honorario.id,
      case_id: casoId,
      monto,
      fecha: abono.fecha,
      notas: abono.notas.trim() || null,
    }])
    setGuardando(false)
    if (error) {
      alert('No se pudo registrar el abono: ' + error.message)
      return
    }
    await notificarHonorario({
      caseId: casoId,
      titulo: 'Abono de honorarios',
      mensaje: `Abono de ${formatearCOP(monto)} el ${abono.fecha}.`,
    })
    setAbono({ monto: '', fecha: hoyISO(), notas: '' })
    cargar()
  }

  const confirmarEliminar = async () => {
    if (!eliminar) return
    const tabla = eliminar.tipo === 'cuota' ? 'honorario_cuotas' : 'honorario_abonos'
    const { error } = await supabase.from(tabla).delete().eq('id', eliminar.id)
    if (error) alert(error.message)
    setEliminar(null)
    cargar()
  }

  if (loading) return <p style={{ color: '#b2bec3', padding: '24px' }}>Cargando honorarios...</p>

  if (errorSql) {
    return (
      <div style={s.box}>
        <p style={s.empty}>
          Falta crear las tablas de honorarios. En Supabase → SQL Editor ejecuta el archivo
          {' '}<strong>supabase/honorarios.sql</strong>.
        </p>
      </div>
    )
  }

  return (
    <div style={s.box}>
      <div style={s.resumen}>
        <div style={s.kpi}>
          <span style={s.kpiLabel}>Pactado</span>
          <span style={s.kpiValor}>{formatearCOP(pactado)}</span>
        </div>
        <div style={s.kpi}>
          <span style={s.kpiLabel}>Abonado</span>
          <span style={{ ...s.kpiValor, color: '#00b894' }}>{formatearCOP(abonado)}</span>
        </div>
        <div style={s.kpi}>
          <span style={s.kpiLabel}>Saldo</span>
          <span style={{ ...s.kpiValor, color: saldo > 0 ? '#d63031' : '#00b894' }}>{formatearCOP(saldo)}</span>
        </div>
      </div>

      <h4 style={s.h4}>{honorario ? 'Acuerdo de honorarios' : 'Definir honorarios de este caso'}</h4>
      {puedeEditar ? (
        <div style={s.formGrid}>
          <input
            style={s.input}
            type="number"
            min="0"
            step="1000"
            placeholder="Total pactado *"
            value={total}
            onChange={e => setTotal(e.target.value)}
          />
          <textarea
            style={{ ...s.input, gridColumn: '1 / -1', height: '64px', resize: 'none' }}
            placeholder="Notas del acuerdo (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
          />
          <button style={s.btn} onClick={guardarAcuerdo} disabled={guardandoAcuerdo}>
            {guardandoAcuerdo ? 'Guardando...' : honorario ? 'Actualizar acuerdo' : 'Crear acuerdo'}
          </button>
        </div>
      ) : (
        <p style={s.meta}>{honorario?.notas || 'Sin notas en el acuerdo.'}</p>
      )}

      {!honorario ? (
        <p style={s.hint}>Primero define el valor pactado. Después podrás agregar cuotas y abonos.</p>
      ) : (
        <>
          <h4 style={s.h4}>Cuotas / vencimientos</h4>
          {puedeEditar && (
            <div style={s.formGrid}>
              <input style={s.input} placeholder="Concepto *" value={cuota.concepto} onChange={e => setCuota({ ...cuota, concepto: e.target.value })} />
              <input style={s.input} type="number" min="0" step="1000" placeholder="Monto *" value={cuota.monto} onChange={e => setCuota({ ...cuota, monto: e.target.value })} />
              <input style={s.input} type="date" value={cuota.fecha} onChange={e => setCuota({ ...cuota, fecha: e.target.value })} />
              <select style={s.input} value={cuota.stage_id} onChange={e => setCuota({ ...cuota, stage_id: e.target.value })}>
                <option value="">Etapa (opcional)</option>
                {etapas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <button style={s.btn} onClick={agregarCuota} disabled={guardando}><Plus size={14} /> Agregar cuota</button>
            </div>
          )}
          {cuotas.length === 0 ? (
            <p style={s.meta}>No hay cuotas programadas.</p>
          ) : (
            cuotas.map(c => {
              const etapa = etapas.find(e => e.id === c.stage_id)
              const vencida = cuotaVencida(c)
              return (
                <div key={c.id} style={s.row}>
                  <div style={{ flex: 1 }}>
                    <p style={s.rowTitulo}>{c.concepto}</p>
                    <p style={s.meta}>
                      {formatearCOP(c.monto)}
                      {c.fecha_vencimiento ? ` · vence ${new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-CO')}` : ''}
                      {etapa ? ` · ${etapa.nombre}` : ''}
                    </p>
                  </div>
                  <span style={{
                    ...s.badge,
                    backgroundColor: c.estado === 'pagada' ? '#00b89420' : vencida ? '#d6303120' : '#c9a84c20',
                    color: c.estado === 'pagada' ? '#00b894' : vencida ? '#d63031' : '#c9a84c',
                  }}>
                    {c.estado === 'pagada' ? 'Pagada' : vencida ? 'Vencida' : 'Pendiente'}
                  </span>
                  {puedeEditar && (
                    <button style={s.btnMini} onClick={() => marcarCuota(c, c.estado !== 'pagada')}>
                      {c.estado === 'pagada' ? 'Marcar pendiente' : 'Marcar pagada'}
                    </button>
                  )}
                  {puedeBorrar && (
                    eliminar?.tipo === 'cuota' && eliminar.id === c.id ? (
                      <button style={s.btnDanger} onClick={confirmarEliminar}>Confirmar</button>
                    ) : (
                      <button style={s.iconBtn} onClick={() => setEliminar({ tipo: 'cuota', id: c.id })} title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                </div>
              )
            })
          )}

          <h4 style={s.h4}>Abonos</h4>
          {puedeEditar && (
            <div style={s.formGrid}>
              <input style={s.input} type="number" min="0" step="1000" placeholder="Monto *" value={abono.monto} onChange={e => setAbono({ ...abono, monto: e.target.value })} />
              <input style={s.input} type="date" value={abono.fecha} onChange={e => setAbono({ ...abono, fecha: e.target.value })} />
              <input style={s.input} placeholder="Nota (opcional)" value={abono.notas} onChange={e => setAbono({ ...abono, notas: e.target.value })} />
              <button style={s.btn} onClick={agregarAbono} disabled={guardando}><Plus size={14} /> Registrar abono</button>
            </div>
          )}
          {abonos.length === 0 ? (
            <p style={s.meta}>Aún no hay abonos.</p>
          ) : (
            abonos.map(a => (
              <div key={a.id} style={s.row}>
                <div style={{ flex: 1 }}>
                  <p style={s.rowTitulo}>{formatearCOP(a.monto)}</p>
                  <p style={s.meta}>
                    {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-CO')}
                    {a.notas ? ` · ${a.notas}` : ''}
                  </p>
                </div>
                {puedeBorrar && (
                  eliminar?.tipo === 'abono' && eliminar.id === a.id ? (
                    <button style={s.btnDanger} onClick={confirmarEliminar}>Confirmar</button>
                  ) : (
                    <button style={s.iconBtn} onClick={() => setEliminar({ tipo: 'abono', id: a.id })} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

const s = {
  box: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    border: '1px solid #eef0f3',
  },
  resumen: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' },
  kpi: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '14px 16px' },
  kpiLabel: { display: 'block', fontSize: '11px', color: '#8a94a6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' },
  kpiValor: { fontSize: '18px', fontWeight: 700, color: '#1a1a2e' },
  h4: { fontSize: '14px', fontWeight: 700, color: '#1a1a2e', margin: '18px 0 10px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '10px 14px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  },
  btnMini: {
    background: 'none', border: '1px solid #dfe6e9', borderRadius: '8px', padding: '6px 10px',
    cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#636e72',
  },
  iconBtn: { background: 'none', border: '1px solid #dfe6e9', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#636e72' },
  btnDanger: { backgroundColor: '#d63031', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 },
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid #f0f2f5' },
  rowTitulo: { margin: 0, fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  meta: { margin: '4px 0 0', fontSize: '12px', color: '#8a94a6' },
  hint: { fontSize: '13px', color: '#8a94a6', marginTop: '8px' },
  empty: { color: '#636e72', lineHeight: 1.5 },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' },
}
