// Todo lo que se guarda en Firestore, en un solo archivo.
//
// Estructura (cada persona solo alcanza su propia rama, ver firestore.rules):
//   usuarios/{uid}                 -> el perfil
//   usuarios/{uid}/estado/mascota  -> la mascota y sus gotas
//   usuarios/{uid}/registros/{id}  -> cada trago de agua
//   usuarios/{uid}/dias/{AAAA-MM-DD} -> el total de cada dia (para el historico)
//   usuarios/{uid}/chat/{id}       -> la conversacion con la mascota
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { obtenerDb } from './firebase'
import type { Mascota, MensajeChat, Perfil, Registro, ResumenDia } from './tipos'

/** Día local en AAAA-MM-DD. Usa la hora del teléfono, no UTC. */
export function diaDe(fecha: Date | number = Date.now()): string {
  const d = typeof fecha === 'number' ? new Date(fecha) : fecha
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

const refPerfil = (uid: string) => doc(obtenerDb(), 'usuarios', uid)
const refMascota = (uid: string) => doc(obtenerDb(), 'usuarios', uid, 'estado', 'mascota')
const colRegistros = (uid: string) => collection(obtenerDb(), 'usuarios', uid, 'registros')
const colDias = (uid: string) => collection(obtenerDb(), 'usuarios', uid, 'dias')
const colChat = (uid: string) => collection(obtenerDb(), 'usuarios', uid, 'chat')

// ---------------------------------------------------------------- perfil

export function escucharPerfil(uid: string, alCambiar: (perfil: Perfil | null) => void): Unsubscribe {
  return onSnapshot(
    refPerfil(uid),
    (instantanea) => alCambiar(instantanea.exists() ? (instantanea.data() as Perfil) : null),
    () => alCambiar(null),
  )
}

/**
 * Guarda el perfil. Firestore RECHAZA cualquier campo con valor undefined,
 * asi que aqui se limpian; y para borrar de verdad la meta puesta a mano hay
 * que mandar deleteField(), porque con merge un campo ausente se queda como
 * estaba.
 */
export async function guardarPerfil(
  uid: string,
  perfil: Perfil,
  opciones?: { quitarMetaManual?: boolean },
): Promise<void> {
  const datos: Record<string, unknown> = { ...perfil, actualizado: Date.now() }
  for (const clave of Object.keys(datos)) {
    if (datos[clave] === undefined) delete datos[clave]
  }
  if (opciones?.quitarMetaManual) datos.metaManualMl = deleteField()
  await setDoc(refPerfil(uid), datos, { merge: true })
}

// --------------------------------------------------------------- mascota

export function escucharMascota(
  uid: string,
  alCambiar: (mascota: Mascota | null) => void,
): Unsubscribe {
  return onSnapshot(
    refMascota(uid),
    (instantanea) => alCambiar(instantanea.exists() ? (instantanea.data() as Mascota) : null),
    () => alCambiar(null),
  )
}

export async function guardarMascota(uid: string, mascota: Mascota): Promise<void> {
  await setDoc(refMascota(uid), mascota, { merge: true })
}

export async function sumarGotas(uid: string, cantidad: number, xp = 0): Promise<void> {
  await setDoc(
    refMascota(uid),
    { gotas: increment(cantidad), xp: increment(xp) },
    { merge: true },
  )
}

// -------------------------------------------------------------- registros

/** Escucha los tragos de un día. Ordena aquí para no pedir índices a Firestore. */
export function escucharRegistrosDelDia(
  uid: string,
  dia: string,
  alCambiar: (registros: Registro[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(colRegistros(uid), where('dia', '==', dia)),
    (instantanea) => {
      const lista = instantanea.docs.map((d) => ({ ...(d.data() as Registro), id: d.id }))
      lista.sort((a, b) => b.hora - a.hora)
      alCambiar(lista)
    },
    () => alCambiar([]),
  )
}

/** La hora y el dia los pone esta capa, no la pantalla. */
export async function agregarRegistro(
  uid: string,
  datos: Omit<Registro, 'id' | 'hora' | 'dia'>,
  metaMl: number,
): Promise<string> {
  const ahora = Date.now()
  const registro: Omit<Registro, 'id'> = { ...datos, hora: ahora, dia: diaDe(ahora) }
  const referencia = await addDoc(colRegistros(uid), registro)
  // El servidor de avisos necesita saber cuando fue el ultimo trago para no
  // mandar un "tengo sed" justo despues de que la persona tomo agua.
  await setDoc(
    doc(obtenerDb(), 'usuarios', uid, 'estado', 'avisos'),
    { ultimoTragoVisto: ahora },
    { merge: true },
  ).catch(() => {})
  // El total del día se guarda aparte para poder dibujar el histórico sin
  // tener que leer todos los tragos de todos los días.
  await setDoc(
    doc(colDias(uid), registro.dia),
    {
      dia: registro.dia,
      totalMl: increment(registro.ml),
      tragos: increment(1),
      conFoto: increment(registro.tieneFotoLocal ? 1 : 0),
      metaMl,
    },
    { merge: true },
  )
  return referencia.id
}

export async function borrarRegistro(uid: string, registro: Registro): Promise<void> {
  const lote = writeBatch(obtenerDb())
  lote.delete(doc(colRegistros(uid), registro.id))
  lote.set(
    doc(colDias(uid), registro.dia),
    {
      totalMl: increment(-registro.ml),
      tragos: increment(-1),
      conFoto: increment(registro.tieneFotoLocal ? -1 : 0),
    },
    { merge: true },
  )
  await lote.commit()
}

/** Los últimos días, del más reciente al más viejo. */
export async function leerHistorico(uid: string, cuantos = 30): Promise<ResumenDia[]> {
  const instantanea = await getDocs(
    query(colDias(uid), orderBy('dia', 'desc'), limit(cuantos)),
  )
  return instantanea.docs.map((d) => {
    const datos = d.data() as Partial<ResumenDia>
    return {
      dia: datos.dia ?? d.id,
      totalMl: datos.totalMl ?? 0,
      metaMl: datos.metaMl ?? 0,
      tragos: datos.tragos ?? 0,
      conFoto: datos.conFoto ?? 0,
    }
  })
}

// ------------------------------------------------------------------ chat

export function escucharChat(
  uid: string,
  alCambiar: (mensajes: MensajeChat[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(colChat(uid), orderBy('hora', 'desc'), limit(60)),
    (instantanea) => {
      const lista = instantanea.docs.map((d) => ({ ...(d.data() as MensajeChat), id: d.id }))
      lista.reverse()
      alCambiar(lista)
    },
    () => alCambiar([]),
  )
}

/** La hora la pone esta capa: las pantallas no tienen por que mirar el reloj. */
export async function guardarMensaje(
  uid: string,
  de: MensajeChat['de'],
  texto: string,
): Promise<void> {
  await addDoc(colChat(uid), { de, texto, hora: Date.now() })
}

export async function borrarChat(uid: string): Promise<void> {
  const instantanea = await getDocs(colChat(uid))
  const lote = writeBatch(obtenerDb())
  instantanea.docs.forEach((d) => lote.delete(d.ref))
  await lote.commit()
}

/** Borrar la cuenta entera: registros, días, chat, mascota y perfil. */
export async function borrarTodo(uid: string): Promise<void> {
  for (const coleccion of [colRegistros(uid), colDias(uid), colChat(uid)]) {
    const instantanea = await getDocs(coleccion)
    // Firestore acepta 500 operaciones por lote; se va de a 400 por si acaso.
    for (let i = 0; i < instantanea.docs.length; i += 400) {
      const lote = writeBatch(obtenerDb())
      instantanea.docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref))
      await lote.commit()
    }
  }
  await deleteDoc(refMascota(uid))
  await deleteDoc(refPerfil(uid))
}
