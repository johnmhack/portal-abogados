import { useState } from 'react'
import { supabase } from '../supabase'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'
import fondo from '../assets/fondo_diseño.jpg'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) {
      setError('Error al enviar el correo. Verifica el email.')
    } else {
      setForgotSent(true)
    }
    setLoading(false)
  }

  if (forgotMode) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoBox}>
            <img src={logo} alt="SAR Abogados" style={styles.logo} />
          </div>
          <h2 style={styles.title}>Recuperar contraseña</h2>
          <p style={styles.subtitle}>Te enviaremos un enlace a tu correo</p>

          {forgotSent ? (
            <div style={styles.successBox}>
              ✅ Correo enviado. Revisa tu bandeja de entrada.
            </div>
          ) : (
            <form onSubmit={handleForgot}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Correo electrónico</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p style={styles.error}>⚠️ {error}</p>}
              <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <p style={styles.linkText} onClick={() => { setForgotMode(false); setForgotSent(false); setError('') }}>
            ← Volver al login
          </p>
          <p style={styles.footer}>© 2025 SAR Abogados Especializados</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.overlay} />
      <div style={styles.card}>
        <div style={styles.logoBox}>
          <img src={logo} alt="SAR Abogados" style={styles.logo} />
        </div>
        <h2 style={styles.title}>SAR Abogados</h2>
        <p style={styles.subtitle}>Portal interno</p>

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              style={styles.input}
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.passwordBox}>
              <input
                style={{ ...styles.input, paddingRight: '44px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} color="#5B8B83" /> : <Eye size={18} color="#5B8B83" />}
              </button>
            </div>
          </div>

          <div style={styles.optionsRow}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginRight: '6px', cursor: 'pointer' }}
              />
              Recuérdame
            </label>
            <span style={styles.forgotLink} onClick={() => { setForgotMode(true); setError('') }}>
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          {error && <p style={styles.error}>⚠️ {error}</p>}

          <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={styles.footer}>© 2025 SAR Abogados Especializados</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundImage: `url(${fondo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '48px 40px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '420px',
    position: 'relative',
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(26, 71, 79, 0.65)',
  },
  logoBox: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
  logo: { height: '100px', width: 'auto' },
  title: { textAlign: 'center', color: '#1A474F', fontSize: '24px', fontWeight: '700', marginBottom: '4px' },
  subtitle: { textAlign: 'center', color: '#5B8B83', fontSize: '14px', marginBottom: '32px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A474F', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#2c3e50' },
  passwordBox: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0' },
  optionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  checkLabel: { display: 'flex', alignItems: 'center', fontSize: '13px', color: '#636e72', cursor: 'pointer' },
  forgotLink: { fontSize: '13px', color: '#1A474F', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' },
  button: { width: '100%', padding: '13px', backgroundColor: '#1A474F', color: '#CFB27E', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', letterSpacing: '0.5px' },
  error: { color: '#d63031', fontSize: '13px', marginBottom: '12px', backgroundColor: '#fff5f5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ffcccc' },
  successBox: { backgroundColor: '#f0fff4', color: '#00b894', padding: '14px', borderRadius: '8px', border: '1px solid #00b89440', fontSize: '14px', marginBottom: '16px', textAlign: 'center' },
  linkText: { textAlign: 'center', fontSize: '13px', color: '#1A474F', cursor: 'pointer', marginTop: '20px', fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '28px' }
}