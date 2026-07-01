import { useState } from 'react'
import { supabase } from '../supabase'
import logo from '../assets/LOGO_RUBY_RAMOS_SIMBOLO.svg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div style={styles.container}>
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
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
    backgroundColor: '#1A474F',
    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0,95,97,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(91,139,131,0.3) 0%, transparent 50%)',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '48px 40px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '420px',
  },
  logoBox: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  logo: {
    height: '70px',
    width: 'auto',
  },
  title: {
    textAlign: 'center',
    color: '#1A474F',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#5B8B83',
    fontSize: '14px',
    marginBottom: '32px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1A474F',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1.5px solid #ddd',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    color: '#2c3e50',
  },
  button: {
    width: '100%',
    padding: '13px',
    backgroundColor: '#1A474F',
    color: '#CFB27E',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    letterSpacing: '0.5px',
  },
  error: {
    color: '#d63031',
    fontSize: '13px',
    marginBottom: '12px',
    backgroundColor: '#fff5f5',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #ffcccc',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    marginTop: '28px',
  }
}