import type { Recipiente } from './tipos'

/** Los tamanos tipicos en Colombia, para no tener que medir nada. */
export const RECIPIENTES: {
  id: Recipiente
  nombre: string
  ml: number
  emoji: string
}[] = [
  { id: 'pocillo', nombre: 'Pocillo', ml: 180, emoji: '☕' },
  { id: 'vaso', nombre: 'Vaso', ml: 250, emoji: '🥛' },
  { id: 'botella', nombre: 'Botella', ml: 500, emoji: '🍶' },
  { id: 'termo', nombre: 'Termo', ml: 750, emoji: '🧴' },
  { id: 'botellon', nombre: 'Botella grande', ml: 1000, emoji: '💧' },
  { id: 'otro', nombre: 'Otra medida', ml: 300, emoji: '✏️' },
]

export function recipientePorId(id: Recipiente) {
  return RECIPIENTES.find((r) => r.id === id) ?? RECIPIENTES[1]
}
