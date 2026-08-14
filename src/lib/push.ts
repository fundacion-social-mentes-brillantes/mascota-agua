// Suscribir el telefono a los avisos de la mascota.
//
// Como funciona, en cristiano: el telefono le pide permiso a la persona, y si
// dice que si, el navegador le entrega a la app una direccion secreta suya.
// Esa direccion se guarda en Firestore. Cuando el servidor quiere avisar,
// manda el mensaje a esa direccion y el telefono lo muestra, este la app
// abierta o cerrada.
import { doc, setDoc } from 'firebase/firestore'
import { obtenerDb } from './firebase'

const LLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLICA as string | undefined

export function pushSoportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(LLAVE_PUBLICA)
  )
}

/** La llave viene en base64 para URL y el navegador la pide en bytes. */
function aBytes(base64: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = window.atob(normal)
  const bytes = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes
}

export interface ResultadoSuscripcion {
  ok: boolean
  motivo?: 'sin-soporte' | 'sin-permiso' | 'fallo'
}

export async function suscribirAvisos(uid: string): Promise<ResultadoSuscripcion> {
  if (!pushSoportado()) return { ok: false, motivo: 'sin-soporte' }

  try {
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return { ok: false, motivo: 'sin-permiso' }

    const registro = await navigator.serviceWorker.ready
    let suscripcion = await registro.pushManager.getSubscription()
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: aBytes(LLAVE_PUBLICA!) as BufferSource,
      })
    }

    const datos = suscripcion.toJSON()
    await setDoc(
      doc(obtenerDb(), 'avisos', uid),
      {
        endpoint: datos.endpoint,
        claves: datos.keys ?? {},
        // Sirve para no despertar a nadie de madrugada aunque el servidor
        // este en otro huso horario.
        desfaseMinutos: new Date().getTimezoneOffset(),
        actualizado: Date.now(),
      },
      { merge: true },
    )
    return { ok: true }
  } catch {
    return { ok: false, motivo: 'fallo' }
  }
}

export async function quitarAvisos(uid: string): Promise<void> {
  try {
    const registro = await navigator.serviceWorker.ready
    const suscripcion = await registro.pushManager.getSubscription()
    if (suscripcion) await suscripcion.unsubscribe()
    await setDoc(
      doc(obtenerDb(), 'avisos', uid),
      { endpoint: '', claves: {}, actualizado: Date.now() },
      { merge: true },
    )
  } catch {
    /* si no habia nada suscrito, no pasa nada */
  }
}

/**
 * Deja en `avisos/{uid}` lo MINIMO que el servidor necesita para decidir si
 * mandar un empujon. Nada de peso, ni IMC, ni fotos: solo a que telefono
 * avisar, a que hora duerme, cuanta agua lleva hoy y cuando fue el ultimo
 * trago. Se llama al abrir la app y cada vez que se registra agua.
 */
export async function sincronizarAvisos(
  uid: string,
  datos: {
    activo: boolean
    horaDespertar: string
    horaDormir: string
    metaMl: number
    /** Para que el servidor pueda calcular el minimo vital de esta persona. */
    pesoKg: number
    totalHoyMl: number
    dia: string
    ultimoTrago: number | null
    nombreMascota: string
  },
): Promise<void> {
  try {
    await setDoc(
      doc(obtenerDb(), 'avisos', uid),
      {
        ...datos,
        ultimoTrago: datos.ultimoTrago ?? 0,
        desfaseMinutos: new Date().getTimezoneOffset(),
        actualizado: Date.now(),
      },
      { merge: true },
    )
  } catch {
    // Si falla no pasa nada grave: el aviso simplemente sale con datos un
    // poquito viejos la proxima vez.
  }
}

export async function estaSuscrito(): Promise<boolean> {
  if (!pushSoportado()) return false
  try {
    const registro = await navigator.serviceWorker.ready
    return Boolean(await registro.pushManager.getSubscription())
  } catch {
    return false
  }
}
