import { Suspense, lazy } from 'react'
import MascotaPlana from './Mascota'
import { expresionDe, type Momento } from '../lib/expresiones'
import type { EspecieMascota, NivelCuerpo } from '../lib/tipos'

// Envoltorio de la mascota.
//
// El 3D se carga aparte (son unos 700 KB) para que la app abra rapido, y si
// el telefono no puede con WebGL se cae al dibujo plano de siempre. Nadie se
// queda sin mascota.

const Mascota3D = lazy(() => import('./Mascota3D'))

let soportaWebGL: boolean | null = null

function hayWebGL(): boolean {
  if (soportaWebGL !== null) return soportaWebGL
  try {
    const lienzo = document.createElement('canvas')
    soportaWebGL = Boolean(
      window.WebGLRenderingContext &&
        (lienzo.getContext('webgl2') || lienzo.getContext('webgl')),
    )
  } catch {
    soportaWebGL = false
  }
  return soportaWebGL
}

export default function MascotaViva({
  especie,
  color,
  nivel,
  hidratacion,
  momento = 'nada',
  sombrero,
  accesorio,
  tamano = 300,
}: {
  especie: EspecieMascota
  color: string
  nivel: NivelCuerpo
  hidratacion: number
  /** Lo que acaba de pasar: le cambia la cara por un rato. */
  momento?: Momento
  sombrero?: string | null
  accesorio?: string | null
  tamano?: number
}) {
  const expresion = expresionDe(nivel, momento)
  // No hace falta estado ni efecto: si el telefono puede con 3D o no, no
  // cambia mientras la app esta abierta, y la respuesta se guarda la primera
  // vez que se pregunta.
  const enTresD = hayWebGL()

  const plana = (
    <MascotaPlana
      especie={especie}
      color={color}
      nivel={nivel}
      hidratacion={hidratacion}
      sombrero={sombrero}
      accesorio={accesorio}
      tamano={tamano}
    />
  )

  if (!enTresD) return plana

  return (
    <Suspense fallback={plana}>
      <Mascota3D
        especie={especie}
        color={color}
        nivel={nivel}
        hidratacion={hidratacion}
        expresion={expresion}
        sombrero={sombrero}
        accesorio={accesorio}
        alto={tamano}
      />
    </Suspense>
  )
}
