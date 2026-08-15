/** Asistente puede trabajar, no eliminar. */
export function puedeEliminar(rol) {
  return rol !== 'asistente'
}

/** El asistente apoya a todo el despacho, así que ve todos los expedientes. */
export function veTodoElDespacho(rol) {
  return ['admin', 'superadmin', 'asistente'].includes(rol)
}
