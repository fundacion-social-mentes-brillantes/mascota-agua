// Leer Firestore desde el servidor, sin el SDK de Firebase Admin.
//
// Firebase Admin pesa varios megas y aqui solo hace falta LEER unos pocos
// documentos, asi que se hace a mano: se firma un JWT con la cuenta de
// servicio, Google lo cambia por un token de acceso y con eso se consulta la
// API REST de Firestore. Son unas cuarenta lineas y la funcion arranca en
// milisegundos.
import { createSign } from 'node:crypto'

const AMBITO = 'https://www.googleapis.com/auth/datastore'

let tokenGuardado = null // { valor, vence }

function cuentaDeServicio() {
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!crudo) return null
  try {
    return JSON.parse(crudo)
  } catch {
    console.error('FIREBASE_SERVICE_ACCOUNT no es un JSON valido')
    return null
  }
}

function base64Url(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString('base64url')
}

/** Token de acceso de Google. Se reusa mientras siga vivo. */
export async function tokenDeAcceso() {
  if (tokenGuardado && tokenGuardado.vence > Date.now() + 60_000) return tokenGuardado.valor

  const cuenta = cuentaDeServicio()
  if (!cuenta?.private_key || !cuenta?.client_email) return null

  const ahora = Math.floor(Date.now() / 1000)
  const cabecera = base64Url({ alg: 'RS256', typ: 'JWT' })
  const cuerpo = base64Url({
    iss: cuenta.client_email,
    scope: AMBITO,
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  })
  const firmador = createSign('RSA-SHA256')
  firmador.update(`${cabecera}.${cuerpo}`)
  const firma = firmador.sign(cuenta.private_key.replace(/\\n/g, '\n'), 'base64url')

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
  })
  if (!respuesta.ok) {
    console.error('Google no dio token:', (await respuesta.text()).slice(0, 200))
    return null
  }
  const datos = await respuesta.json()
  tokenGuardado = { valor: datos.access_token, vence: Date.now() + datos.expires_in * 1000 }
  return tokenGuardado.valor
}

const PROYECTO = () => process.env.VITE_FIREBASE_PROJECT_ID || 'agua-19c50'
const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${PROYECTO()}/databases/(default)/documents`

/** Convierte el formato con tipos de Firestore a valores normales. */
export function aValorNormal(campo) {
  if (!campo || typeof campo !== 'object') return undefined
  if ('stringValue' in campo) return campo.stringValue
  if ('integerValue' in campo) return Number(campo.integerValue)
  if ('doubleValue' in campo) return campo.doubleValue
  if ('booleanValue' in campo) return campo.booleanValue
  if ('nullValue' in campo) return null
  if ('mapValue' in campo) return aObjeto(campo.mapValue.fields ?? {})
  if ('arrayValue' in campo) return (campo.arrayValue.values ?? []).map(aValorNormal)
  if ('timestampValue' in campo) return campo.timestampValue
  return undefined
}

export function aObjeto(campos) {
  const salida = {}
  for (const [clave, valor] of Object.entries(campos ?? {})) salida[clave] = aValorNormal(valor)
  return salida
}

async function pedir(ruta, token) {
  const respuesta = await fetch(`${BASE()}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!respuesta.ok) return null
  return respuesta.json()
}

/** Todos los perfiles. Devuelve [{ uid, perfil }]. */
export async function listarUsuarios(token, tope = 300) {
  const datos = await pedir(`/usuarios?pageSize=${tope}`, token)
  if (!datos?.documents) return []
  return datos.documents.map((d) => ({
    uid: d.name.split('/').pop(),
    perfil: aObjeto(d.fields),
  }))
}

export async function leerDocumento(token, ruta) {
  const datos = await pedir(`/${ruta}`, token)
  return datos?.fields ? aObjeto(datos.fields) : null
}

/** Escribe solo los campos indicados, sin tocar el resto del documento. */
export async function escribirCampos(token, ruta, campos) {
  const nombres = Object.keys(campos)
  const consulta = nombres.map((n) => `updateMask.fieldPaths=${n}`).join('&')
  const cuerpo = { fields: {} }
  for (const [clave, valor] of Object.entries(campos)) {
    cuerpo.fields[clave] =
      typeof valor === 'number'
        ? { integerValue: String(Math.round(valor)) }
        : typeof valor === 'boolean'
          ? { booleanValue: valor }
          : { stringValue: String(valor) }
  }
  const respuesta = await fetch(`${BASE()}/${ruta}?${consulta}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  return respuesta.ok
}
