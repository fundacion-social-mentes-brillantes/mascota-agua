// IMC y como se compara con el mundo.
//
// OJO CON EL TONO: esta app NO es para bajar de peso. El IMC esta aqui por
// dos razones y ninguna es el espejo: (1) el peso entra en el calculo del
// agua, (2) la persona pidio saber donde esta parada. Por eso los textos no
// felicitan ni regañan a nadie.
//
// Las cifras mundiales salen de docs/investigacion-imc-mundial.md.

export type CategoriaImc = 'bajo' | 'normal' | 'sobrepeso' | 'obesidad-1' | 'obesidad-2' | 'obesidad-3'

export interface ResultadoImc {
  imc: number
  categoria: CategoriaImc
  etiqueta: string
  /** Porcentaje de adultos del mundo con un IMC menor que el tuyo. */
  percentilMundial: number
  frase: string
  /** Cuando el IMC no aplica bien (menores de 20, embarazo, etc.). */
  advertencia: string | null
}

/** Puntos de corte de la OMS para personas adultas. */
const CORTES: { hasta: number; categoria: CategoriaImc; etiqueta: string }[] = [
  { hasta: 18.5, categoria: 'bajo', etiqueta: 'Bajo peso' },
  { hasta: 25, categoria: 'normal', etiqueta: 'Peso normal' },
  { hasta: 30, categoria: 'sobrepeso', etiqueta: 'Sobrepeso' },
  { hasta: 35, categoria: 'obesidad-1', etiqueta: 'Obesidad grado 1' },
  { hasta: 40, categoria: 'obesidad-2', etiqueta: 'Obesidad grado 2' },
  { hasta: Number.POSITIVE_INFINITY, categoria: 'obesidad-3', etiqueta: 'Obesidad grado 3' },
]

/**
 * Distribucion mundial del IMC en personas adultas, modelada como log-normal.
 *
 * Los parametros estan ajustados para reproducir las prevalencias REALES que
 * publico NCD-RisC para 2022 (The Lancet, 2024): obesidad 18,5% en mujeres y
 * 14,0% en hombres, y sobrepeso+obesidad cerca del 44%. La comprobacion esta
 * en docs/investigacion-imc-mundial.md.
 *
 * Es una ESTIMACION, no un dato exacto persona por persona, y asi se dice en
 * pantalla.
 */
const MUNDO = {
  mujer: { media: 25.2, desviacion: 5.8 },
  hombre: { media: 24.9, desviacion: 4.7 },
} as const

/** Aproximacion de la funcion de distribucion normal (error < 1e-7). */
function normalAcumulada(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

export function calcularImc(pesoKg: number, alturaCm: number): number {
  const metros = alturaCm / 100
  if (metros <= 0) return 0
  return pesoKg / (metros * metros)
}

export function percentilMundial(imc: number, sexo: 'mujer' | 'hombre' | 'sin-decir'): number {
  const referencia = sexo === 'hombre' ? MUNDO.hombre : MUNDO.mujer
  // Parametros de la log-normal equivalentes a esa media y desviacion.
  const varianza = Math.log(1 + (referencia.desviacion / referencia.media) ** 2)
  const mu = Math.log(referencia.media) - varianza / 2
  const z = (Math.log(Math.max(10, imc)) - mu) / Math.sqrt(varianza)
  return Math.round(normalAcumulada(z) * 100)
}

const FRASES: Record<CategoriaImc, string> = {
  bajo: 'Tu índice está por debajo del rango de referencia de la OMS. No dice nada de tu valor ni de tu salud por sí solo, pero sí vale comentarlo con un profesional.',
  normal: 'Tu índice está dentro del rango de referencia de la OMS.',
  sobrepeso:
    'Tu índice está por encima del rango de referencia de la OMS. El IMC no distingue músculo de grasa, así que es apenas una foto de lejos.',
  'obesidad-1':
    'Tu índice está en el rango que la OMS llama obesidad grado 1. Es un dato, no una sentencia: sirve para conversarlo con un profesional si quieres.',
  'obesidad-2':
    'Tu índice está en el rango que la OMS llama obesidad grado 2. Aquí sí tiene sentido que un profesional lo mire contigo.',
  'obesidad-3':
    'Tu índice está en el rango que la OMS llama obesidad grado 3. Vale la pena que un profesional lo acompañe.',
}

export function evaluarImc(
  pesoKg: number,
  alturaCm: number,
  sexo: 'mujer' | 'hombre' | 'sin-decir',
  edad: number,
): ResultadoImc {
  const imc = calcularImc(pesoKg, alturaCm)
  const corte = CORTES.find((c) => imc < c.hasta) ?? CORTES[CORTES.length - 1]

  let advertencia: string | null = null
  if (edad < 20) {
    advertencia =
      'Antes de los 20 años el IMC no se lee con esta tabla: se compara con percentiles por edad. Tómalo solo como referencia.'
  } else if (edad >= 65) {
    advertencia =
      'Después de los 65 los rangos de la OMS pierden precisión: un poco por encima no significa lo mismo que a los 30.'
  }

  return {
    imc: Math.round(imc * 10) / 10,
    categoria: corte.categoria,
    etiqueta: corte.etiqueta,
    percentilMundial: percentilMundial(imc, sexo),
    frase: FRASES[corte.categoria],
    advertencia,
  }
}

/** Frase para la comparacion mundial, redactada sin juicio. */
export function fraseMundial(percentil: number): string {
  if (percentil <= 5) {
    return 'Estás por debajo del 95% de los adultos del mundo en índice de masa corporal.'
  }
  if (percentil >= 95) {
    return 'Estás por encima del 95% de los adultos del mundo en índice de masa corporal.'
  }
  return `Cerca del ${percentil}% de los adultos del mundo tiene un índice más bajo que el tuyo.`
}
