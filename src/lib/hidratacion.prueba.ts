// Prueba de mesa del motor de hidratacion. No entra en la app: se corre a
// mano con `npx vite-node src/lib/hidratacion.prueba.ts` cuando se toca un
// numero, para ver con los ojos que la franja sigue teniendo sentido.
import {
  calcularEstadoCuerpo,
  calcularMeta,
  consejoAhora,
  franjaDelDia,
  maximoSeguroAntesDeDormir,
  revisarToma,
  zonaDelDia,
} from './hidratacion'
import type { Perfil, Registro } from './tipos'

const base: Perfil = {
  nombre: 'Prueba',
  edad: 34,
  sexo: 'hombre',
  pesoKg: 75,
  alturaCm: 172,
  actividad: 'moderada',
  clima: 'frio',
  altitudAlta: false,
  etapa: 'ninguna',
  condiciones: [],
  requiereMedico: false,
  creado: 0,
  actualizado: 0,
  metaMl: 0,
  horaDespertar: '06:00',
  horaDormir: '23:00',
  recordatoriosActivos: true,
}

function conMeta(p: Partial<Perfil>): Perfil {
  const perfil = { ...base, ...p }
  return { ...perfil, metaMl: calcularMeta(perfil).metaMl }
}

console.log('=== LA FRANJA, PARA DISTINTAS PERSONAS ===')
for (const quien of [
  { etiqueta: 'Hombre 34a, 75 kg, frio', p: {} },
  { etiqueta: 'Mujer 30a, 55 kg, templado', p: { sexo: 'mujer' as const, pesoKg: 55, clima: 'templado' as const } },
  { etiqueta: 'Nina 10a, 32 kg', p: { edad: 10, pesoKg: 32, sexo: 'mujer' as const } },
  { etiqueta: 'Adulto mayor 70a, 68 kg', p: { edad: 70, pesoKg: 68 } },
  { etiqueta: 'Deportista 90 kg, calor', p: { pesoKg: 90, actividad: 'muy-alta' as const, clima: 'calor' as const } },
]) {
  const perfil = conMeta(quien.p)
  const f = franjaDelDia(perfil.metaMl, perfil.pesoKg)
  console.log(
    `${quien.etiqueta.padEnd(30)} minimo ${String(f.minimoMl).padStart(4)} | meta ${String(f.metaMl).padStart(4)} | techo ${String(f.techoMl).padStart(4)} | maximo ${f.maximoMl}`,
  )
}

console.log('')
console.log('=== EN QUE ZONA CAE CADA CANTIDAD (perfil de 75 kg) ===')
const p75 = conMeta({})
const f75 = franjaDelDia(p75.metaMl, p75.pesoKg)
for (const ml of [0, 500, 1000, 1100, 2000, 2450, 3000, 3700, 4200]) {
  console.log(`  ${String(ml).padStart(4)} ml -> ${zonaDelDia(ml, f75)}`)
}

console.log('')
console.log('=== CUANTO CABE ANTES DE DORMIR ===')
for (const min of [-30, 0, 30, 75, 120, 200]) {
  console.log(`  faltan ${String(min).padStart(4)} min -> maximo ${maximoSeguroAntesDeDormir(min)} ml`)
}

console.log('')
console.log('=== EL CASO QUE PREGUNTO SEBASTIAN: no tomo NADA en todo el dia ===')
const dia = new Date()
dia.setHours(0, 0, 0, 0)
const aLas = (h: number, m = 0) => dia.getTime() + h * 3_600_000 + m * 60_000
for (const hora of [15, 20, 22, 22.5, 23.5]) {
  const h = Math.floor(hora)
  const m = Math.round((hora - h) * 60)
  const ahora = aLas(h, m)
  const estado = calcularEstadoCuerpo(p75, [], ahora)
  const c = consejoAhora(p75, estado, ahora)
  console.log(`  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} -> ${c.accion.toUpperCase()} ${c.ml} ml`)
  console.log(`         ${c.resumen}`)
}

console.log('')
console.log('=== ANTI-TRAMPA: dandole sin parar al boton de 500 ml ===')
let hist: Registro[] = []
const arranque = aLas(9)
for (let i = 0; i < 6; i++) {
  const ahora = arranque + i * 60_000 // uno por minuto
  const r = revisarToma(500, hist, ahora)
  console.log(
    `  intento ${i + 1}: pidio 500 -> ${r.veredicto.padEnd(10)} guarda ${String(r.mlAceptado).padStart(3)} ml  ${r.motivo}`,
  )
  if (r.mlAceptado > 0) hist = [...hist, { id: String(i), ml: r.mlAceptado, hora: ahora, dia: 'prueba', recipiente: 'vaso', verificacion: 'sin-foto', tieneFotoLocal: false }]
}
console.log(`  total que quedo guardado: ${hist.reduce((t, r) => t + r.ml, 0)} ml`)

console.log('')
console.log('=== ANTI-TRAMPA: el listo que registra 100 ml cada minuto ===')
let hist2: Registro[] = []
for (let i = 0; i < 7; i++) {
  const ahora = arranque + i * 60_000
  const r = revisarToma(100, hist2, ahora)
  const aviso = r.sospecha ? '  <-- ' + r.sospecha : ''
  console.log(`  intento ${i + 1}: ${r.veredicto.padEnd(10)} guarda ${String(r.mlAceptado).padStart(3)} ml${aviso}`)
  if (r.mlAceptado > 0) hist2 = [...hist2, { id: String(i), ml: r.mlAceptado, hora: ahora, dia: 'prueba', recipiente: 'vaso', verificacion: 'sin-foto', tieneFotoLocal: false }]
}

console.log('')
console.log('=== ANTI-TRAMPA: un vaso imposible de 3 litros ===')
const r3 = revisarToma(3000, [], aLas(9))
console.log(`  ${r3.veredicto} -> ${r3.mlAceptado} ml. ${r3.motivo}`)
