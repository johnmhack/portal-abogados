export const CONTACTO_DESPACHO = {
  nombre: 'SAR Consultores Integrales',
  telefono: '+57 302 356 7742',
  telefonoHref: 'tel:+573023567742',
  email: 'contacto@abogadossar.com',
  emailHref: 'mailto:contacto@abogadossar.com',
  web: 'www.abogadossar.com',
  webHref: 'https://www.abogadossar.com',
}

export function lineaContactoDespacho() {
  const { telefono, email, web } = CONTACTO_DESPACHO
  return `${telefono}  ·  ${email}  ·  ${web}`
}
