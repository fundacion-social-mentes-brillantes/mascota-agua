// El habla de la mascota.
//
// La clave de DeepSeek NUNCA vive aqui: esto le pregunta a /api/mascota, que
// corre en el servidor y es quien tiene la clave. Si el servidor no responde
// (sin internet, sin clave configurada), la mascota contesta con sus propias
// frases y la app sigue sirviendo.
import { obtenerToken } from './firebase'
import { describirCuerpo } from './frases'
import { etiquetaDe, organosAhora } from './organos'
import type { EstadoCuerpo, Mascota, MensajeChat, Perfil } from './tipos'

export interface RespuestaMascota {
  texto: string
  /** True si la respuesta la escribio el modelo; false si es de repuesto. */
  deIA: boolean
}

function respuestaDeRepuesto(estado: EstadoCuerpo, mascota: Mascota): string {
  const lineas = describirCuerpo(estado)
  const faltan = Math.max(0, estado.metaMl - estado.totalHoyMl)
  const cierre =
    faltan > 0
      ? `Nos faltan ${faltan} ml para la meta de hoy.`
      : 'Ya cumplimos la meta de hoy, y eso se siente.'
  return `${lineas.join(' ')} ${cierre} (Ahora mismo no tengo conexión para pensar mejor, pero los números son reales.) — ${mascota.nombre}`
}

/** Todo lo que la mascota necesita saber de ti para hablar con sentido. */
function contextoDe(perfil: Perfil, mascota: Mascota, estado: EstadoCuerpo) {
  return {
    mascota: {
      nombre: mascota.nombre,
      especie: mascota.especie,
      nivel: mascota.nivel,
      gotas: mascota.gotas,
    },
    persona: {
      nombre: perfil.nombre,
      edad: perfil.edad,
      requiereMedico: perfil.requiereMedico,
    },
    hoy: {
      tomadoMl: estado.totalHoyMl,
      metaMl: estado.metaMl,
      porcentaje: estado.porcentaje,
      horasSinBeber: Number.isFinite(estado.horasSinBeber)
        ? Math.round(estado.horasSinBeber * 10) / 10
        : null,
      nivelDelCuerpo: estado.nivel,
      hidratacion: estado.hidratacion,
      alertaExceso: estado.alertaExceso,
      loQuePasa: estado.loQuePasa,
    },
    // Los organos que ya lo estan sintiendo, con su mecanismo. Asi la
    // mascota puede decir "mi rinon esta exprimiendo" y ser exacta, en vez
    // de hablar en general.
    organos: organosAhora(estado)
      .filter((o) => o.estado !== 'bien')
      .slice(0, 4)
      .map((o) => `${o.nombre} (${etiquetaDe(o.estado).toLowerCase()}): ${o.queLePasa}`),
  }
}

export async function hablarConLaMascota(
  pregunta: string,
  perfil: Perfil,
  mascota: Mascota,
  estado: EstadoCuerpo,
  anteriores: MensajeChat[],
): Promise<RespuestaMascota> {
  try {
    const token = await obtenerToken()
    if (!token) return { texto: respuestaDeRepuesto(estado, mascota), deIA: false }
    const respuesta = await fetch('/api/mascota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pregunta,
        contexto: contextoDe(perfil, mascota, estado),
        historial: anteriores.slice(-8).map((m) => ({ de: m.de, texto: m.texto })),
      }),
    })
    if (!respuesta.ok) return { texto: respuestaDeRepuesto(estado, mascota), deIA: false }
    const datos = (await respuesta.json()) as { texto?: string }
    if (!datos.texto) return { texto: respuestaDeRepuesto(estado, mascota), deIA: false }
    return { texto: datos.texto, deIA: true }
  } catch {
    return { texto: respuestaDeRepuesto(estado, mascota), deIA: false }
  }
}

/**
 * Una burbuja: lo que la mascota suelta sola en la pantalla principal.
 *
 * Si no hay conexion o no hay clave, devuelve null y la pantalla usa la
 * frase local de personalidad.ts. Nunca se queda callada.
 */
export async function pedirBurbuja(
  perfil: Perfil,
  mascota: Mascota,
  estado: EstadoCuerpo,
  momento: string,
): Promise<string | null> {
  try {
    const token = await obtenerToken()
    if (!token) return null
    const respuesta = await fetch('/api/mascota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tipo: 'burbuja',
        momento,
        contexto: contextoDe(perfil, mascota, estado),
      }),
    })
    if (!respuesta.ok) return null
    const datos = (await respuesta.json()) as { texto?: string }
    const limpio = datos.texto?.trim().replace(/^["“”']|["“”']$/g, '')
    return limpio || null
  } catch {
    return null
  }
}

/** Lo primero que dice la mascota cuando se abre la conversacion. */
export function saludoInicial(mascota: Mascota, estado: EstadoCuerpo): string {
  if (!Number.isFinite(estado.horasSinBeber)) {
    return `Hola. Soy ${mascota.nombre}, o más bien: soy tu cuerpo con cara. Hoy todavía no me has dado nada de agua. Pregúntame lo que quieras.`
  }
  return `Hola. Vamos en ${estado.totalHoyMl} ml de ${estado.metaMl}. Pregúntame cómo estoy, o cualquier cosa sobre el agua.`
}
