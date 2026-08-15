// Lo que dice la mascota cuando toca avisar.
//
// Dos ideas mandan aqui:
//
// 1. QUIEN TOMA AGUA JUICIOSO NO NECESITA QUE LO MOLESTEN. El aviso solo sale
//    cuando de verdad va atrasado para la hora que es. Una app que timbra
//    cuando uno va bien deja de leerse a la semana.
//
// 2. EL QUE NO TOMA NADA NO NECESITA UNA ALARMA, NECESITA ENTENDER. Por eso
//    cada aviso ensena una cosa concreta del cuerpo, con el tono de "los
//    hermanos rinones": dos organos que se quieren, uno se debilita, el otro
//    se sobrecarga tapandole el hueco, y si nadie manda agua caen los dos.
//    Ese video movio a mucha gente porque daba ternura, no susto.

/** Cuanta agua "deberia" llevar a esta hora, repartida entre despertar y dos
 *  horas antes de dormir. Es la misma cuenta que hace la app por dentro. */
export function esperadoAhora(metaMl, minutosAhora, despertar, dormir) {
  let fin = dormir - 120
  if (fin <= despertar) fin = despertar + 720
  if (minutosAhora <= despertar) return 0
  if (minutosAhora >= fin) return metaMl
  return Math.round((metaMl * (minutosAhora - despertar)) / (fin - despertar))
}

/**
 * Las lecciones de los hermanos rinones. Cada una es un mecanismo real,
 * contado en una frase que cabe en una notificacion.
 *
 * Se rota por dia para que no salga siempre la misma, y no se repite la de
 * ayer.
 */
const LECCIONES = [
  'Cuando falta agua, uno de mis riñones se cansa y el otro trabaja doble para taparle el hueco. Así aguantan… hasta que no.',
  'Cuando la orina sale oscura no es un color: son los riñones exprimiendo la misma agua una y otra vez para no soltarla.',
  'Sin agua mi sangre se espesa y mi corazón tiene que latir más rápido para moverla. Por eso el cansancio de la tarde.',
  'Los riñones filtran toda mi sangre unas 35 veces al día. Con poca agua, cada vuelta les cuesta más.',
  'El dolor de cabeza de las 3 de la tarde casi siempre es esto: mi cerebro pidiendo agua, no café.',
  'Cuando me falta agua, mis riñones sueltan una hormona que aprieta las venas. Se aguanta, pero se paga.',
  'Las piedras en el riñón no salen de un día: salen de muchos días seguidos de poca agua.',
  'Mis músculos son tres cuartas partes agua. Con sed, un calambre no es mala suerte: es falta de repuesto.',
]

/**
 * La leccion de este momento. Cambia con la hora Y con el dia: si rotara
 * solo por dia, alguien que recibe cuatro avisos leeria la misma frase cuatro
 * veces y dejaria de leerlas.
 */
function leccion(minutosAhora, desplazamiento = 0) {
  const dias = Math.floor(Date.now() / 86_400_000)
  const bloque = Math.floor(minutosAhora / 90) // cambia cada hora y media
  return LECCIONES[(dias * 3 + bloque + desplazamiento) % LECCIONES.length]
}

/**
 * Arma el aviso.
 *
 * Devuelve null cuando NO hay que decir nada: es la mitad del trabajo. Va
 * juicioso, va en su ritmo, o ya no es hora de estar tomando agua.
 */
export function armarAviso({
  nombre,
  tomadoMl,
  metaMl,
  minimoMl,
  horasSinBeber,
  minutosAhora,
  despertar,
  dormir,
}) {
  const faltan = Math.max(0, metaMl - tomadoMl)
  const esperado = esperadoAhora(metaMl, minutosAhora, despertar, dormir)
  const atraso = esperado - tomadoMl
  const minutosParaDormir = dormir - minutosAhora

  // --- 1. El que va bien no recibe nada. ---
  // Se permite ir hasta un 15% de la meta por debajo de lo esperado sin que
  // nadie lo moleste: nadie toma agua con cronometro.
  const holgura = Math.max(200, metaMl * 0.15)
  if (atraso <= holgura && horasSinBeber < 4) return null

  // --- 2. La franja de la noche. Lo mas delicado del dia. ---
  // Aqui la respuesta correcta NO es "tomate lo que falta". Es decir la
  // verdad: hoy ya no se recupera, y tomarselo de golpe arruina la noche.
  if (minutosParaDormir <= 150 && minutosParaDormir > -60) {
    const cabe = minutosParaDormir < 60 ? 200 : minutosParaDormir < 90 ? 300 : 500
    if (tomadoMl < minimoMl) {
      return {
        titulo: `${nombre} casi no tomó agua hoy`,
        cuerpo:
          `Quedamos en ${tomadoMl} ml y solo respirar me gasta ${minimoMl}. ` +
          `No te tomes lo que falta de un tirón: ${cabe} ml despacio y mañana arrancamos temprano.`,
        motivo: 'noche-en-el-hueso',
      }
    }
    return {
      titulo: `${nombre} se va a dormir`,
      cuerpo: `Faltan ${faltan} ml, pero esos son para mañana. Ahora ${cabe} ml y ya, o toca levantarse de madrugada.`,
      motivo: 'noche-corto',
    }
  }

  // --- 3. Recien levantado. ---
  // Las horas sin beber vienen de anoche, asi que casi todo el mundo amanece
  // "en rojo". Regañar a alguien por dormir no tiene sentido: aqui el aviso
  // es una invitacion, que ademas es el mejor momento del dia para el agua.
  if (minutosAhora - despertar <= 120 && minutosAhora >= despertar) {
    return {
      titulo: `Buenos días de ${nombre}`,
      cuerpo: `Pasé toda la noche gastando agua sin reponer. ${leccion(minutosAhora, 1)}`,
      motivo: 'manana',
    }
  }

  // --- 4. Escalado de dia, con una leccion distinta cada vez. ---
  if (horasSinBeber >= 6) {
    return {
      titulo: `${nombre} lleva ${Math.floor(horasSinBeber)} horas sin agua`,
      cuerpo: leccion(minutosAhora, 0),
      motivo: 'rojo',
    }
  }
  if (horasSinBeber >= 4) {
    return {
      titulo: `${nombre} tiene sed de verdad`,
      cuerpo: `Van ${Math.floor(horasSinBeber)} horas. ${leccion(minutosAhora, 2)}`,
      motivo: 'sed',
    }
  }
  if (tomadoMl < minimoMl && minutosAhora > despertar + 300) {
    return {
      titulo: `${nombre} va en el hueso`,
      cuerpo: `${tomadoMl} ml en todo el día, y solo respirar me gasta ${minimoMl}. ${leccion(minutosAhora, 4)}`,
      motivo: 'en-el-hueso',
    }
  }
  return {
    titulo: `${nombre} va atrasado`,
    cuerpo: `Vamos ${atraso} ml atrás para la hora que es. Un vaso ahora y nos ponemos al día sin correr.`,
    motivo: 'atrasado',
  }
}
