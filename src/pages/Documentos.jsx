import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Search, FileText, Download, Eye, X, Trash2, Image, File } from 'lucide-react'
import { puedeEliminar, veTodoElDespacho } from '../lib/permisos'

export default function Documentos({ userProfile }) {
  const [documentos, setDocumentos] = useState([])
  const [casos, setCasos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCaso, setFiltroCaso] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [vista, setVista] = useState(null)
  const [docEliminar, setDocEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    fetchDocumentos()
    fetchCasos()
  }, [])

  useEffect(() => () => { if (vista?.url) URL.revokeObjectURL(vista.url) }, [vista])

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*, cases!inner(titulo, abogado_id)')
      .order('creado_en', { ascending: false })

    let docs = data || []
    if (userProfile?.id && !veTodoElDespacho(userProfile?.rol)) {
      docs = docs.filter(d => d.cases?.abogado_id === userProfile.id)
    }
    setDocumentos(docs)
    setLoading(false)
  }

  const fetchCasos = async () => {
    let query = supabase.from('cases').select('id, titulo')
    if (userProfile?.id && !veTodoElDespacho(userProfile?.rol)) {
      query = query.eq('abogado_id', userProfile.id)
    }
    const { data } = await query
    setCasos(data || [])
  }

  const obtenerBlobUrl = async (doc) => {
    const { data } = await supabase.storage.from('documentos').download(doc.url)
    if (!data) return null
    return URL.createObjectURL(data)
  }

  const descargarArchivo = async (doc) => {
    const url = await obtenerBlobUrl(doc)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = doc.nombre
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const visualizar = async (doc) => {
    if (vista?.url) URL.revokeObjectURL(vista.url)
    const url = await obtenerBlobUrl(doc)
    if (url) setVista({ ...doc, url })
  }

  const cerrarVista = () => {
    if (vista?.url) URL.revokeObjectURL(vista.url)
    setVista(null)
  }

  const eliminarDocumento = async () => {
    if (!docEliminar) return
    setEliminando(true)
    await supabase.storage.from('documentos').remove([docEliminar.url])
    const { error } = await supabase.from('documents').delete().eq('id', docEliminar.id)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar el documento.')
      return
    }
    if (vista?.id === docEliminar.id) cerrarVista()
    setDocEliminar(null)
    fetchDocumentos()
  }

  const esImagen = (tipo) => tipo?.startsWith('image/')
  const esPdf = (tipo, nombre) => tipo?.includes('pdf') || nombre?.toLowerCase().endsWith('.pdf')

  const documentosFiltrados = documentos.filter(d => {
    const matchBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCaso = filtroCaso ? d.case_id === filtroCaso : true
    const matchTipo = filtroTipo ? d.tipo_documento?.includes(filtroTipo) : true
    return matchBusqueda && matchCaso && matchTipo
  })

  const TipoIcon = ({ tipo }) => {
    if (tipo?.includes('pdf')) return <FileText size={18} color="#d63031" />
    if (tipo?.includes('image')) return <Image size={18} color="#0984e3" />
    if (tipo?.includes('word') || tipo?.includes('document')) return <File size={18} color="#0984e3" />
    return <FileText size={18} color="#c9a84c" />
  }

  return (
    <div>
      <div style={styles.filtros}>
        <div style={styles.searchBox}>
          <Search size={18} color="#8b949e" />
          <input
            style={styles.searchInput}
            placeholder="Buscar documento..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select style={styles.select} value={filtroCaso} onChange={e => setFiltroCaso(e.target.value)}>
          <option value="">Todos los casos</option>
          {casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
        <select style={styles.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="pdf">PDF</option>
          <option value="image">Imagen</option>
          <option value="word">Word</option>
        </select>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statPill}>
          <FileText size={14} color="#0984e3" />
          <span><strong>{documentos.length}</strong> en total</span>
        </div>
        <div style={styles.statPill}>
          <FileText size={14} color="#c9a84c" />
          <span><strong>{documentosFiltrados.length}</strong> resultados</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#b2bec3' }}>Cargando...</p>
      ) : documentosFiltrados.length === 0 ? (
        <div style={styles.empty}>
          <FileText size={40} color="#dfe6e9" />
          <p style={{ color: '#b2bec3', marginTop: '12px' }}>No hay documentos</p>
        </div>
      ) : (
        <div style={styles.tabla}>
          <div style={styles.tablaHeader}>
            <span>Documento</span>
            <span>Caso</span>
            <span>Fecha</span>
            <span>Acciones</span>
          </div>
          {documentosFiltrados.map(doc => (
            <div key={doc.id} style={styles.tablaFila}>
              <div style={styles.docNombre}>
                <div style={styles.iconWrap}>
                  <TipoIcon tipo={doc.tipo_documento} />
                </div>
                <span style={styles.docTexto}>{doc.nombre}</span>
              </div>
              <span style={styles.casoTag}>{doc.cases?.titulo || '—'}</span>
              <span style={styles.fecha}>
                {doc.creado_en ? new Date(doc.creado_en).toLocaleDateString('es-CO') : '—'}
              </span>
              <div style={styles.acciones}>
                <button style={styles.btnVer} onClick={() => visualizar(doc)} title="Ver">
                  <Eye size={14} /> Ver
                </button>
                <button style={styles.btnDescargar} onClick={() => descargarArchivo(doc)} title="Descargar">
                  <Download size={14} />
                </button>
                {puedeEliminar(userProfile?.rol) && (
                  <button style={styles.btnEliminar} onClick={() => setDocEliminar(doc)} title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {docEliminar && (
        <div style={styles.confirmBox}>
          <p style={styles.confirmText}>
            ¿Eliminar <strong>{docEliminar.nombre}</strong>? Esta acción no se puede deshacer.
          </p>
          <div style={styles.confirmActions}>
            <button style={styles.btnCancelar} onClick={() => setDocEliminar(null)} disabled={eliminando}>Cancelar</button>
            <button style={styles.btnConfirmarEliminar} onClick={eliminarDocumento} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
            </button>
          </div>
        </div>
      )}

      {vista && (
        <div style={styles.viewerBox}>
          <div style={styles.viewerHeader}>
            <span style={styles.viewerTitle}>{vista.nombre}</span>
            <button style={styles.closeBtn} onClick={cerrarVista}><X size={18} /></button>
          </div>
          {esImagen(vista.tipo_documento) ? (
            <img src={vista.url} alt={vista.nombre} style={styles.viewerImg} />
          ) : esPdf(vista.tipo_documento, vista.nombre) ? (
            <iframe src={vista.url} title={vista.nombre} style={styles.viewerFrame} />
          ) : (
            <div style={styles.viewerFallback}>
              <p style={{ color: '#636e72', marginBottom: '12px' }}>Vista previa no disponible para este tipo de archivo.</p>
              <button style={styles.btnDescargar} onClick={() => descargarArchivo(vista)}>Descargar archivo</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  filtros: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#fff',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #eef0f3',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    flex: 1,
    minWidth: '200px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    color: '#1a1a2e',
    background: 'transparent',
  },
  select: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #eef0f3',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    color: '#1a1a2e',
  },
  statsRow: { display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fff',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#636e72',
    border: '1px solid #eef0f3',
    boxShadow: '0 2px 8px rgba(26,26,46,0.04)',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '14px',
    border: '1px solid #eef0f3',
  },
  tabla: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
    border: '1px solid #eef0f3',
    overflow: 'hidden',
  },
  tablaHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 200px',
    padding: '14px 20px',
    backgroundColor: '#fafbfc',
    fontSize: '11px',
    fontWeight: '700',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #eef0f3',
  },
  tablaFila: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 200px',
    padding: '14px 20px',
    borderTop: '1px solid #f0f2f5',
    alignItems: 'center',
    gap: '8px',
  },
  docNombre: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  iconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#f5f6fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid #eef0f3',
  },
  docTexto: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  casoTag: {
    fontSize: '12px',
    color: '#636e72',
    backgroundColor: '#f5f6fa',
    padding: '5px 10px',
    borderRadius: '20px',
    display: 'inline-block',
    fontWeight: '600',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fecha: { fontSize: '13px', color: '#8b949e', fontWeight: '500' },
  acciones: { display: 'flex', gap: '8px', alignItems: 'center' },
  btnVer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#c9a84c20',
    color: '#c9a84c',
    border: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px',
  },
  btnDescargar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0984e318',
    color: '#0984e3',
    border: 'none',
    padding: '7px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnEliminar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d6303118',
    color: '#d63031',
    border: 'none',
    padding: '7px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmBox: {
    marginTop: '16px',
    backgroundColor: '#fff5f5',
    border: '1px solid #fab1a0',
    borderRadius: '12px',
    padding: '14px',
  },
  confirmText: { fontSize: '13px', color: '#636e72', marginBottom: '12px', lineHeight: 1.4 },
  confirmActions: { display: 'flex', gap: '8px' },
  btnCancelar: {
    flex: 1,
    backgroundColor: '#fff',
    color: '#636e72',
    border: '1px solid #dfe6e9',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  },
  btnConfirmarEliminar: {
    flex: 1,
    backgroundColor: '#d63031',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  },
  viewerBox: {
    marginTop: '20px',
    border: '1px solid #eef0f3',
    borderRadius: '14px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    boxShadow: '0 2px 10px rgba(26,26,46,0.05)',
  },
  viewerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #eef0f3',
    backgroundColor: '#fafbfc',
  },
  viewerTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' },
  viewerImg: { display: 'block', maxWidth: '100%', maxHeight: '70vh', margin: '0 auto', padding: '16px' },
  viewerFrame: { width: '100%', height: '70vh', border: 'none' },
  viewerFallback: { padding: '40px', textAlign: 'center' },
}
