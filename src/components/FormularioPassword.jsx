import { useState } from 'react'
import { supabase } from '../supabase'
import { Eye, EyeOff } from 'lucide-react'

const TEMPORAL = 'Temporal123!'

export default function FormularioPassword({
  email,
  modoRecuperacion = false,
  onListo,
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState({ actual: false, nueva: false, confirmar: false })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (campo) => setShow((s) => ({ ...s, [campo]: !s[campo] }))

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')

    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nueva === TEMPORAL) {
      setError('Elige una contraseña distinta a Temporal123!.')
      return
    }
    if (nueva !== confirmar) {
      setError('La confirmación no coincide.')
      return
    }

    setLoading(true)
    try {
      if (!modoRecuperacion) {
        if (!actual) {
          setError('Escribe tu contraseña actual.')
          setLoading(false)
          return
        }
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password: actual,
        })
        if (loginError) {
          setError('La contraseña actual no es correcta.')
          setLoading(false)
          return
        }
      }

      const { error: updError } = await supabase.auth.updateUser({ password: nueva })
      if (updError) {
        setError(updError.message || 'No se pudo actualizar la contraseña.')
        setLoading(false)
        return
      }

      setActual('')
      setNueva('')
      setConfirmar('')
      setOk('Contraseña actualizada. Ya puedes entrar con la nueva.')
      onListo?.()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={guardar} style={styles.form}>
      {!modoRecuperacion && (
        <Campo
          label="Contraseña actual"
          value={actual}
          onChange={setActual}
          visible={show.actual}
          onToggle={() => toggle('actual')}
          placeholder="Temporal123! u otra que ya uses"
        />
      )}
      <Campo
        label="Nueva contraseña"
        value={nueva}
        onChange={setNueva}
        visible={show.nueva}
        onToggle={() => toggle('nueva')}
        placeholder="Mínimo 8 caracteres"
      />
      <Campo
        label="Confirmar nueva contraseña"
        value={confirmar}
        onChange={setConfirmar}
        visible={show.confirmar}
        onToggle={() => toggle('confirmar')}
      />
      {error && <p style={styles.error}>{error}</p>}
      {ok && <p style={styles.ok}>{ok}</p>}
      <button type="submit" style={styles.btn} disabled={loading}>
        {loading ? 'Guardando...' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}

function Campo({ label, value, onChange, visible, onToggle, placeholder }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <div style={styles.passBox}>
        <input
          style={styles.input}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button type="button" style={styles.eye} onClick={onToggle} tabIndex={-1}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#636e72', marginBottom: '6px' },
  passBox: { position: 'relative' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '11px 42px 11px 14px',
    borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none',
  },
  eye: {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: 0,
    display: 'flex',
  },
  btn: {
    backgroundColor: '#1a1a2e', color: '#c9a84c', border: 'none', padding: '12px',
    borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
  },
  error: { margin: 0, color: '#d63031', fontSize: '13px', fontWeight: 600 },
  ok: { margin: 0, color: '#00b894', fontSize: '13px', fontWeight: 600 },
}
