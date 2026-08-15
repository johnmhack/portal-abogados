/** Asistente puede trabajar, no eliminar. */
export function puedeEliminar(rol) {
  return rol !== 'asistente'
}

/** El asistente apoya a todo el despacho, así que ve todos los expedientes. */
export function veTodoElDespacho(rol) {
  return ['admin', 'superadmin', 'asistente'].includes(rol)
}

/** Solo Ruby / asistente / superadmin crean y editan la cartera de clientes. */
export function puedeGestionarClientes(rol) {
  return veTodoElDespacho(rol)
}

/** Teléfono, correo y dirección: solo despacho (no abogados externos). */
export function veContactoCliente(rol) {
  return veTodoElDespacho(rol)
}

const ESTADOS_CANDADO = ['cerrado', 'ganado', 'perdido']

export function casoConCandado(status) {
  return ESTADOS_CANDADO.includes(status)
}

/**
 * Caso cerrado: abogado solo lectura.
 * Despacho (admin/asistente/superadmin) sí puede editar (p. ej. reabrir).
 */
export function puedeEditarCaso(rol, status) {
  if (veTodoElDespacho(rol)) return true
  return !casoConCandado(status)
}
