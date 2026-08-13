// Reproducir la voz de la mascota.
//
// Un solo audio a la vez: si la mascota ya esta hablando y le llega algo
// nuevo, se calla y dice lo nuevo. Nada de dos voces encimadas.
import { obtenerToken } from './firebase'
import type { NivelCuerpo } from './tipos'

export const VOCES: { id: string; nombre: string; nota: string }[] = [
  { id: 'es-CO-SalomeNeural', nombre: 'Salomé', nota: 'Colombiana, cálida' },
  { id: 'es-CO-GonzaloNeural', nombre: 'Gonzalo', nota: 'Colombiano, tranquilo' },
  { id: 'es-MX-DaliaNeural', nombre: 'Dalia', nota: 'Mexicana, clara' },
  { id: 'es-MX-JorgeNeural', nombre: 'Jorge', nota: 'Mexicano, grave' },
  { id: 'es-MX-Ximena:DragonHDLatestNeural', nombre: 'Ximena HD', nota: 'La más natural' },
  { id: 'es-MX-Tristan:DragonHDLatestNeural', nombre: 'Tristán HD', nota: 'La más natural' },
]

export const VOZ_POR_DEFECTO = VOCES[0].id

let sonando: HTMLAudioElement | null = null
let urlActual: string | null = null

export function callarMascota() {
  if (sonando) {
    sonando.pause()
    sonando = null
  }
  if (urlActual) {
    URL.revokeObjectURL(urlActual)
    urlActual = null
  }
}

/**
 * Hace hablar a la mascota. Devuelve true si de verdad sonó.
 * Si la voz no está configurada en el servidor, no pasa nada: la app sigue
 * funcionando en silencio.
 */
export async function hablar(
  texto: string,
  voz: string = VOZ_POR_DEFECTO,
  animo?: NivelCuerpo,
): Promise<boolean> {
  const limpio = texto.trim()
  if (!limpio) return false

  callarMascota()
  try {
    const token = await obtenerToken()
    if (!token) return false

    const respuesta = await fetch('/api/voz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ texto: limpio, voz, animo }),
    })
    if (!respuesta.ok) return false

    const audio = await respuesta.blob()
    if (audio.size < 800) return false

    urlActual = URL.createObjectURL(audio)
    const reproductor = new Audio(urlActual)
    sonando = reproductor
    reproductor.onended = () => {
      if (sonando === reproductor) callarMascota()
    }
    await reproductor.play()
    return true
  } catch {
    // El navegador puede bloquear el audio si la persona no ha tocado nada
    // todavia. No es un error que valga la pena mostrar.
    return false
  }
}

/** Quita emojis y adornos que la voz leeria en voz alta como basura. */
export function paraLeerEnVoz(texto: string): string {
  return texto
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
