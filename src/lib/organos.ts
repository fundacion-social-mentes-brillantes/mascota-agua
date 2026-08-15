// Que le está pasando a cada órgano con el agua de HOY.
//
// Esto no es decoración. Cada órgano tiene un mecanismo real detrás, sacado
// de docs/investigacion-hidratacion.md, y el estado se calcula con los mismos
// números que ya usa el resto de la app: los mililitros del día y las horas
// sin beber.
//
// REGLA: no exagerar. Un cuerpo con 4 horas sin agua no está "en peligro",
// está ahorrando. Decirlo como es vale más que asustar.
import type { EstadoCuerpo } from './tipos'

export type EstadoOrgano = 'bien' | 'ajustando' | 'exigido' | 'sufriendo'

export interface Organo {
  id: string
  nombre: string
  emoji: string
  /** Cuánta agua tiene ese tejido, para dar contexto. */
  aguaQueTiene: string
  estado: EstadoOrgano
  /** 0 = perfecto, 100 = muy afectado. Es la barra que se ve. */
  afectacion: number
  /** Qué está pasando ahí adentro, ahora. */
  queLePasa: string
  /** El mecanismo, para quien quiera saber por qué. */
  porQue: string
}

const ETIQUETAS: Record<EstadoOrgano, string> = {
  bien: 'Trabajando cómodo',
  ajustando: 'Ajustándose',
  exigido: 'Exigido',
  sufriendo: 'Pasándola mal',
}

export function etiquetaDe(estado: EstadoOrgano): string {
  return ETIQUETAS[estado]
}

function escala(afectacion: number): EstadoOrgano {
  if (afectacion < 25) return 'bien'
  if (afectacion < 50) return 'ajustando'
  if (afectacion < 75) return 'exigido'
  return 'sufriendo'
}

/**
 * El estado de cada órgano ahora mismo.
 *
 * `presion` mezcla las dos cosas que de verdad importan: cuánto tiempo lleva
 * sin beber (lo que más pesa a corto plazo) y qué tan atrasado va respecto a
 * la meta del día.
 */
export function organosAhora(estado: EstadoCuerpo): Organo[] {
  const horas = Number.isFinite(estado.horasSinBeber) ? estado.horasSinBeber : 6
  const presion = Math.max(0, Math.min(100, 100 - estado.hidratacion))
  const exceso = Boolean(estado.alertaExceso)

  // Los riñones son los primeros en enterarse: son los que ahorran.
  const rinones = Math.min(100, presion * 1.15)
  // El cerebro aguanta un poco más antes de que se note.
  const cerebro = Math.min(100, Math.max(0, presion - 12) * 1.25)
  // La sangre pierde volumen despacio pero constante.
  const sangre = Math.min(100, presion * 0.95)
  const corazon = Math.min(100, Math.max(0, presion - 20) * 1.3)
  const musculos = Math.min(100, Math.max(0, presion - 8) * 1.1)
  const intestino = Math.min(100, Math.max(0, presion - 15) * 1.2)
  const piel = Math.min(100, Math.max(0, presion - 25) * 1.15)
  const articulaciones = Math.min(100, Math.max(0, presion - 30) * 1.2)

  return [
    {
      id: 'rinones',
      nombre: 'Riñones',
      emoji: '🫘',
      aguaQueTiene: '80% agua',
      estado: exceso ? 'exigido' : escala(rinones),
      afectacion: exceso ? 65 : rinones,
      queLePasa: exceso
        ? 'Están a tope filtrando. Solo alcanzan a botar cerca de 800 ml por hora, y ahorita les llegó más que eso.'
        : rinones < 25
          ? 'Filtran tranquilos y botan lo que sobra. Con esto la orina suele salir clarita.'
          : rinones < 50
            ? 'Empezaron a ahorrar: concentran la orina para no perder agua, y eso la vuelve más amarilla.'
            : rinones < 75
              ? `Llevan ${Math.floor(horas)} horas sin recibir agua nueva. Si te miras la orina y va oscura, eso lo confirma; la primera de la mañana no cuenta, que siempre es más oscura.`
              : 'Están apretando al máximo para retener cada gota. Así de seguido, sube el riesgo de cálculos.',
      porQue:
        'Cuando falta agua, el cerebro suelta vasopresina y el riñón reabsorbe más líquido en vez de botarlo.',
    },
    {
      id: 'cerebro',
      nombre: 'Cerebro',
      emoji: '🧠',
      aguaQueTiene: '75% agua',
      estado: escala(cerebro),
      afectacion: cerebro,
      queLePasa:
        cerebro < 25
          ? 'Bien regado. Es cuando la concentración y el ánimo están donde deben.'
          : cerebro < 50
            ? 'Nada grave todavía, pero es justo cuando aparece el cansancio que uno le echa al trabajo.'
            : cerebro < 75
              ? 'Con 1% de pérdida de líquido ya se siente: más fatiga, más tensión, menos paciencia.'
              : 'Pasado el 2%, concentrarse se vuelve cuesta arriba. El dolor de cabeza de media tarde suele empezar aquí.',
      porQue:
        'Está medido en estudios de deshidratación leve: lo que se afecta primero y de forma más consistente es el ánimo, no la inteligencia.',
    },
    {
      id: 'sangre',
      nombre: 'Sangre',
      emoji: '🩸',
      aguaQueTiene: '92% del plasma',
      estado: exceso ? 'exigido' : escala(sangre),
      afectacion: exceso ? 70 : sangre,
      queLePasa: exceso
        ? 'Ojo aquí: tomar mucha agua muy rápido diluye el sodio. Eso se llama hiponatremia y es de lo poco que sí manda gente al hospital.'
        : sangre < 25
          ? 'Ni espesa ni aguada. Osmolalidad cerca de 285-290 mOsm/kg, que es el punto.'
          : sangre < 50
            ? 'Un poquito más concentrada de lo ideal. Todavía sin consecuencias.'
            : sangre < 75
              ? 'Menos volumen de plasma: la sangre está más espesa y cuesta más moverla.'
              : 'Bastante concentrada. Es lo que hace que uno se sienta pesado sin saber por qué.',
      porQue: 'El plasma es lo primero que el cuerpo sacrifica cuando falta agua, porque puede.',
    },
    {
      id: 'corazon',
      nombre: 'Corazón',
      emoji: '❤️',
      aguaQueTiene: '73% agua',
      estado: escala(corazon),
      afectacion: corazon,
      queLePasa:
        corazon < 25
          ? 'Late tranquilo. Con buen volumen de sangre no tiene que hacer fuerza.'
          : corazon < 50
            ? 'Trabajando un poquito más de lo normal para mover lo mismo.'
            : corazon < 75
              ? 'Late más rápido: con menos volumen, toca dar más vueltas para llevar el mismo oxígeno.'
              : 'Está compensando en serio. Por eso subir escaleras se siente más duro de lo normal.',
      porQue: 'Menos plasma es menos volumen que bombear, y el cuerpo lo compensa subiendo la frecuencia.',
    },
    {
      id: 'musculos',
      nombre: 'Músculos',
      emoji: '💪',
      aguaQueTiene: '76% agua',
      estado: escala(musculos),
      afectacion: musculos,
      queLePasa:
        musculos < 25
          ? 'Bien hidratados. Es donde el cuerpo guarda la mayor parte de su agua.'
          : musculos < 50
            ? 'Todavía responden bien.'
            : musculos < 75
              ? 'Aquí empiezan los calambres y esa sensación de que pesan más.'
              : 'Rinden por debajo de lo que pueden, y se cansan antes.',
      porQue: 'El músculo es el depósito de agua más grande del cuerpo: cuando falta, es de donde se saca.',
    },
    {
      id: 'intestino',
      nombre: 'Intestino',
      emoji: '🌀',
      aguaQueTiene: 'necesita agua para mover todo',
      estado: escala(intestino),
      afectacion: intestino,
      queLePasa:
        intestino < 25
          ? 'Todo fluyendo como debe.'
          : intestino < 50
            ? 'Empieza a reabsorber más agua de lo normal.'
            : intestino < 75
              ? 'Está sacándole agua a lo que va pasando. Ahí es donde empieza el estreñimiento.'
              : 'Reabsorbiendo al máximo. Si esto es costumbre, el estreñimiento deja de ser ocasional.',
      porQue: 'Cuando falta agua en el cuerpo, el colon la recupera de las heces y las endurece.',
    },
    {
      id: 'piel',
      nombre: 'Piel',
      emoji: '🧴',
      aguaQueTiene: '64% agua',
      estado: escala(piel),
      afectacion: piel,
      queLePasa:
        piel < 25
          ? 'Elástica y con buena turgencia.'
          : piel < 50
            ? 'Sin cambios visibles todavía.'
            : piel < 75
              ? 'Labios y boca más secos de lo normal.'
              : 'Menos elástica: si uno se pellizca el dorso de la mano, tarda un poco más en volver.',
      porQue:
        'La piel es de lo último que el cuerpo protege: primero salva el cerebro y el corazón. Ojo: el pellizco es una señal poco fiable por sí sola.',
    },
    {
      id: 'articulaciones',
      nombre: 'Articulaciones',
      emoji: '🦴',
      aguaQueTiene: 'el líquido sinovial es casi todo agua',
      estado: escala(articulaciones),
      afectacion: articulaciones,
      queLePasa:
        articulaciones < 25
          ? 'Bien lubricadas.'
          : articulaciones < 50
            ? 'Normales.'
            : articulaciones < 75
              ? 'Un poco más rígidas al arrancar el movimiento.'
              : 'Con menos lubricación de la que deberían tener.',
      porQue: 'El líquido que amortigua las articulaciones se hace con agua del cuerpo.',
    },
  ]
}

/** Una frase de resumen para poner arriba del panel. */
export function resumenDelCuerpo(estado: EstadoCuerpo): string {
  if (estado.alertaExceso) return 'Frena: el problema ahora es el exceso, no la falta.'
  const organos = organosAhora(estado)
  const enProblemas = organos.filter((o) => o.estado === 'exigido' || o.estado === 'sufriendo')
  if (enProblemas.length === 0) return 'Todo trabajando cómodo. Así se siente estar bien.'
  if (enProblemas.length === 1) return `${enProblemas[0].nombre}: es el primero que se está resintiendo.`
  return `${enProblemas.length} órganos ya lo están sintiendo. Empiezan los riñones, siempre.`
}
