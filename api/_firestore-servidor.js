// Leer Firestore desde el servidor, entrando como la cuenta robot.
//
// POR QUE ASI Y NO CON UNA CLAVE DE CUENTA DE SERVICIO: la organizacion de
// Google Cloud de la fundacion tiene prohibida la creacion de esas claves, y
// es una buena politica. En vez de debilitarla, el servidor entra como una
// identidad tecnica normal (correo y contrasena) cuyo permiso, definido en
// firestore.rules, es del tamano justo: puede LEER la coleccion `avisos` y
// escribir un unico campo. No ve el peso, ni el IMC, ni las fotos de nadie.

const CLAVE_WEB = () => process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
const PROYECTO = () => process.env.VITE_FIREBASE_PROJECT_ID || 'agua-19c50'
const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${PROYECTO()}/databases/(default)/documents`

let sesion = null // { token, vence }

/** Entra como el robot y devuelve su credencial. Se reusa mientras viva. */
export async function tokenDelRobot() {
  if (sesion && sesion.vence > Date.now() + 60_000) return sesion.token

  const correo = process.env.ROBOT_AVISOS_CORREO
  const contrasena = process.env.ROBOT_AVISOS_CLAVE
  const claveWeb = CLAVE_WEB()
  if (!correo || !contrasena || !claveWeb) return null

  const respuesta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${claveWeb}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo, password: contrasena, returnSecureToken: true }),
    },
  )
  if (!respuesta.ok) {
    console.error('El robot no pudo entrar:', (await respuesta.text()).slice(0, 200))
    return null
  }
  const datos = await respuesta.json()
  sesion = {
    token: datos.idToken,
    vence: Date.now() + Number(datos.expiresIn ?? 3600) * 1000,
  }
  return sesion.token
}

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

/** Todos los documentos de avisos. Devuelve [{ uid, datos }]. */
export async function listarAvisos(token, tope = 300) {
  const respuesta = await fetch(`${BASE()}/avisos?pageSize=${tope}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!respuesta.ok) {
    console.error('No se pudo listar avisos:', (await respuesta.text()).slice(0, 200))
    return []
  }
  const datos = await respuesta.json()
  if (!datos?.documents) return []
  return datos.documents.map((d) => ({
    uid: d.name.split('/').pop(),
    datos: aObjeto(d.fields),
  }))
}

/** Anota cuando se aviso, que es el unico campo que el robot puede tocar. */
export async function anotarAviso(token, uid, cuando) {
  const respuesta = await fetch(
    `${BASE()}/avisos/${uid}?updateMask.fieldPaths=ultimoAviso`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { ultimoAviso: { integerValue: String(Math.round(cuando)) } },
      }),
    },
  )
  return respuesta.ok
}
