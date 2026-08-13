// La tienda de la mascota.
//
// Aviso importante de diseno: NADA de lo que se compra aqui sube el nivel de
// agua del cuerpo. La comida y los sombreros dan carino y experiencia, no
// hidratacion. Si comprar cositas pudiera "curar" a la mascota, la app
// estaria ensenando justo lo contrario de lo que quiere ensenar.

export interface ArticuloTienda {
  id: string
  nombre: string
  descripcion: string
  precio: number
  tipo: 'comida' | 'sombrero' | 'accesorio'
  emoji: string
  /** Solo para sombreros y accesorios: el valor que se guarda en la mascota. */
  valor?: string
}

export const ARTICULOS: ArticuloTienda[] = [
  {
    id: 'comida-alga',
    nombre: 'Alga fresca',
    descripcion: 'La comida de todos los días. Sube el ánimo un rato.',
    precio: 15,
    tipo: 'comida',
    emoji: '🌿',
  },
  {
    id: 'comida-fruta',
    nombre: 'Fruta jugosa',
    descripcion: 'Sandía, melón, naranja. Comer fruta también es tomar agua.',
    precio: 30,
    tipo: 'comida',
    emoji: '🍉',
  },
  {
    id: 'comida-pastel',
    nombre: 'Pastel de burbujas',
    descripcion: 'Un gusto. Ni siquiera pretende ser saludable.',
    precio: 60,
    tipo: 'comida',
    emoji: '🧁',
  },
  {
    id: 'sombrero-gorra',
    nombre: 'Gorra',
    descripcion: 'Para el sol de las dos de la tarde.',
    precio: 80,
    tipo: 'sombrero',
    emoji: '🧢',
    valor: 'gorra',
  },
  {
    id: 'sombrero-sombrilla',
    nombre: 'Sombrilla',
    descripcion: 'Sombra portátil.',
    precio: 120,
    tipo: 'sombrero',
    emoji: '⛱️',
    valor: 'sombrilla',
  },
  {
    id: 'sombrero-corona',
    nombre: 'Corona',
    descripcion: 'Para cuando lleves una racha larga.',
    precio: 300,
    tipo: 'sombrero',
    emoji: '👑',
    valor: 'corona',
  },
  {
    id: 'accesorio-lentes',
    nombre: 'Lentes de sol',
    descripcion: 'Estilo, nada más.',
    precio: 90,
    tipo: 'accesorio',
    emoji: '🕶️',
    valor: 'lentes',
  },
  {
    id: 'accesorio-bufanda',
    nombre: 'Bufanda',
    descripcion: 'Abriga aunque uno sea de agua.',
    precio: 110,
    tipo: 'accesorio',
    emoji: '🧣',
    valor: 'bufanda',
  },
  {
    id: 'accesorio-flotador',
    nombre: 'Flotador',
    descripcion: 'Por si acaso.',
    precio: 160,
    tipo: 'accesorio',
    emoji: '🛟',
    valor: 'flotador',
  },
]

/** Cuantas horas dura contenta despues de comer. */
export const HORAS_DE_HAMBRE = 8

export function tieneHambre(ultimaComida: number, ahora = Date.now()): boolean {
  return ahora - ultimaComida > HORAS_DE_HAMBRE * 3_600_000
}

/**
 * Deja la mascota recien comida. Va aqui y no en la pantalla porque quien
 * mira el reloj debe ser la capa de datos, no el dibujo.
 */
export function alimentar<T extends { xp: number; gotas: number; ultimaComida: number }>(
  mascota: T,
  precio: number,
  xpGanada = 20,
): T {
  return {
    ...mascota,
    gotas: mascota.gotas - precio,
    xp: mascota.xp + xpGanada,
    ultimaComida: Date.now(),
  }
}

/** Un nivel cada 100 puntos de experiencia. */
export function nivelPorXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1)
}

export function xpQueFaltaParaSubir(xp: number): number {
  return 100 - (xp % 100)
}
