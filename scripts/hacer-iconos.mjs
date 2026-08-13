// Genera los iconos PNG de la app a partir de un SVG.
// Se corre a mano cuando cambie el dibujo:  node scripts/hacer-iconos.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const aqui = dirname(fileURLToPath(import.meta.url))
const salida = join(aqui, '..', 'public', 'icons')

/** La gota con cara, sobre el fondo azul oscuro de la app. */
function svgIcono(lado, margen) {
  const escala = (lado - margen * 2) / 64
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8ee0ff"/>
      <stop offset="100%" stop-color="#1a6f9e"/>
    </linearGradient>
    <radialGradient id="f" cx="50%" cy="0%">
      <stop offset="0%" stop-color="#0e4f7a"/>
      <stop offset="100%" stop-color="#04121f"/>
    </radialGradient>
  </defs>
  <rect width="${lado}" height="${lado}" fill="url(#f)"/>
  <g transform="translate(${margen} ${margen}) scale(${escala})">
    <path d="M32 5 C 44 20 54 30 54 39 A 22 22 0 0 1 10 39 C 10 30 20 20 32 5 Z" fill="url(#g)"/>
    <circle cx="25" cy="38" r="3.6" fill="#04121f"/>
    <circle cx="39" cy="38" r="3.6" fill="#04121f"/>
    <path d="M26 46 Q 32 51 38 46" stroke="#04121f" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
</svg>`
}

await mkdir(salida, { recursive: true })

const trabajos = [
  { nombre: 'icon-192.png', lado: 192, margen: 18 },
  { nombre: 'icon-512.png', lado: 512, margen: 48 },
  // El maskable necesita mas aire: Android le recorta las esquinas.
  { nombre: 'maskable-512.png', lado: 512, margen: 108 },
  { nombre: 'apple-touch-icon-180.png', lado: 180, margen: 16 },
]

for (const { nombre, lado, margen } of trabajos) {
  const png = await sharp(Buffer.from(svgIcono(lado, margen))).png().toBuffer()
  await writeFile(join(salida, nombre), png)
  console.log('Listo:', nombre)
}
