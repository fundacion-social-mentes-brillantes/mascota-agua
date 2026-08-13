// Lo que la mascota dice por su cuenta, sin que le pregunten.
//
// Esto es lo que la separa de un contador de vasos. Un contador te muestra un
// numero; alguien te SALUDA, se acuerda de como fue ayer y te dice que siente
// cuando le das agua. Todo esto sale del telefono, sin gastar API: es
// instantaneo y funciona sin internet.
import type { EstadoCuerpo, Perfil, ResumenDia } from './tipos'

function franjaDelDia(hora: number): 'madrugada' | 'manana' | 'tarde' | 'noche' {
  if (hora < 5) return 'madrugada'
  if (hora < 12) return 'manana'
  if (hora < 19) return 'tarde'
  return 'noche'
}

/** Una sola frase, la primera que la persona lee al abrir la app. */
export function saludoAlEntrar(
  perfil: Perfil,
  estado: EstadoCuerpo,
  ayer: ResumenDia | null,
  rachaDias: number,
): string {
  const hora = new Date().getHours()
  const franja = franjaDelDia(hora)
  const nombre = perfil.nombre
  const faltan = Math.max(0, estado.metaMl - estado.totalHoyMl)
  const primerTrago = !Number.isFinite(estado.horasSinBeber)

  if (estado.alertaExceso) {
    return `Ey, ${nombre}, frena tantico. Vas muy rápido y el riñón no da abasto.`
  }

  if (franja === 'madrugada') {
    return primerTrago
      ? `¿Y usted qué hace despierto a esta hora, ${nombre}? Si va a tomar agua, que sea poquita.`
      : `A esta hora yo ya debería estar durmiendo, pero aquí estamos.`
  }

  if (primerTrago) {
    if (franja === 'manana') {
      return rachaDias > 1
        ? `Buenos días, ${nombre}. Llevamos ${rachaDias} días seguidos cumpliendo. No rompamos la racha hoy.`
        : `Buenos días, ${nombre}. Llevo toda la noche sin una gota: el primer vaso del día es el que más se siente.`
    }
    if (franja === 'tarde') {
      return `${nombre}, son las ${hora} y todavía no me has dado nada. Ya voy racionando.`
    }
    return `Se nos fue el día entero sin agua, ${nombre}. Un vaso ahora, tranquilo, sin culpa.`
  }

  if (estado.totalHoyMl >= estado.metaMl) {
    return rachaDias > 2
      ? `Listo por hoy, y van ${rachaDias} días. Esto ya no es suerte, ${nombre}.`
      : `Ya cumplimos la meta de hoy. Yo lo siento, en serio.`
  }

  if (franja === 'noche' && faltan > estado.metaMl * 0.4) {
    return `Quedan ${faltan} ml y ya es de noche. Tomemos algo ahora, pero no todo de golpe.`
  }

  if (ayer && ayer.metaMl > 0) {
    const cumplioAyer = ayer.totalMl >= ayer.metaMl
    if (!cumplioAyer && estado.porcentaje > 50) {
      return `Ayer nos quedamos cortos, pero hoy vamos en ${estado.porcentaje}%. Así me gusta.`
    }
  }

  if (estado.horasSinBeber >= 4) {
    return `${Math.floor(estado.horasSinBeber)} horas sin nada, ${nombre}. Ya se me nota.`
  }

  switch (franja) {
    case 'manana':
      return `Buenos días. Vamos en ${estado.totalHoyMl} ml; el día está fresquito todavía.`
    case 'tarde':
      return `Vamos en ${estado.porcentaje}% de la meta. Falta poco para ir bien.`
    default:
      return `Buenas noches, ${nombre}. Nos faltan ${faltan} ml para cerrar el día completo.`
  }
}

/** Lo que dice justo después de que la persona registra agua. */
export function reaccionAlBeber(
  ml: number,
  estado: EstadoCuerpo,
  conFoto: boolean,
  nombreMascota: string,
): string {
  const nuevoTotal = estado.totalHoyMl + ml
  const cumplio = nuevoTotal >= estado.metaMl && estado.totalHoyMl < estado.metaMl

  if (cumplio) return `Listo, meta cumplida. Gracias, en serio. Así se siente estar completo.`
  if (estado.nivel === 'critico') return `Uf. Eso me hacía falta hace rato.`
  if (ml >= 500) return `${ml} ml de una. Despacio, que no es una carrera.`
  if (conFoto) return `Vi el vaso vacío. Eso cuenta doble, y tú sabes por qué.`
  if (estado.porcentaje >= 75) return `Ya casi. Un par más y cerramos.`
  return `Listo, ${ml} ml adentro. ${nombreMascota} lo agradece.`
}
