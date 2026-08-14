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
  const r = revisarToma(500, hist, 'agua', ahora)
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
  const r = revisarToma(100, hist2, 'agua', ahora)
  const aviso = r.sospecha ? '  <-- ' + r.sospecha : ''
  console.log(`  intento ${i + 1}: ${r.veredicto.padEnd(10)} guarda ${String(r.mlAceptado).padStart(3)} ml${aviso}`)
  if (r.mlAceptado > 0) hist2 = [...hist2, { id: String(i), ml: r.mlAceptado, hora: ahora, dia: 'prueba', recipiente: 'vaso', verificacion: 'sin-foto', tieneFotoLocal: false }]
}

console.log('')
console.log('=== ANTI-TRAMPA: un vaso imposible de 3 litros ===')
const r3 = revisarToma(3000, [], 'agua', aLas(9))
console.log(`  ${r3.veredicto} -> ${r3.mlAceptado} ml. ${r3.motivo}`)

console.log('')
console.log('=== BEBIDAS: cuanto entra de verdad ===')
for (const b of ['agua', 'agua-gas', 'tinto', 'gaseosa', 'jugo', 'cerveza', 'trago']) {
  const r = revisarToma(350, [], b, aLas(10))
  console.log(
    `  350 ml de ${b.padEnd(9)} -> entran ${String(r.mlEfectivo).padStart(3)} ml | ${r.nota ?? '(sin nota)'}`,
  )
}

console.log('')
console.log('=== EL DIA DE SOLO GASEOSA (lo que preocupaba a Sebastian) ===')
const soloGaseosa: Registro[] = [0, 1, 2, 3].map((i) => ({
  id: 'g' + i,
  ml: 450,
  mlBruto: 500,
  bebida: 'gaseosa',
  hora: aLas(9 + i * 2),
  dia: 'prueba',
  recipiente: 'botella',
  verificacion: 'sin-foto',
  tieneFotoLocal: false,
}))
const eGaseosa = calcularEstadoCuerpo(p75, soloGaseosa, aLas(17))
console.log(`  Liquido que le entro al cuerpo : ${eGaseosa.totalHoyMl} ml`)
console.log(`  Agua (lo que cuenta la meta)   : ${eGaseosa.aguaHoyMl} ml`)
console.log(`  Otras bebidas                  : ${eGaseosa.otrasBebidasMl} ml`)
console.log(`  Cafeina                        : ${eGaseosa.cafeinaHoyMg} mg`)
console.log(`  Como se ve la mascota          : ${eGaseosa.hidratacion}/100 (${eGaseosa.nivel})`)
console.log(`  Medalla del agua               : ${eGaseosa.porcentaje}%`)
const cGaseosa = consejoAhora(p75, eGaseosa, aLas(17))
console.log(`  Consejo: ${cGaseosa.accion.toUpperCase()} ${cGaseosa.ml} ml`)
console.log(`           ${cGaseosa.resumen}`)

console.log('')
console.log('=== TOPE DE LA CERVEZA ===')
let cervezas: Registro[] = []
for (let i = 0; i < 3; i++) {
  const r = revisarToma(330, cervezas, 'cerveza', aLas(18 + i))
  console.log(`  cerveza ${i + 1} de 330 ml -> entran ${r.mlEfectivo} ml | ${r.nota ?? ''}`)
  cervezas = [
    ...cervezas,
    {
      id: 'c' + i,
      ml: r.mlEfectivo,
      mlBruto: r.mlAceptado,
      bebida: 'cerveza',
      hora: aLas(18 + i),
      dia: 'prueba',
      recipiente: 'botella',
      verificacion: 'sin-foto',
      tieneFotoLocal: false,
    },
  ]
}

console.log('')
console.log('=== CAFEINA: cuando avisa ===')
for (const tazas of [1, 2, 3, 4]) {
  const cafes: Registro[] = Array.from({ length: tazas }, (_, i) => ({
    id: 'k' + i,
    ml: 180,
    mlBruto: 180,
    bebida: 'tinto',
    hora: aLas(8 + i),
    dia: 'prueba',
    recipiente: 'pocillo',
    verificacion: 'sin-foto',
    tieneFotoLocal: false,
  }))
  const e = calcularEstadoCuerpo(p75, cafes, aLas(14))
  const aviso = e.cafeinaHoyMg >= 250 ? '  <-- ya avisa' : ''
  console.log(`  ${tazas} tinto(s) de 180 ml -> ${e.cafeinaHoyMg} mg${aviso}`)
}
