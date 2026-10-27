export function formatearCOP(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function parseMonto(texto) {
  if (texto == null || texto === '') return NaN
  const n = Number(String(texto).replace(/\s/g, '').replace(',', '.'))
  return n
}
