import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Search, FileText, Download, Eye, X } from 'lucide-react'

export default function Documentos() {
  const [documentos, setDocumentos] = useState([])
  const [casos, setCasos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCaso, setFiltroCaso] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [vista, setVista] = useState(null)

  useEffect(() => {
    fetchDocumentos()
    fetchCasos()
  }, [])

  useEffect(() => () => { if (vista?.url) URL.revokeObjectURL(vista.url) }, [vista])

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*, cases(titulo)')
      .order('creado_en', { ascending: false })
    setDocumentos(data || [])
    setLoading(false)
  }

  const fetchCasos = async () => {
    const { data } = await supabase.from('cases').select('id, titulo')
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

  const esImagen = (tipo) => tipo?.startsWith('image/')
  const esPdf = (tipo, nombre) => tipo?.includes('pdf') || nombre?.toLowerCase().endsWith('.pdf')

  const documentosFiltrados = documentos.filter(d => {
    const matchBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCaso = filtroCaso ? d.case_id === filtroCaso : true
    const matchTipo = filtroTipo ? d.tipo_documento?.includes(filtroTipo) : true
    return matchBusqueda && matchCaso && matchTipo
  })

  const tipoIcono = (tipo) => {
    if (tipo?.includes('pdf')) return '📕'
    if (tipo?.includes('image')) return '🖼️'
    if (tipo?.includes('word') || tipo?.includes('document')) return '📘'
    return '📄'
  }

  return (
    <div>
      <div style={styles.filtros}>
        <div style={styles.searchBox}>
          <Search size={16} color="#b2bec3" />
          <input style={styles.searchInput} placeholder="Buscar documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
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
          <span>{documentos.length} documentos en total</span>
        </div>
        <div style={styles.statPill}>
          <FileText size={14} color="#c9a84c" />
          <span>{documentosFiltrados.length} resultados</span>
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
            <span>Acción</span>
          </div>
          {documentosFiltrados.map(doc => (
            <div key={doc.id} style={styles.tablaFila}>
              <div style={styles.docNombre}>
                <span style={styles.icono}>{tipoIcono(doc.tipo_documento)}</span>
                <span>{doc.nombre}</span>
              </div>
              <span style={styles.casoTag}>{doc.cases?.titulo || '—'}</span>
              <span style={styles.fecha}>{new Date(doc.creado_en).toLocaleDateString('es-CO')}</span>
              <div style={styles.acciones}>
                <button style={styles.btnVer} onClick={() => visualizar(doc)}>
                  <Eye size={14} /> Ver
                </button>
                <button style={styles.btnDescargar} onClick={() => descargarArchivo(doc)}>
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vista && (
        <div style={styles.viewerBox}>
          <div style={styles.viewerHeader}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{vista.nombre}</span>
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
  filtros: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: '200px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', width: '100%' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #dfe6e9', fontSize: '14px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  statPill: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#636e72', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' },
  tabla: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' },
  tablaHeader: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 160px', padding: '12px 20px', backgroundColor: '#f8f9fa', fontSize: '12px', fontWeight: '600', color: '#b2bec3', textTransform: 'uppercase' },
  tablaFila: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 160px', padding: '16px 20px', borderTop: '1px solid #f0f2f5', alignItems: 'center' },
  docNombre: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#2d3436' },
  icono: { fontSize: '18px' },
  casoTag: { fontSize: '13px', color: '#636e72', backgroundColor: '#f0f2f5', padding: '4px 10px', borderRadius: '20px', display: 'inline-block' },
  fecha: { fontSize: '13px', color: '#b2bec3' },
  acciones: { display: 'flex', gap: '8px', alignItems: 'center' },
  btnVer: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#c9a84c20', color: '#c9a84c', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  btnDescargar: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0984e320', color: '#0984e3', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  viewerBox: { marginTop: '20px', border: '1px solid #dfe6e9', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  viewerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #dfe6e9' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  viewerImg: { display: 'block', maxWidth: '100%', maxHeight: '70vh', margin: '0 auto', padding: '16px' },
  viewerFrame: { width: '100%', height: '70vh', border: 'none' },
  viewerFallback: { padding: '40px', textAlign: 'center' },
}
