// Motor de hidratacion: cuanta agua, como repartirla y como esta el cuerpo.
//
// Las cifras salen de la investigacion guardada en docs/investigacion-hidratacion.md
// (EFSA 2010, IOM/NASEM 2004, OMS, ACSM). Si algun dia hay que corregir un
// numero, se corrige AQUI y en ese documento: no hay cifras sueltas por el
// resto del codigo.
import {
  AVISO_TOPE_CERVEZA,
  bebidaPorId,
  cafeinaDe,
  CERVEZA_QUE_AUN_APORTA_ML,
  esAlcohol,
} from './bebidas'
import type { EstadoCuerpo, NivelCuerpo, Perfil, Registro } from './tipos'

/** Topes de seguridad. La app nunca recomienda por fuera de estos limites. */
export const TOPES = {
  /** La META nunca se propone por debajo de aqui, sea quien sea la persona.
   *  Ojo: NO es el minimo vital, que es mas bajo y se calcula por peso mas
   *  abajo. Este es el piso de una meta razonable para un adulto. */
  minimoMl: 1300,
  /** Ni mas alta: por encima empieza el riesgo de hiponatremia por dilucion. */
  maximoMl: 4000,
  /** El rinon solo puede eliminar cerca de 0,7-1,0 L por hora. Se toma el
   *  extremo prudente: 800 ml. Beber por encima de ese ritmo durante varias
   *  horas seguidas es justo lo que produce la intoxicacion por agua. */
  maximoPorHoraMl: 800,
  /** De un solo golpe tampoco. El estomago vacia bien volumenes de 240-800 ml,
   *  pero por encima de unos 7 ml por kilo el vaciado ya no termina dentro de
   *  la hora: el agua se queda pesando y no hidrata mas rapido. */
  maximoPorTomaMl: 700,
} as const

/**
 * Perdidas que el cuerpo tiene SI O SI, aunque uno se quede quieto todo el dia.
 *
 * - Insensibles (pulmon y piel): 0,4-0,5 ml por kilo y por hora. Se toma 0,45,
 *   que en 24 horas son 10,8 ml por kilo.
 * - Orina obligatoria: el rinon no puede concentrar mas alla de ~1200 mOsm/L,
 *   y hay que sacar cerca de 600 mOsm de desechos al dia. Eso obliga a un
 *   minimo de unos 500 ml de orina, se tome agua o no.
 *
 * La suma es agua TOTAL; como una quinta parte llega con la comida, lo que hay
 * que BEBER es el 80% de esa cifra.
 */
const INSENSIBLES_ML_POR_KILO_DIA = 10.8
const ORINA_OBLIGATORIA_ML = 500

/**
 * Los cuatro numeros del dia. Existen porque una sola cifra ("tu meta") no
 * alcanza: no es lo mismo quedarse corto que quedarse en el hueso, ni pasarse
 * un poco que pasarse hasta hacerse dano.
 */
export interface FranjaDelDia {
  /** Por debajo de aqui el cuerpo ni siquiera cubre lo que pierde solo. */
  minimoMl: number
  /** El equilibrio. Ni de menos ni de mas: es a lo que apunta la app. */
  metaMl: number
  /** De la meta hasta aqui es "de mas, pero sin problema". */
  techoMl: number
  /** Tope duro. Pasarse de aqui no es merito, es riesgo. */
  maximoMl: number
}

/**
 * El minimo vital de BEBIDA para esta persona. No es una meta ni una
 * recomendacion: es la raya por debajo de la cual el cuerpo ya esta sacando
 * agua de donde no debe.
 */
export function minimoVitalMl(pesoKg: number): number {
  const total = pesoKg * INSENSIBLES_ML_POR_KILO_DIA + ORINA_OBLIGATORIA_ML
  const bebida = total * (1 - PARTE_QUE_VIENE_DE_LA_COMIDA)
  return Math.max(800, Math.round(bebida / 50) * 50)
}

/** La franja completa a partir de la meta ya calculada y el peso. */
export function franjaDelDia(metaMl: number, pesoKg: number): FranjaDelDia {
  const minimo = Math.min(minimoVitalMl(pesoKg), metaMl)
  // Un cuarto por encima de la meta sigue siendo un dia normal: hubo calor,
  // se camino mas, dio sed. De ahi para arriba ya no es equilibrio, es agua
  // que sobra: no hace dano todavia, pero tampoco aporta nada.
  const techo = Math.min(TOPES.maximoMl, Math.round((metaMl * 1.25) / 50) * 50)
  return { minimoMl: minimo, metaMl, techoMl: techo, maximoMl: TOPES.maximoMl }
}

/** En que parte de la franja va ahora mismo. */
export type ZonaDelDia = 'en-el-hueso' | 'corto' | 'equilibrio' | 'de-sobra' | 'pasado'

export function zonaDelDia(tomadoMl: number, franja: FranjaDelDia): ZonaDelDia {
  if (tomadoMl > franja.maximoMl) return 'pasado'
  if (tomadoMl > franja.techoMl) return 'de-sobra'
  if (tomadoMl >= franja.metaMl) return 'equilibrio'
  if (tomadoMl >= franja.minimoMl) return 'corto'
  return 'en-el-hueso'
}

/**
 * Piso de bebida al dia para personas adultas, segun ESPEN: al menos 2,0 L
 * de bebidas para hombres y 1,6 L para mujeres. Sin esto, alguien muy
 * delgado terminaria con una meta demasiado baja.
 */
const PISO_ADULTO_ML = { hombre: 2000, mujer: 1600, 'sin-decir': 1600 } as const

/**
 * Mililitros por kilo de peso al dia (agua TOTAL: bebida + la de la comida).
 * La regla clinica corriente para adultos es 30-35 ml/kg; se usa 35 y luego
 * el resultado se acota por arriba y por abajo. Despues de los 65 se baja a
 * 30 porque el rinon concentra menos y la sed avisa menos.
 */
function mlPorKiloSegunEdad(edad: number): number {
  if (edad >= 65) return 30
  if (edad >= 18) return 35
  if (edad >= 14) return 40
  return 50 // ninos: mas agua por kilo (regla de Holliday-Segar simplificada)
}

/**
 * Una quinta parte del agua del dia entra con la comida (sopas, frutas,
 * verduras): EFSA e IOM calculan que cerca del 80% de la ingesta total llega
 * como bebida y el 20% restante como humedad de los alimentos. Por eso la
 * meta de agua BEBIDA es menor que el agua total que necesita el cuerpo.
 */
const PARTE_QUE_VIENE_DE_LA_COMIDA = 0.2

const EXTRA_ACTIVIDAD: Record<Perfil['actividad'], number> = {
  poca: 0,
  moderada: 350,
  alta: 700,
  'muy-alta': 1100,
}

const EXTRA_CLIMA: Record<Perfil['clima'], number> = {
  frio: 0,
  templado: 0,
  calor: 500,
  'calor-humedo': 750,
}

const EXTRA_ETAPA: Record<Perfil['etapa'], number> = {
  ninguna: 0,
  embarazo: 300,
  lactancia: 700,
}

/** Aire seco de altura: se pierde mas agua solo por respirar. */
const EXTRA_ALTITUD = 250

export interface DetalleMeta {
  metaMl: number
  /** Lo que sale del peso y la edad, ya descontada el agua de la comida. */
  baseMl: number
  /** Cada suma, con su nombre, para poder mostrarlo en pantalla. */
  extras: { motivo: string; ml: number }[]
  /** Avisos que la app debe mostrar sin adornos. */
  avisos: string[]
  /** True si topo con el maximo de seguridad. */
  topada: boolean
}

export function calcularMeta(
  datos: Pick<
    Perfil,
    'edad' | 'sexo' | 'pesoKg' | 'actividad' | 'clima' | 'altitudAlta' | 'etapa' | 'condiciones'
  >,
): DetalleMeta {
  const avisos: string[] = []

  const aguaTotal = datos.pesoKg * mlPorKiloSegunEdad(datos.edad)
  // El piso de ESPEN solo aplica a personas adultas; en ninos manda el peso.
  const piso = datos.edad >= 18 ? PISO_ADULTO_ML[datos.sexo] : 0
  const baseMl = Math.max(piso, Math.round(aguaTotal * (1 - PARTE_QUE_VIENE_DE_LA_COMIDA)))

  const extras: { motivo: string; ml: number }[] = []
  const sumar = (motivo: string, ml: number) => {
    if (ml > 0) extras.push({ motivo, ml })
  }

  sumar('Por tu actividad física', EXTRA_ACTIVIDAD[datos.actividad])
  sumar('Por el clima donde vives', EXTRA_CLIMA[datos.clima])
  if (datos.altitudAlta) sumar('Por vivir en altura', EXTRA_ALTITUD)
  sumar(
    datos.etapa === 'embarazo' ? 'Por el embarazo' : 'Por la lactancia',
    EXTRA_ETAPA[datos.etapa],
  )

  const suma = baseMl + extras.reduce((total, extra) => total + extra.ml, 0)

  // Se redondea a vasos de 50 ml para que la meta sea un numero manejable.
  let metaMl = Math.round(suma / 50) * 50
  const topada = metaMl > TOPES.maximoMl
  metaMl = Math.min(TOPES.maximoMl, Math.max(TOPES.minimoMl, metaMl))

  if (topada) {
    avisos.push(
      `El cálculo daba más de ${TOPES.maximoMl} ml, pero la app no recomienda pasar de ahí sin que lo mire un profesional.`,
    )
  }
  if (datos.edad >= 65) {
    avisos.push(
      'Después de los 65 la sed avisa menos y el riñón concentra menos: conviene beber por horario y no solo cuando da sed.',
    )
  }
  if (datos.edad < 15) {
    avisos.push(
      'En niños y adolescentes la cantidad la debería confirmar el pediatra: esta es solo una referencia.',
    )
  }
  if (datos.condiciones.length > 0) {
    avisos.push(
      'Marcaste una condición de salud en la que subir los líquidos puede ser peligroso. Esta meta queda solo como referencia: la cantidad correcta te la tiene que decir tu médico.',
    )
  }

  return { metaMl, baseMl, extras, avisos, topada }
}

// ------------------------------------------------------ el dia por dentro

/** Convierte "06:30" en minutos desde la medianoche. */
export function minutosDeHora(hora: string): number {
  const [h, m] = hora.split(':').map((n) => Number.parseInt(n, 10))
  if (Number.isNaN(h)) return 0
  return h * 60 + (Number.isNaN(m) ? 0 : m)
}

/**
 * Cuanta agua "deberia" llevar a esta hora del dia, repartiendo la meta
 * entre el momento de despertar y dos horas antes de dormir (para no tener
 * que levantarse de madrugada).
 */
export function metaEsperadaAhora(perfil: Perfil, ahora = Date.now()): number {
  const fecha = new Date(ahora)
  const minutosAhora = fecha.getHours() * 60 + fecha.getMinutes()
  const inicio = minutosDeHora(perfil.horaDespertar)
  let fin = minutosDeHora(perfil.horaDormir) - 120
  if (fin <= inicio) fin = inicio + 720 // por si alguien duerme de dia

  if (minutosAhora <= inicio) return 0
  if (minutosAhora >= fin) return perfil.metaMl
  return Math.round((perfil.metaMl * (minutosAhora - inicio)) / (fin - inicio))
}

/**
 * Cuantos minutos faltan para la hora de dormir. Negativo si ya se paso.
 * Sirve para lo mas delicado del dia: alguien que no tomo nada y ya se le
 * acabo el tiempo.
 */
export function minutosParaDormir(perfil: Perfil, ahora = Date.now()): number {
  const fecha = new Date(ahora)
  const minutosAhora = fecha.getHours() * 60 + fecha.getMinutes()
  const dormir = minutosDeHora(perfil.horaDormir)
  let faltan = dormir - minutosAhora
  // Si la hora de dormir ya paso hoy pero es de madrugada, la referencia es
  // la de anoche: sigue siendo "ya deberia estar durmiendo".
  if (faltan < -720) faltan += 1440
  if (faltan > 720) faltan -= 1440
  return faltan
}

/**
 * Cuanta agua es SEGURA de aqui a que se acueste.
 *
 * Esto es lo que evita el peor consejo posible: "te faltan 2 litros, tomatelos
 * ya". Beber mucho pegado a la cama no recupera el dia y si arruina la noche
 * (cada levantada a orinar fragmenta el sueno; con dos ya hay cansancio al dia
 * siguiente), y de golpe pasa del ritmo que el rinon puede eliminar.
 *
 * Las cantidades salen de lo que recomienda la medicina del sueno:
 * hasta ~200 ml pegado a la cama no le molesta a casi nadie; entre 200 y 500
 * ml conviene tener hora y media de margen; de 500 para arriba ya hay que
 * dejarlo para el dia siguiente.
 */
export function maximoSeguroAntesDeDormir(minutosFaltan: number): number {
  if (minutosFaltan <= 0) return 150
  if (minutosFaltan < 60) return 200
  if (minutosFaltan < 90) return 300
  if (minutosFaltan < 150) return 500
  return 700
}

/** True si a esta hora la persona ya deberia estar durmiendo. */
export function esHoraDeDormir(perfil: Perfil, ahora = Date.now()): boolean {
  const fecha = new Date(ahora)
  const minutosAhora = fecha.getHours() * 60 + fecha.getMinutes()
  const despertar = minutosDeHora(perfil.horaDespertar)
  const dormir = minutosDeHora(perfil.horaDormir)
  if (dormir > despertar) return minutosAhora >= dormir || minutosAhora < despertar
  return minutosAhora >= dormir && minutosAhora < despertar
}

const NIVELES: { nivel: NivelCuerpo; desde: number; titulo: string }[] = [
  { nivel: 'pleno', desde: 85, titulo: 'A tope' },
  { nivel: 'bien', desde: 68, titulo: 'Bien' },
  { nivel: 'atento', desde: 48, titulo: 'Ojo' },
  { nivel: 'bajo', desde: 28, titulo: 'Bajo de agua' },
  { nivel: 'critico', desde: 0, titulo: 'En rojo' },
]

/**
 * El estado del cuerpo tal como lo muestra la mascota. Mezcla dos cosas:
 * cuanto tiempo lleva sin beber (lo que mas pesa a corto plazo) y que tan
 * atrasada va respecto a la meta del dia.
 */
export function calcularEstadoCuerpo(
  perfil: Perfil,
  registros: Registro[],
  ahora = Date.now(),
): EstadoCuerpo {
  // El cuerpo se llena con TODO el liquido: el tinto y la gaseosa no
  // deshidratan, y fingir que si seria mentir. La META, en cambio, es solo de
  // agua. Son dos cuentas distintas a proposito.
  const totalHoyMl = registros.reduce((total, registro) => total + registro.ml, 0)
  const aguaHoyMl = registros.reduce(
    (total, r) => total + (bebidaPorId(r.bebida).cuentaParaLaMeta ? r.ml : 0),
    0,
  )
  const otrasBebidasMl = totalHoyMl - aguaHoyMl
  const cafeinaHoyMg = registros.reduce(
    (total, r) => total + cafeinaDe(r.mlBruto ?? r.ml, r.bebida),
    0,
  )
  const alcoholHoyMl = registros.reduce(
    (total, r) => total + (esAlcohol(r.bebida) ? (r.mlBruto ?? r.ml) : 0),
    0,
  )

  const metaMl = perfil.metaMl
  // El porcentaje de la medalla es el del AGUA.
  const porcentaje = metaMl > 0 ? Math.min(150, Math.round((aguaHoyMl * 100) / metaMl)) : 0
  const porcentajeLiquido = metaMl > 0 ? Math.min(150, Math.round((totalHoyMl * 100) / metaMl)) : 0

  const ultimo = registros.reduce((masReciente, registro) => Math.max(masReciente, registro.hora), 0)
  const horasSinBeber = ultimo > 0 ? (ahora - ultimo) / 3_600_000 : Number.POSITIVE_INFINITY

  // Castigo por el tiempo sin beber: nada las primeras 2 horas, y de ahi
  // en adelante baja rapido. A las 8 horas ya se lleva casi todo.
  const horasContadas = Number.isFinite(horasSinBeber) ? horasSinBeber : 6
  const castigoTiempo = Math.min(55, Math.max(0, (horasContadas - 2) * 9))

  // Castigo por ir atrasado respecto a lo que tocaba a esta hora.
  const esperado = metaEsperadaAhora(perfil, ahora)
  const faltante = Math.max(0, esperado - totalHoyMl)
  const castigoAtraso = metaMl > 0 ? Math.min(45, (faltante / metaMl) * 90) : 0

  const hidratacion = Math.max(0, Math.min(100, Math.round(100 - castigoTiempo - castigoAtraso)))
  const encontrado = NIVELES.find((n) => hidratacion >= n.desde) ?? NIVELES[NIVELES.length - 1]

  // Aviso por beber demasiado rapido: mas de 800 ml en la ultima hora.
  const haceUnaHora = ahora - 3_600_000
  const mlUltimaHora = registros
    .filter((registro) => registro.hora >= haceUnaHora)
    .reduce((total, registro) => total + registro.ml, 0)

  let alertaExceso: string | null = null
  if (mlUltimaHora > TOPES.maximoPorHoraMl) {
    alertaExceso = `Llevas ${mlUltimaHora} ml en una hora. El riñón solo alcanza a eliminar cerca de 800 ml por hora: para un momento, que no es una carrera.`
  } else if (totalHoyMl > TOPES.maximoMl) {
    alertaExceso = `Vas en ${(totalHoyMl / 1000).toFixed(1)} L hoy. Más de 4 L en un día, sin ejercicio fuerte ni calor extremo, puede diluir el sodio de la sangre. Hoy ya está.`
  }

  return {
    horasSinBeber,
    totalHoyMl,
    aguaHoyMl,
    otrasBebidasMl,
    cafeinaHoyMg,
    alcoholHoyMl,
    metaMl,
    porcentaje,
    porcentajeLiquido,
    hidratacion,
    mlUltimaHora,
    nivel: encontrado.nivel,
    titulo: encontrado.titulo,
    loQuePasa: [],
    alertaExceso,
  }
}

export interface ConsejoAhora {
  accion: 'tomar' | 'seguir' | 'esperar' | 'frenar'
  /** Cuantos ml conviene tomar YA. 0 si no toca tomar nada. */
  ml: number
  /** Una frase corta, ya masticada, lista para mostrar o para el modelo. */
  resumen: string
}

/**
 * Cuanta agua conviene AHORA. Esto es lo que hace que la mascota pueda decir
 * "tomate 250 ml" en vez de "toma agua", y sobre todo que sepa cuando decir
 * que NO: pasarse tambien hace dano.
 */
export function consejoAhora(perfil: Perfil, estado: EstadoCuerpo, ahora = Date.now()): ConsejoAhora {
  // Primero lo que frena, que pesa mas que lo que empuja.
  if (estado.mlUltimaHora >= TOPES.maximoPorHoraMl) {
    return {
      accion: 'frenar',
      ml: 0,
      resumen: `Ya van ${estado.mlUltimaHora} ml en una hora y el riñón solo alcanza a eliminar cerca de ${TOPES.maximoPorHoraMl}. Ahora toca esperar, no tomar.`,
    }
  }
  if (estado.totalHoyMl >= TOPES.maximoMl) {
    return {
      accion: 'frenar',
      ml: 0,
      resumen: `Con ${(estado.totalHoyMl / 1000).toFixed(1)} L ya te pasaste del tope seguro del día. Más agua hoy no suma: diluye el sodio.`,
    }
  }

  // A partir de aqui la cuenta es de AGUA, no de liquido: la meta es de agua.
  // Lo demas ya se conto para el cuerpo, pero la promesa era esta.
  const faltante = Math.max(0, estado.metaMl - estado.aguaHoyMl)
  // Se menciona lo otro para que la mascota no suene como si no se hubiera
  // dado cuenta de lo que la persona tomo.
  const coletilla =
    estado.otrasBebidasMl >= 200
      ? ` (los ${estado.otrasBebidasMl} ml de otras bebidas ya le sirvieron a tu cuerpo, pero la meta es de agua)`
      : ''

  if (faltante === 0) {
    return {
      accion: 'seguir',
      ml: 0,
      resumen: 'Meta cumplida. De aquí en adelante, solo si da sed.',
    }
  }

  // La franja del final del dia. Aqui la respuesta correcta casi nunca es
  // "tomate lo que falta": es decir la verdad de que hoy ya no se recupera.
  const faltanParaDormir = minutosParaDormir(perfil, ahora)
  if (faltanParaDormir < 150) {
    const cabeEnLaNoche = maximoSeguroAntesDeDormir(faltanParaDormir)
    const cabePorHora = Math.max(0, TOPES.maximoPorHoraMl - estado.mlUltimaHora)
    const ml = Math.min(cabeEnLaNoche, cabePorHora, faltante)
    const minimo = minimoVitalMl(perfil.pesoKg)
    const enElHueso = estado.totalHoyMl < minimo

    if (ml <= 0) {
      return {
        accion: 'esperar',
        ml: 0,
        resumen: 'Ya no cabe más agua antes de dormir sin que toque levantarse de madrugada.',
      }
    }
    if (enElHueso) {
      return {
        accion: 'tomar',
        ml,
        resumen:
          `Hoy quedaste en ${estado.totalHoyMl} ml y el mínimo que el cuerpo gasta solo respirando es ${minimo}. ` +
          `Ya no se recupera de un tirón: toma ${ml} ml despacio y mañana arrancamos temprano. ` +
          `Tomarse lo que falta ahora no repone el día y sí obliga a levantarse a orinar.`,
      }
    }
    return {
      accion: 'esperar',
      ml,
      resumen:
        `Falta poco para dormir. ${ml} ml es lo que cabe sin que toque levantarse de madrugada; ` +
        `los ${faltante} ml que faltan de la meta se recuperan mañana, no esta noche.`,
    }
  }

  const esperado = metaEsperadaAhora(perfil, ahora)
  const atraso = esperado - estado.aguaHoyMl
  // Cuanto cabe sin pasarse del tope por hora.
  const cabe = Math.max(0, TOPES.maximoPorHoraMl - estado.mlUltimaHora)

  if (atraso <= 50) {
    return {
      accion: 'seguir',
      ml: 0,
      resumen: `Vas al ritmo que toca para esta hora. Faltan ${faltante} ml, pero repartidos en lo que queda del día.${coletilla}`,
    }
  }

  // Se recupera el atraso de a poquitos, nunca de un golpe.
  const sugerido = Math.min(cabe, Math.max(150, Math.min(500, Math.round(atraso / 50) * 50)))
  return {
    accion: 'tomar',
    ml: sugerido,
    resumen: `Vas ${atraso} ml atrás para la hora que es. Lo sano es recuperarlo de a poquitos: unos ${sugerido} ml ahora, no todo de golpe.${coletilla}`,
  }
}

// ------------------------------------------------- que no se pueda hacer trampa

export interface RevisionToma {
  veredicto: 'ok' | 'recortado' | 'rechazado'
  /** Lo que cabe en el vaso, ya recortado si hacia falta. */
  mlAceptado: number
  /** El agua que de verdad entra con eso, ya con el factor de la bebida. */
  mlEfectivo: number
  /** Por que se recorto o se rechazo, en cristiano. Vacio si todo bien. */
  motivo: string
  /** Nota sobre la bebida (el descuento, el tope de la cerveza). No es un
   *  regano: es explicar la cuenta. */
  nota: string | null
  /** Se enciende cuando el patron no parece de alguien tomando agua. */
  sospecha: string | null
}

/** Cuantos registros seguidos en poco rato ya no parecen agua de verdad. */
const TOMAS_SEGUIDAS_SOSPECHOSAS = 5
const VENTANA_SOSPECHA_MS = 10 * 60_000

/**
 * Revisa una toma ANTES de guardarla.
 *
 * La app no puede ver el vaso, asi que no puede saber si alguien miente. Lo
 * que si puede es negarse a guardar cifras que el cuerpo no podria manejar.
 * Si darle sin parar al boton subiera la barra, la app estaria ensenando lo
 * contrario de lo que quiere ensenar: que el numero de la pantalla es el
 * cuerpo de uno, no un puntaje.
 */
export function revisarToma(
  mlPedidos: number,
  registros: Registro[],
  bebidaId?: string,
  ahora = Date.now(),
): RevisionToma {
  const bebida = bebidaPorId(bebidaId)
  const ml = Math.round(mlPedidos)
  const vacio = { mlAceptado: 0, mlEfectivo: 0, nota: null, sospecha: null } as const
  if (!Number.isFinite(ml) || ml <= 0) {
    return { veredicto: 'rechazado', ...vacio, motivo: 'Esa cantidad no existe.' }
  }

  const totalHoy = registros.reduce((total, r) => total + r.ml, 0)
  const haceUnaHora = ahora - 3_600_000
  const mlUltimaHora = registros
    .filter((r) => r.hora >= haceUnaHora)
    .reduce((total, r) => total + r.ml, 0)

  const seguidas = registros.filter((r) => r.hora >= ahora - VENTANA_SOSPECHA_MS).length
  const sospecha =
    seguidas >= TOMAS_SEGUIDAS_SOSPECHOSAS
      ? `Van ${seguidas} registros en diez minutos. Si es de verdad, para; y si es por probar, mejor no: el número de la pantalla es tu cuerpo, no un puntaje.`
      : null

  // El tope por toma es del ESTOMAGO, asi que va sobre el volumen del vaso:
  // 700 ml de gaseosa pesan igual que 700 ml de agua.
  const cabeEnLaToma = TOPES.maximoPorTomaMl
  // Los de hora y dia son del RINON, asi que van sobre el agua efectiva. Por
  // eso se convierten a volumen de esta bebida antes de comparar.
  const aVolumen = (efectivo: number) =>
    bebida.factor > 0 ? Math.floor(efectivo / bebida.factor) : Number.POSITIVE_INFINITY
  const cabeEnLaHora = aVolumen(Math.max(0, TOPES.maximoPorHoraMl - mlUltimaHora))
  const cabeEnElDia = aVolumen(Math.max(0, TOPES.maximoMl - totalHoy))
  const cabe = Math.min(cabeEnLaToma, cabeEnLaHora, cabeEnElDia)

  if (cabe <= 0) {
    const motivo =
      TOPES.maximoMl - totalHoy <= 0
        ? `Hoy ya vas en ${(totalHoy / 1000).toFixed(1)} L de líquido. Más no suma: diluye el sodio de la sangre. Seguimos mañana.`
        : `Ya llevas ${mlUltimaHora} ml en esta hora y el riñón solo alcanza a eliminar cerca de ${TOPES.maximoPorHoraMl}. Deja pasar un rato.`
    return { veredicto: 'rechazado', ...vacio, motivo }
  }

  const aceptado = Math.min(ml, cabe)
  const recortado = aceptado < ml

  let motivo = ''
  if (recortado) {
    if (cabe === cabeEnElDia) {
      motivo = `Te anoto ${aceptado} ml, que es lo que falta para el tope de ${(TOPES.maximoMl / 1000).toFixed(0)} L de líquido del día.`
    } else if (cabe === cabeEnLaHora) {
      motivo = `Te anoto ${aceptado} ml: con lo de esta hora ya se completan los ${TOPES.maximoPorHoraMl} que el riñón alcanza a eliminar.`
    } else {
      motivo = `Te anoto ${aceptado} ml. Más de eso de un solo golpe no alcanza a salir del estómago dentro de la hora, así que no hidrata más rápido: se queda pesando.`
    }
  }

  return {
    veredicto: recortado ? 'recortado' : 'ok',
    mlAceptado: aceptado,
    mlEfectivo: liquidoDeEstaToma(aceptado, bebida.id, registros),
    motivo,
    nota: notaDeLaBebida(aceptado, bebida.id, registros),
    sospecha,
  }
}

/**
 * El agua que entra con esta toma, contando el tope de la cerveza.
 *
 * La cerveza aporta su agua hasta cierta cantidad al dia; lo que pase de ahi
 * aporta cero. Si una toma queda a caballo, se parte: la parte de adentro
 * aporta y la de afuera no.
 */
function liquidoDeEstaToma(mlBruto: number, bebidaId: string, registros: Registro[]): number {
  const bebida = bebidaPorId(bebidaId)
  if (bebida.id !== 'cerveza') return Math.round(mlBruto * bebida.factor)

  const cervezaHoy = registros
    .filter((r) => r.bebida === 'cerveza')
    .reduce((total, r) => total + (r.mlBruto ?? r.ml), 0)
  const dentro = Math.max(0, Math.min(mlBruto, CERVEZA_QUE_AUN_APORTA_ML - cervezaHoy))
  return Math.round(dentro * bebida.factor)
}

/** La explicacion de la cuenta. No regana: solo dice de donde sale el numero. */
function notaDeLaBebida(mlBruto: number, bebidaId: string, registros: Registro[]): string | null {
  const bebida = bebidaPorId(bebidaId)
  const efectivo = liquidoDeEstaToma(mlBruto, bebida.id, registros)

  if (bebida.id === 'cerveza' && efectivo < Math.round(mlBruto * bebida.factor)) {
    return AVISO_TOPE_CERVEZA
  }
  if (bebida.factor === 0) {
    return 'Queda anotado, pero no lo cuento como líquido: en esta cantidad de alcohol ya no hay dato confiable, y prefiero pedirte agua de más que de menos.'
  }
  if (bebida.factor < 1) {
    const queOcupa =
      bebida.clase === 'alcohol' ? 'el alcohol' : 'el azúcar, la leche o la grasa'
    return `De esos ${mlBruto} ml, ${efectivo} son agua. El resto es ${queOcupa}, que ocupa lugar.`
  }
  if (!bebida.cuentaParaLaMeta) {
    return 'Entra completo a tu cuerpo, pero no cuenta para la meta: la meta es de agua.'
  }
  return null
}

/** Cada cuanto conviene recordar, segun como venga el dia. */
export function minutosHastaElProximoAviso(estado: EstadoCuerpo): number {
  if (estado.nivel === 'critico' || estado.nivel === 'bajo') return 45
  if (estado.nivel === 'atento') return 60
  return 90
}
