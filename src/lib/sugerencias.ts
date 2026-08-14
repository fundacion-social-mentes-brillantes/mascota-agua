// "Lo de siempre": los botones de un toque.
//
// POR QUE EXISTE: registrar el mismo vaso de agua de todos los dias costaba
// cuatro toques (abrir, elegir bebida, ajustar mililitros, guardar). Y la app
// YA SABE que toma esta persona: esta escrito en sus propios registros.
//
// Esto no adivina ni inventa nada. Solo repite combinaciones que la persona ya
// declaro con sus manos, y por eso es la unica funcion de la app que puede
// ahorrar toques sin arriesgarse a mentir.
import { bebidaPorId } from './bebidas'
import type { Registro } from './tipos'

export interface Sugerencia {
  bebida: string
  ml: number
  /** Cuantas veces la registro de verdad. */
  veces: number
  /** Las veces, pesadas por la hora del dia. Solo sirve para ordenar. */
  peso: number
}

/**
 * En que parte del dia estamos. La gente toma cosas distintas segun la hora:
 * tinto en la manana, agua de panela en la tarde. Repetir el tinto de las 7
 * a las 9 de la noche seria una sugerencia tonta.
 */
type Franja = 'manana' | 'mediodia' | 'tarde' | 'noche'

function franjaDe(hora: number): Franja {
  if (hora < 11) return 'manana'
  if (hora < 15) return 'mediodia'
  if (hora < 19) return 'tarde'
  return 'noche'
}

/** Con una sola vez no es "lo de siempre", es una casualidad. */
const VECES_MINIMAS = 2

/**
 * Las combinaciones que esta persona repite, con la de esta hora del dia
 * primero.
 *
 * Reglas, y cada una esta por algo:
 *  - Nunca dos botones de la misma bebida: tres tamanos de agua no le sirven
 *    a nadie.
 *  - Los mililitros van EXACTOS, sin redondear. Si la persona toma su tinto de
 *    180 ml, el boton dice 180, no 200. Redondear seria cambiarle el dato.
 *  - De noche no se propone nada con cafeina, aunque sea lo que mas repite.
 *    Un boton que ofrece tinto a las nueve de la noche, en una app que ademas
 *    cuida el sueno, es un mal consejo con cara de comodidad.
 */
export function loDeSiempre(registros: Registro[], ahora = Date.now(), cuantas = 3): Sugerencia[] {
  const franjaAhora = franjaDe(new Date(ahora).getHours())
  const esDeNoche = franjaAhora === 'noche'
  const cuenta = new Map<string, Sugerencia>()

  for (const r of registros) {
    const ml = Math.round(r.mlBruto ?? r.ml)
    if (ml <= 0) continue
    const bebida = bebidaPorId(r.bebida)
    if (esDeNoche && bebida.cafeinaPor100Ml > 0) continue

    const clave = `${bebida.id}|${ml}`
    // Lo que se toma a esta hora pesa mucho mas: es lo que probablemente
    // esta a punto de tomarse otra vez.
    const peso = franjaDe(new Date(r.hora).getHours()) === franjaAhora ? 5 : 1
    const previo = cuenta.get(clave)
    if (previo) {
      previo.veces += 1
      previo.peso += peso
    } else {
      cuenta.set(clave, { bebida: bebida.id, ml, veces: 1, peso })
    }
  }

  const ordenadas = [...cuenta.values()]
    .filter((s) => s.veces >= VECES_MINIMAS)
    .sort((a, b) => b.peso - a.peso)

  const elegidas: Sugerencia[] = []
  const bebidasYaPuestas = new Set<string>()
  for (const s of ordenadas) {
    if (bebidasYaPuestas.has(s.bebida)) continue
    elegidas.push(s)
    bebidasYaPuestas.add(s.bebida)
    if (elegidas.length >= cuantas) break
  }
  return elegidas
}
