// Que se puede tomar, y cuanta agua trae de verdad.
//
// ============================================================================
// LA REGLA QUE SOSTIENE ESTE ARCHIVO
// ============================================================================
//
// Son DOS cosas distintas y aqui no se mezclan nunca:
//
//   1. EL LIQUIDO que entra al cuerpo. Llena a la mascota. Casi todo cuenta,
//      porque es verdad: la gaseosa, el tinto y hasta la cerveza NO
//      deshidratan. Decir "eso no cuenta" seria mentir, y esta app no miente.
//
//   2. LA META del dia. Es de AGUA. No porque lo demas no hidrate, sino
//      porque la meta es una promesa que la persona se hace a si misma, y esa
//      promesa es de agua. Ademas, aqui el agua es gratis y la gaseosa cuesta:
//      una meta que se cumple con gaseosa es una meta al reves.
//
// Lo que te protege es el liquido. La medalla es del agua.
//
// ============================================================================
// DE DONDE SALEN LOS FACTORES (y de donde NO)
// ============================================================================
//
// El factor es CUANTA AGUA CONTIENE la bebida, sacado de tablas de
// composicion de alimentos. No es "cuanto hidrata".
//
// **NO se usa el Beverage Hydration Index (BHI)**, y es a proposito. Ese
// estudio (Maughan 2016) es el que sostiene el "todo cuenta", pero sus valores
// por bebida no estan impresos en el articulo: hay que leerlos de una grafica,
// ninguno es estadisticamente significativo, y son 15-17 hombres jovenes por
// bebida. Ademas lo financio un instituto creado con dinero de Coca-Cola.
// Sirve para decir "todo cuenta"; NO sirve como sistema de puntos.
//
// Por eso hay TRES niveles y no veinte: nadie calcula el tamano de su vaso con
// menos de 20% de error. Fingir la diferencia entre 0,88 y 0,90 seria una
// mentira nueva, solo que con cara de precision.
//
// Dos reglas duras:
//   - NINGUNA bebida pasa de 1,00. Ni la leche, aunque el estudio diga que
//     retiene mas liquido que el agua. En el momento en que una bebida "vale
//     mas que el agua", la app deja de medir el cuerpo y empieza a repartir
//     puntos. Es lo mismo que impide que la tienda cure a la mascota.
//   - NINGUNA bebida resta. Inventar una deuda es tan deshonesto como
//     regalar un bono.

/** Sube cuando cambian los factores. Cada registro guarda la suya, para que
 *  el historial viejo no se reescriba solo si manana se corrige un numero. */
export const VERSION_CATALOGO = 1

export type ClaseBebida = 'agua' | 'clara' | 'con-cuerpo' | 'alcohol'

export interface Bebida {
  id: string
  nombre: string
  emoji: string
  clase: ClaseBebida
  /** Parte del volumen que es agua de verdad, de 0 a 1. */
  factor: number
  /** Solo el agua cuenta para la meta del dia. */
  cuentaParaLaMeta: boolean
  /** Miligramos de cafeina por cada 100 ml. 0 si no tiene. */
  cafeinaPor100Ml: number
  /** Gramos de alcohol puro por cada 100 ml (cerveza al 5% = 3,95 g). */
  alcoholPor100Ml: number
}

/**
 * El catalogo. El orden importa: es el orden en que se ven.
 *
 * Cafeina, para que las cifras se puedan comprobar: una taza de cafe colado de
 * 240 ml trae unos 95 mg (~45 mg/100 ml); una taza de te negro cerca de 47 mg
 * (~20 mg/100 ml); una lata de cola de 330 ml entre 32 y 42 mg (~11 mg/100 ml);
 * una lata de energizante de 250 ml, 80 mg (~32 mg/100 ml).
 */
export const BEBIDAS: Bebida[] = [
  {
    id: 'agua',
    nombre: 'Agua',
    emoji: '💧',
    clase: 'agua',
    factor: 1,
    cuentaParaLaMeta: true,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'agua-gas',
    nombre: 'Agua con gas',
    emoji: '🫧',
    clase: 'agua',
    factor: 1,
    // Es agua. La pregunta es "¿esto es agua?", no "¿esto hidrata?".
    cuentaParaLaMeta: true,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'agua-sabor',
    nombre: 'Agua saborizada sin azúcar',
    emoji: '🍋',
    clase: 'agua',
    factor: 1,
    cuentaParaLaMeta: true,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'tinto',
    nombre: 'Tinto o café',
    emoji: '☕',
    clase: 'clara',
    factor: 1,
    cuentaParaLaMeta: false,
    // Cafe colado: cerca de 45 mg por 100 ml (una taza de 240 ml trae unos
    // 95 mg). El espresso es mucho mas concentrado, pero no es lo que la
    // gente se toma por tazas.
    cafeinaPor100Ml: 45,
    alcoholPor100Ml: 0,
  },
  {
    id: 'te',
    nombre: 'Té o aromática',
    emoji: '🍵',
    clase: 'clara',
    factor: 1,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 20,
    alcoholPor100Ml: 0,
  },
  {
    id: 'gaseosa-zero',
    nombre: 'Gaseosa sin azúcar',
    emoji: '🥤',
    clase: 'clara',
    factor: 1,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 11,
    alcoholPor100Ml: 0,
  },
  {
    id: 'gaseosa',
    nombre: 'Gaseosa con azúcar',
    emoji: '🥤',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 11,
    alcoholPor100Ml: 0,
  },
  {
    id: 'jugo',
    nombre: 'Jugo o néctar',
    emoji: '🧃',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'leche',
    nombre: 'Leche, avena o yogur',
    emoji: '🥛',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'panela',
    nombre: 'Agua de panela o caldo',
    emoji: '🍯',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'deportiva',
    nombre: 'Bebida deportiva o suero',
    emoji: '⚡',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 0,
  },
  {
    id: 'energizante',
    nombre: 'Energizante',
    emoji: '🔋',
    clase: 'con-cuerpo',
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 32,
    alcoholPor100Ml: 0,
  },
  {
    id: 'cerveza',
    nombre: 'Cerveza',
    emoji: '🍺',
    clase: 'alcohol',
    // La cerveza es cerca de 95% agua; se redondea hacia abajo.
    factor: 0.9,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 3.95,
  },
  {
    id: 'trago',
    nombre: 'Vino o trago',
    emoji: '🍷',
    clase: 'alcohol',
    // Aporta 0 a proposito: el estudio solo midio UNA cerveza al 4%. De ahi
    // para arriba el efecto del alcohol depende de la dosis y no hay cifra
    // publicada. Cero es el lado seguro: la app va a pedir MAS agua, no menos.
    factor: 0,
    cuentaParaLaMeta: false,
    cafeinaPor100Ml: 0,
    alcoholPor100Ml: 12,
  },
]

export const BEBIDA_POR_DEFECTO = BEBIDAS[0]

export function bebidaPorId(id: string | undefined): Bebida {
  // Los registros viejos no traen bebida: eran todos agua.
  if (!id) return BEBIDA_POR_DEFECTO
  return BEBIDAS.find((b) => b.id === id) ?? BEBIDA_POR_DEFECTO
}

export function esAlcohol(id: string | undefined): boolean {
  return bebidaPorId(id).clase === 'alcohol'
}

/** Los mililitros de agua que de verdad entran con esa bebida. */
export function liquidoEfectivo(mlBruto: number, id: string | undefined): number {
  return Math.round(mlBruto * bebidaPorId(id).factor)
}

// ---------------------------------------------------------------- el alcohol

/**
 * Hasta aqui la cerveza aporta su agua; despues, cero.
 *
 * 660 ml son dos porciones, cerca de 20 g de alcohol puro. IMPORTANTE: es una
 * decision de diseno derivada del LIMITE de la evidencia, no un umbral
 * publicado. El estudio que dice que una cerveza no deshidrata midio UNA sola,
 * al 4%. Mas alla de eso no hay dato, y donde no hay dato la app no inventa:
 * deja de sumar. Es el mismo tipo de raya que los 800 ml/hora del rinon.
 */
export const CERVEZA_QUE_AUN_APORTA_ML = 660

export const AVISO_TOPE_CERVEZA =
  'De aquí en adelante el alcohol sí te hace orinar más de lo que aporta. Solo cuenta el agua de verdad.'

// ---------------------------------------------------------------- la cafeina

/**
 * Donde la cafeina SI empieza a hacerte orinar mas: entre 250 y 300 mg.
 *
 * Se avisa en 250 porque eso NO esta lejos del consumo normal -- son dos o
 * tres tintos cargados, una manana corriente. Pero no se le aplica ningun
 * descuento al liquido: no existe una cifra publicada para eso, y esta app no
 * se inventa multiplicadores. Se informa y ya.
 */
export const CAFEINA_QUE_YA_SE_NOTA_MG = 250

/** Lo que la OMS considera consumo alto para un adulto sano. */
export const CAFEINA_MUCHA_MG = 400

export function cafeinaDe(mlBruto: number, id: string | undefined): number {
  return Math.round((mlBruto * bebidaPorId(id).cafeinaPor100Ml) / 100)
}

export function gramosDeAlcohol(mlBruto: number, id: string | undefined): number {
  return Math.round(((mlBruto * bebidaPorId(id).alcoholPor100Ml) / 100) * 10) / 10
}

// ------------------------------------------------------------ para la pantalla

export const EXPLICACION_CLASE: Record<ClaseBebida, string> = {
  agua: 'Es agua: entra completa y cuenta para tu meta del día.',
  clara:
    'Es casi toda agua, así que entra completa. No cuenta para la meta porque la meta es de agua, no porque te haga daño.',
  'con-cuerpo':
    'El azúcar, la leche o la grasa ocupan lugar: cerca del 90% del vaso es agua. Esa parte entra y te sirve igual.',
  alcohol:
    'La cerveza es casi toda agua y una no te deshidrata. De cierta cantidad en adelante deja de sumar, porque de ahí para arriba ya no hay dato confiable.',
}

/** La ficha honesta, para el "¿por qué?" de cada registro. */
export const FICHA_HONESTA = [
  'Todo lo que tomas llena a tu mascota, porque todo eso es líquido de verdad: el tinto y la gaseosa no te deshidratan, eso es un mito.',
  'La meta del día es de agua. No porque lo demás no sirva, sino porque esa es la promesa que te estás haciendo.',
  'Los porcentajes son cuánta agua trae la bebida, no cuánto “hidrata”. Los números de hidratación que usan otras apps salen de un estudio de 72 hombres jóvenes financiado por la industria de las gaseosas: sirve para decir que todo cuenta, no para repartir puntos.',
]
