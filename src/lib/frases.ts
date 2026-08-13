// Lo que la mascota dice que esta pasando por dentro.
//
// Regla de esta app: la mascota NO exagera para asustar. Cada frase tiene
// detras un dato real de fisiologia, y va entre parentesis para que se pueda
// comprobar. Las fuentes estan en docs/investigacion-hidratacion.md.
import type { EstadoCuerpo } from './tipos'

interface Tramo {
  /** Desde cuantas horas sin beber aplica. */
  desdeHoras: number
  frases: string[]
}

const POR_TIEMPO: Tramo[] = [
  {
    desdeHoras: 0,
    frases: [
      'Ahora mismo la sangre está en su punto: ni espesa ni aguada (osmolalidad cerca de 285-290 mOsm/kg).',
      'El riñón está trabajando cómodo: puede botar lo que sobra sin apretar.',
      'Con este nivel la orina sale clarita, como limonada suave. Esa es la señal de que vas bien.',
    ],
  },
  {
    desdeHoras: 2,
    frases: [
      'Ya llevo dos horas sin recibir agua. Todavía no pasa nada grave, pero el cuerpo empezó a ahorrar.',
      'El cerebro soltó un poco de vasopresina: la hormona que le dice al riñón "guarda agua". La orina ya sale más oscura.',
      'La sed todavía no aprieta. Ojo con eso: la sed llega tarde, no es el primer aviso.',
    ],
  },
  {
    desdeHoras: 4,
    frases: [
      'Cuatro horas. La sangre está un poquito más concentrada y el corazón tiene que empujar un poco más duro.',
      'El riñón está exprimiendo: concentra la orina para no perder agua. Por eso sale más amarilla y con más olor.',
      'Aquí es donde suele aparecer ese cansancio raro que uno le echa al trabajo, y a veces es solo agua.',
    ],
  },
  {
    desdeHoras: 6,
    frases: [
      'Seis horas sin agua. Perder apenas el 1% del peso en líquido ya se siente en el ánimo: más cansancio y más tensión (medido en estudios de deshidratación leve).',
      'Ese dolor de cabeza que a veces llega a media tarde muchas veces empieza justo aquí.',
      'La boca seca y la saliva espesa no son manías: son el cuerpo racionando.',
    ],
  },
  {
    desdeHoras: 8,
    frases: [
      'Ocho horas o más. Pasado el 2% de pérdida de peso en agua, lo que sí está claro en los estudios es que el cansancio sube y la concentración se hace cuesta arriba.',
      'La sangre con menos volumen hace que el corazón lata más rápido para mover lo mismo.',
      'Si esto se vuelve costumbre, sube el riesgo de estreñimiento, de infección urinaria y de cálculos en el riñón.',
      'No es para asustarte: es para que sepas que lo que sientes tiene nombre.',
    ],
  },
]

const POR_NIVEL: Record<EstadoCuerpo['nivel'], string[]> = {
  pleno: [
    'Estoy lleno. Así es como se supone que trabaja el cuerpo todo el día.',
    'Con este nivel las articulaciones están bien lubricadas y la piel aguanta mejor el día.',
  ],
  bien: [
    'Voy bien. No te confíes: la idea es sostenerlo, no llegar de milagro en la noche.',
    'A este ritmo el riñón no tiene que hacer fuerza.',
  ],
  atento: [
    'Vamos justos para la hora que es. Un vaso ahora y nos ponemos al día.',
    'Todavía estás a tiempo de que el día no se sienta pesado.',
  ],
  bajo: [
    'Estoy bajo. Esto ya se nota en cómo piensas y en cómo te sientes, aunque lo achaques a otra cosa.',
    'Un vaso ahora hace más por ti que un tinto.',
  ],
  critico: [
    'Estoy en rojo. Esto no es drama: llevas demasiado tiempo sin agua y tu cuerpo está racionando.',
    'Tómate un vaso ya, despacio. No te lo tomes de golpe, que no es una carrera.',
  ],
}

/** Cuando se paso de agua. Tambien es un problema, y de los serios. */
const EXCESO = [
  'Tomar mucha agua muy rápido diluye el sodio de la sangre. Eso se llama hiponatremia y en casos graves manda gente al hospital.',
  'El riñón solo puede eliminar cerca de 0,8 a 1 litro por hora. Todo lo que pase de ahí se queda dando vueltas.',
]

/**
 * Dos o tres frases para el estado de ahora. La primera siempre habla del
 * tiempo sin beber, que es lo que mas manda.
 */
export function describirCuerpo(estado: EstadoCuerpo): string[] {
  if (estado.alertaExceso) return [estado.alertaExceso, EXCESO[0]]

  const horas = Number.isFinite(estado.horasSinBeber) ? estado.horasSinBeber : 6
  const tramo = [...POR_TIEMPO].reverse().find((t) => horas >= t.desdeHoras) ?? POR_TIEMPO[0]

  // Se elige una frase distinta segun la hora del dia para que no repita
  // siempre la misma, pero sin usar azar (asi no cambia en cada pintado).
  const hora = new Date().getHours()
  const porNivel = POR_NIVEL[estado.nivel]
  const lineas = [tramo.frases[hora % tramo.frases.length], porNivel[hora % porNivel.length]]

  if (!Number.isFinite(estado.horasSinBeber)) {
    lineas[0] = 'Hoy todavía no has registrado ni un trago. Empecemos por uno.'
  }
  return lineas
}

/** Frase corta para el saludo grande de la pantalla principal. */
export function saludoDeLaMascota(estado: EstadoCuerpo, nombreMascota: string): string {
  if (estado.alertaExceso) return 'Frena un poco'
  switch (estado.nivel) {
    case 'pleno':
      return `${nombreMascota} está radiante`
    case 'bien':
      return `${nombreMascota} está contento`
    case 'atento':
      return `${nombreMascota} tiene sed`
    case 'bajo':
      return `${nombreMascota} está flojito`
    case 'critico':
      return `${nombreMascota} te necesita`
  }
}
