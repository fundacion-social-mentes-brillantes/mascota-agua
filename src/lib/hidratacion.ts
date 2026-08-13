// Motor de hidratacion: cuanta agua, como repartirla y como esta el cuerpo.
//
// Las cifras salen de la investigacion guardada en docs/investigacion-hidratacion.md
// (EFSA 2010, IOM/NASEM 2004, OMS, ACSM). Si algun dia hay que corregir un
// numero, se corrige AQUI y en ese documento: no hay cifras sueltas por el
// resto del codigo.
import type { EstadoCuerpo, NivelCuerpo, Perfil, Registro } from './tipos'

/** Topes de seguridad. La app nunca recomienda por fuera de estos limites. */
export const TOPES = {
  /** Piso absoluto, para cualquier edad. */
  minimoMl: 1300,
  /** Ni mas alta: por encima empieza el riesgo de hiponatremia por dilucion. */
  maximoMl: 4000,
  /** El rinon solo puede eliminar cerca de 0,8-1,0 L por hora (778-1043 ml/h
   *  medidos con la hormona antidiuretica al minimo). */
  maximoPorHoraMl: 800,
  /** De un solo golpe tampoco: mejor repartido. */
  maximoPorTomaMl: 700,
} as const

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
  const totalHoyMl = registros.reduce((total, registro) => total + registro.ml, 0)
  const metaMl = perfil.metaMl
  const porcentaje = metaMl > 0 ? Math.min(150, Math.round((totalHoyMl * 100) / metaMl)) : 0

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
    metaMl,
    porcentaje,
    hidratacion,
    mlUltimaHora,
    nivel: encontrado.nivel,
    titulo: encontrado.titulo,
    loQuePasa: [],
    alertaExceso,
  }
}

/** Cada cuanto conviene recordar, segun como venga el dia. */
export function minutosHastaElProximoAviso(estado: EstadoCuerpo): number {
  if (estado.nivel === 'critico' || estado.nivel === 'bajo') return 45
  if (estado.nivel === 'atento') return 60
  return 90
}
