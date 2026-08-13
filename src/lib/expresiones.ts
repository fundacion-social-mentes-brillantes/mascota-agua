// Las caras de la mascota.
//
// El nivel de agua marca el fondo del animo, pero encima pasan cosas: acabas
// de darle agua, tiene hambre, es de noche, cumplio la meta. Eso es lo que
// hace que no parezca una figura con cinco estados, sino alguien que
// reacciona.
import type { NivelCuerpo } from './tipos'

export type Expresion =
  | 'emocionada' // le acabas de dar agua
  | 'feliz' // meta cumplida
  | 'contenta'
  | 'neutral'
  | 'sed'
  | 'triste'
  | 'agotada'
  | 'dormida'
  | 'sorprendida'
  | 'guino'
  | 'hambrienta'
  | 'mareada' // se paso de agua

/** Cosas que pasan y le cambian la cara por un rato. */
export type Momento =
  | 'nada'
  | 'acaba-de-beber'
  | 'meta-cumplida'
  | 'tiene-hambre'
  | 'de-noche'
  | 'exceso'
  | 'saludando'

export function expresionDe(nivel: NivelCuerpo, momento: Momento = 'nada'): Expresion {
  // Lo que acaba de pasar manda sobre el animo de fondo.
  switch (momento) {
    case 'acaba-de-beber':
      return 'emocionada'
    case 'meta-cumplida':
      return 'feliz'
    case 'exceso':
      return 'mareada'
    case 'de-noche':
      return nivel === 'critico' || nivel === 'bajo' ? 'agotada' : 'dormida'
    case 'saludando':
      return nivel === 'critico' ? 'triste' : 'guino'
    case 'tiene-hambre':
      return nivel === 'critico' ? 'agotada' : 'hambrienta'
    default:
      break
  }

  switch (nivel) {
    case 'pleno':
      return 'feliz'
    case 'bien':
      return 'contenta'
    case 'atento':
      return 'sed'
    case 'bajo':
      return 'triste'
    case 'critico':
      return 'agotada'
  }
}

interface Rasgos {
  /** Como se dibujan los ojos. */
  ojos: 'abiertos' | 'arco' | 'entrecerrados' | 'cerrados' | 'enormes' | 'guino'
  /** Que tanto se cierran los parpados, de 0 a 1. */
  parpado: number
  boca: 'sonrisa-abierta' | 'sonrisa' | 'recta' | 'triste' | 'o' | 'ondulada'
  cejas: 'ninguna' | 'preocupadas' | 'levantadas' | 'caidas'
  cachetes: boolean
  sudor: boolean
  chispas: boolean
  zzz: boolean
  /** Que tan animada esta: mueve la respiracion y el balanceo. */
  energia: number
}

const RASGOS: Record<Expresion, Rasgos> = {
  emocionada: {
    ojos: 'enormes',
    parpado: 0,
    boca: 'sonrisa-abierta',
    cejas: 'levantadas',
    cachetes: true,
    sudor: false,
    chispas: true,
    zzz: false,
    energia: 1.6,
  },
  feliz: {
    ojos: 'arco',
    parpado: 0,
    boca: 'sonrisa-abierta',
    cejas: 'ninguna',
    cachetes: true,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 1.25,
  },
  contenta: {
    ojos: 'abiertos',
    parpado: 0,
    boca: 'sonrisa',
    cejas: 'ninguna',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 1,
  },
  neutral: {
    ojos: 'abiertos',
    parpado: 0,
    boca: 'recta',
    cejas: 'ninguna',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 0.9,
  },
  sed: {
    ojos: 'entrecerrados',
    parpado: 0.3,
    boca: 'recta',
    cejas: 'preocupadas',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 0.8,
  },
  triste: {
    ojos: 'entrecerrados',
    parpado: 0.45,
    boca: 'triste',
    cejas: 'caidas',
    cachetes: false,
    sudor: true,
    chispas: false,
    zzz: false,
    energia: 0.6,
  },
  agotada: {
    ojos: 'entrecerrados',
    parpado: 0.72,
    boca: 'triste',
    cejas: 'caidas',
    cachetes: false,
    sudor: true,
    chispas: false,
    zzz: false,
    energia: 0.4,
  },
  dormida: {
    ojos: 'cerrados',
    parpado: 1,
    boca: 'o',
    cejas: 'ninguna',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: true,
    energia: 0.35,
  },
  sorprendida: {
    ojos: 'enormes',
    parpado: 0,
    boca: 'o',
    cejas: 'levantadas',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 1.3,
  },
  guino: {
    ojos: 'guino',
    parpado: 0,
    boca: 'sonrisa',
    cejas: 'levantadas',
    cachetes: true,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 1.15,
  },
  hambrienta: {
    ojos: 'abiertos',
    parpado: 0.15,
    boca: 'ondulada',
    cejas: 'preocupadas',
    cachetes: false,
    sudor: false,
    chispas: false,
    zzz: false,
    energia: 0.85,
  },
  mareada: {
    ojos: 'entrecerrados',
    parpado: 0.35,
    boca: 'ondulada',
    cejas: 'levantadas',
    cachetes: true,
    sudor: true,
    chispas: false,
    zzz: false,
    energia: 0.7,
  },
}

export function rasgosDe(expresion: Expresion): Rasgos {
  return RASGOS[expresion] ?? RASGOS.neutral
}
