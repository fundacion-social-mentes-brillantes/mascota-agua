// La forma de cada criatura, en 3D.
//
// Todas se construyen con perfiles de revolucion (LatheGeometry): se dibuja
// la silueta de medio cuerpo y se gira 360 grados. Es la forma mas barata de
// conseguir cuerpos organicos y suaves, y ademas deja el interior hueco para
// que se le vea el agua.
import * as THREE from 'three'
import type { EspecieMascota } from '../lib/tipos'

/** Altura util del cuerpo. El agua se mide entre 0 y este valor. */
export const ALTO = 2

interface Receta {
  /** Silueta de medio cuerpo, de abajo hacia arriba. */
  perfil: [number, number][]
  /** Donde van los ojos y de que tamano. */
  ojos: { y: number; separacion: number; radio: number; z: number }
  /** Altura de la boca. */
  bocaY: number
  /** Detalles propios de la especie. */
  branquias?: boolean
  tentaculos?: number
  patas?: boolean
  orejas?: boolean
}

const RECETAS: Record<EspecieMascota, Receta> = {
  // Gota clasica: base ancha y redonda, punta arriba.
  gota: {
    perfil: [
      [0, 0],
      [0.52, 0.02],
      [0.78, 0.18],
      [0.92, 0.45],
      [0.95, 0.75],
      [0.86, 1.08],
      [0.68, 1.42],
      [0.44, 1.72],
      [0.2, 1.92],
      [0, 2],
    ],
    ojos: { y: 1.0, separacion: 0.34, radio: 0.2, z: 0.62 },
    bocaY: 0.66,
  },
  // Axolote: cabezon, achatado, con branquias.
  axolote: {
    perfil: [
      [0, 0],
      [0.58, 0.03],
      [0.85, 0.22],
      [1.0, 0.55],
      [1.02, 0.92],
      [0.94, 1.25],
      [0.74, 1.55],
      [0.45, 1.8],
      [0.18, 1.94],
      [0, 2],
    ],
    ojos: { y: 1.15, separacion: 0.38, radio: 0.19, z: 0.68 },
    bocaY: 0.78,
    branquias: true,
  },
  // Pulpo: domo alto con tentaculos abajo.
  pulpo: {
    perfil: [
      [0, 0.02],
      [0.62, 0.06],
      [0.86, 0.3],
      [0.96, 0.7],
      [0.94, 1.1],
      [0.8, 1.48],
      [0.55, 1.78],
      [0.24, 1.95],
      [0, 2],
    ],
    ojos: { y: 1.16, separacion: 0.34, radio: 0.2, z: 0.6 },
    bocaY: 0.86,
    tentaculos: 6,
  },
  // Tortuga: bajita y ancha, con patitas.
  tortuga: {
    perfil: [
      [0, 0],
      [0.72, 0.02],
      [0.98, 0.2],
      [1.08, 0.5],
      [1.04, 0.85],
      [0.88, 1.2],
      [0.6, 1.5],
      [0.28, 1.7],
      [0, 1.78],
    ],
    ojos: { y: 0.95, separacion: 0.36, radio: 0.18, z: 0.72 },
    bocaY: 0.62,
    patas: true,
  },
  // Nube: bordes con bollitos, mas ancha que alta.
  nube: {
    perfil: [
      [0, 0.05],
      [0.66, 0.1],
      [0.9, 0.32],
      [0.98, 0.62],
      [0.9, 0.9],
      [0.98, 1.15],
      [0.86, 1.45],
      [0.56, 1.72],
      [0.24, 1.9],
      [0, 1.96],
    ],
    ojos: { y: 1.05, separacion: 0.34, radio: 0.19, z: 0.66 },
    bocaY: 0.72,
    orejas: true,
  },
}

export function recetaDe(especie: EspecieMascota): Receta {
  return RECETAS[especie] ?? RECETAS.gota
}

/** Suaviza el perfil con una curva para que no queden aristas. */
function suavizar(puntos: [number, number][], divisiones = 6): THREE.Vector2[] {
  const curva = new THREE.SplineCurve(puntos.map(([x, y]) => new THREE.Vector2(x, y)))
  return curva.getPoints(puntos.length * divisiones)
}

const cache = new Map<string, THREE.LatheGeometry>()

/**
 * El cuerpo. `encogido` sirve para el agua de adentro, que es el mismo cuerpo
 * un poquito mas pequeno para que se vea el vidrio por fuera.
 */
export function geometriaCuerpo(especie: EspecieMascota, encogido = 1): THREE.LatheGeometry {
  const clave = `${especie}-${encogido}`
  const guardada = cache.get(clave)
  if (guardada) return guardada

  const receta = recetaDe(especie)
  const puntos = suavizar(receta.perfil).map(
    (p) => new THREE.Vector2(Math.max(0.001, p.x * encogido), p.y * encogido),
  )
  const geometria = new THREE.LatheGeometry(puntos, 64)
  geometria.computeVertexNormals()
  cache.set(clave, geometria)
  return geometria
}

/**
 * Que tan ancho es el cuerpo a una altura dada. Sirve para tapar la
 * superficie del agua con un disco del tamano exacto.
 */
export function radioEnAltura(especie: EspecieMascota, y: number, encogido = 1): number {
  const perfil = recetaDe(especie).perfil
  const altura = y / encogido
  for (let i = 0; i < perfil.length - 1; i++) {
    const [x1, y1] = perfil[i]
    const [x2, y2] = perfil[i + 1]
    if (altura >= y1 && altura <= y2) {
      const t = y2 === y1 ? 0 : (altura - y1) / (y2 - y1)
      return (x1 + (x2 - x1) * t) * encogido
    }
  }
  return altura < perfil[0][1] ? perfil[0][0] * encogido : 0.01
}

/** Libera lo que se quedo en memoria (solo se usa al recargar en desarrollo). */
export function limpiarGeometrias() {
  cache.forEach((g) => g.dispose())
  cache.clear()
}
