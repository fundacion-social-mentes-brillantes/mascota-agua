// Quien esta llamando a nuestras rutas de /api.
//
// POR QUE EXISTE ESTO: sin esta comprobacion, cualquiera en internet podria
// mandarle peticiones a /api/mascota y gastarse el saldo de DeepSeek de la
// fundacion. Ya paso una vez en otro proyecto y el candado era solo visual.
//
// Como funciona sin necesidad de clave de servicio: el navegador manda el
// token de Firebase de la persona conectada, y aqui se le pregunta a Google
// si ese token es valido Y si pertenece a ESTE proyecto (la clave web amarra
// la consulta al proyecto). Si no, no hay respuesta.

const URL_GOOGLE = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup'

export async function quienLlama(req) {
  const cabecera = req.headers?.authorization || req.headers?.Authorization || ''
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : ''
  if (!token) return null

  const clave = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
  if (!clave) {
    console.error('Falta FIREBASE_API_KEY: no se puede verificar quien llama.')
    return null
  }

  try {
    const control = new AbortController()
    const tiempo = setTimeout(() => control.abort(), 5000)
    const respuesta = await fetch(`${URL_GOOGLE}?key=${clave}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: control.signal,
    })
    clearTimeout(tiempo)
    if (!respuesta.ok) return null
    const datos = await respuesta.json()
    return datos?.users?.[0]?.localId ?? null
  } catch {
    return null
  }
}
