import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { ALTO, geometriaCuerpo, radioEnAltura, recetaDe } from './criaturas'
import { rasgosDe, type Expresion } from '../lib/expresiones'
import type { EspecieMascota, NivelCuerpo } from '../lib/tipos'

type Rasgos = ReturnType<typeof rasgosDe>

// La mascota en 3D.
//
// La idea que sostiene todo: el cuerpo es de vidrio-gelatina y por dentro
// tiene AGUA DE VERDAD, con su superficie y su reflejo. El nivel de esa agua
// es el mismo numero que calcula hidratacion.ts. Si el cuerpo esta al 20%,
// se le ve al 20%. Ese es el corazon de la app y por eso no se usa un modelo
// descargado: ningun animalito de internet permite verle el agua por dentro.

const ENCOGIDO_AGUA = 0.93

/** Cielo de estudio hecho a mano: sin descargar nada, funciona sin internet. */
function useCieloDeEstudio() {
  const { scene, gl } = useThree()
  useEffect(() => {
    const lienzo = document.createElement('canvas')
    lienzo.width = 128
    lienzo.height = 256
    const pincel = lienzo.getContext('2d')!
    const degradado = pincel.createLinearGradient(0, 0, 0, 256)
    degradado.addColorStop(0, '#ffffff') // luz cenital
    degradado.addColorStop(0.35, '#cfeeff')
    degradado.addColorStop(0.62, '#5c9dc4')
    degradado.addColorStop(1, '#0a2438')
    pincel.fillStyle = degradado
    pincel.fillRect(0, 0, 128, 256)
    // Dos ventanas de luz, como en un estudio de fotografia: son las que
    // dibujan los brillos alargados del vidrio.
    for (const [cx, cy, r] of [
      [92, 70, 48],
      [24, 96, 34],
    ]) {
      const brillo = pincel.createRadialGradient(cx, cy, 2, cx, cy, r)
      brillo.addColorStop(0, 'rgba(255,255,255,1)')
      brillo.addColorStop(1, 'rgba(255,255,255,0)')
      pincel.fillStyle = brillo
      pincel.fillRect(0, 0, 128, 256)
    }

    const textura = new THREE.CanvasTexture(lienzo)
    textura.mapping = THREE.EquirectangularReflectionMapping
    textura.colorSpace = THREE.SRGBColorSpace
    scene.environment = textura
    return () => {
      scene.environment = null
      textura.dispose()
    }
  }, [scene, gl])
}

/**
 * Telon de fondo. El vidrio necesita algo que refractar: sin esto, la parte
 * vacia del cuerpo se ve gris sucio en vez de cristalina.
 */
function Telon() {
  const textura = useMemo(() => {
    const lienzo = document.createElement('canvas')
    lienzo.width = 256
    lienzo.height = 256
    const pincel = lienzo.getContext('2d')!
    // El borde termina exactamente en el color de las tarjetas de la app,
    // para que el telon se funda con la pantalla y no se vea un recuadro.
    pincel.fillStyle = '#0c2e45'
    pincel.fillRect(0, 0, 256, 256)
    const halo = pincel.createRadialGradient(128, 100, 6, 128, 100, 138)
    halo.addColorStop(0, '#2a6f96')
    halo.addColorStop(0.4, '#154a68')
    halo.addColorStop(1, '#0c2e45')
    pincel.fillStyle = halo
    pincel.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(lienzo)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

  return (
    <mesh position={[0, 1, -3.2]}>
      <planeGeometry args={[16, 12]} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  )
}

const NEGRO_OJO = '#0b1c2b'

/** Ojo grande y brillante. Aqui es donde nace la empatia. */
function Ojo({
  x,
  y,
  z,
  radio,
  cerrado,
  mirada,
  forma,
  chispas,
}: {
  x: number
  y: number
  z: number
  radio: number
  cerrado: number
  mirada: THREE.Vector2
  forma: Rasgos['ojos']
  chispas: boolean
}) {
  const grupo = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!grupo.current) return
    // El parpadeo aplasta el ojo; nunca llega a cero para que no desaparezca.
    grupo.current.scale.y = Math.max(0.04, 1 - cerrado)
    grupo.current.position.x = x + mirada.x * radio * 0.16
    grupo.current.position.y = y + mirada.y * radio * 0.12
  })

  // Ojo feliz o dormido: un arco, no una bolita. Cambia toda la cara.
  if (forma === 'arco' || forma === 'cerrados') {
    const haciaArriba = forma === 'arco'
    return (
      <group position={[x, y, z]}>
        <mesh rotation={[0, 0, haciaArriba ? 0 : Math.PI]}>
          <torusGeometry args={[radio * 0.92, radio * 0.2, 10, 28, Math.PI]} />
          <meshStandardMaterial color={NEGRO_OJO} roughness={0.3} />
        </mesh>
      </group>
    )
  }

  const grande = forma === 'enormes' ? 1.16 : 1
  return (
    <group ref={grupo} position={[x, y, z]} scale={[grande, grande, grande]}>
      <mesh castShadow>
        <sphereGeometry args={[radio, 32, 32]} />
        <meshPhysicalMaterial
          color={NEGRO_OJO}
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.02}
          metalness={0}
        />
      </mesh>
      {/* Los dos brillos: uno grande arriba y una chispa pequena abajo. */}
      <mesh position={[radio * 0.34, radio * 0.36, radio * 0.72]}>
        <sphereGeometry args={[radio * 0.3, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-radio * 0.3, -radio * 0.34, radio * 0.7]}>
        <sphereGeometry args={[radio * 0.14, 12, 12]} />
        <meshBasicMaterial color="#bfe8ff" transparent opacity={0.75} />
      </mesh>
      {chispas && (
        <mesh position={[radio * 0.1, radio * 0.05, radio * 0.78]}>
          <sphereGeometry args={[radio * 0.2, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  )
}

/** Las cejas. Son dos palitos, y hacen la mitad del trabajo de la cara. */
function Cejas({
  y,
  z,
  separacion,
  radio,
  forma,
}: {
  y: number
  z: number
  separacion: number
  radio: number
  forma: Rasgos['cejas']
}) {
  if (forma === 'ninguna') return null
  const alto = forma === 'levantadas' ? radio * 1.5 : radio * 1.15
  // Preocupadas: las puntas de adentro hacia arriba. Caidas: al reves.
  const giro = forma === 'preocupadas' ? 0.42 : forma === 'caidas' ? -0.38 : 0.05

  return (
    <group position={[0, y + alto, z]}>
      {[-1, 1].map((lado) => (
        <mesh
          key={lado}
          position={[lado * separacion, 0, 0]}
          rotation={[0, 0, lado * giro]}
        >
          <boxGeometry args={[radio * 1.25, radio * 0.16, radio * 0.16]} />
          <meshStandardMaterial color={NEGRO_OJO} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function Boca({ y, z, forma, radio }: { y: number; z: number; forma: Rasgos['boca']; radio: number }) {
  const ancho = radio * 1.15

  if (forma === 'recta') {
    return (
      <mesh position={[0, y, z]}>
        <boxGeometry args={[ancho * 0.9, radio * 0.16, radio * 0.16]} />
        <meshStandardMaterial color={NEGRO_OJO} roughness={0.3} />
      </mesh>
    )
  }

  if (forma === 'o') {
    return (
      <mesh position={[0, y, z]}>
        <sphereGeometry args={[radio * 0.42, 20, 20]} />
        <meshStandardMaterial color={NEGRO_OJO} roughness={0.35} />
      </mesh>
    )
  }

  if (forma === 'ondulada') {
    return (
      <group position={[0, y, z]}>
        {[-1, 1].map((lado) => (
          <mesh key={lado} position={[lado * ancho * 0.28, 0, 0]} rotation={[0, 0, lado * Math.PI]}>
            <torusGeometry args={[ancho * 0.28, radio * 0.085, 10, 24, Math.PI]} />
            <meshStandardMaterial color={NEGRO_OJO} roughness={0.3} />
          </mesh>
        ))}
      </group>
    )
  }

  if (forma === 'sonrisa-abierta') {
    return (
      <group position={[0, y, z]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <sphereGeometry args={[ancho * 0.55, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={NEGRO_OJO} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        {/* La lengüita: es lo que la vuelve simpatica y no una boca vacia. */}
        <mesh position={[0, -ancho * 0.28, ancho * 0.1]} scale={[1, 0.6, 0.5]}>
          <sphereGeometry args={[ancho * 0.3, 16, 16]} />
          <meshStandardMaterial color="#ff8fa8" roughness={0.5} />
        </mesh>
      </group>
    )
  }

  // sonrisa o triste: el mismo arco, volteado.
  const feliz = forma === 'sonrisa'
  return (
    <mesh position={[0, y, z]} rotation={[0, 0, feliz ? Math.PI * 1.11 : Math.PI * 0.11]}>
      <torusGeometry args={[ancho * 0.5, radio * 0.09, 12, 40, Math.PI * 0.78]} />
      <meshStandardMaterial color={NEGRO_OJO} roughness={0.3} />
    </mesh>
  )
}

/** Burbujitas que suben por dentro del agua. Es lo que la vuelve liquida. */
function Burbujas({ nivel, color }: { nivel: React.RefObject<number>; color: string }) {
  const grupo = useRef<THREE.Group>(null)
  const semillas = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: Math.sin(i * 2.7) * 0.42,
        z: Math.cos(i * 1.9) * 0.34,
        radio: 0.028 + (i % 3) * 0.016,
        velocidad: 0.16 + (i % 4) * 0.06,
        desfase: i * 0.37,
      })),
    [],
  )

  useFrame((estado) => {
    if (!grupo.current) return
    const t = estado.clock.elapsedTime
    const tope = nivel.current ?? 0
    grupo.current.children.forEach((burbuja, i) => {
      const s = semillas[i]
      // Sube desde el fondo hasta la superficie y vuelve a empezar.
      const avance = ((t * s.velocidad + s.desfase) % 1)
      burbuja.position.y = 0.06 + avance * Math.max(0.05, tope - 0.12)
      burbuja.position.x = s.x + Math.sin(t * 1.3 + s.desfase) * 0.03
      const visible = tope > 0.25
      burbuja.visible = visible
      const escala = visible ? 1 - Math.abs(avance - 0.5) * 0.5 : 0
      burbuja.scale.setScalar(escala)
    })
  })

  return (
    <group ref={grupo}>
      {semillas.map((s, i) => (
        <mesh key={i} position={[s.x, 0.1, s.z]}>
          <sphereGeometry args={[s.radio, 10, 10]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0}
            transmission={0.9}
            thickness={0.1}
            ior={1.2}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

function Extras({ especie, color }: { especie: EspecieMascota; color: string }) {
  const receta = recetaDe(especie)

  if (receta.branquias) {
    return (
      <group>
        {[-1, 1].map((lado) =>
          [0, 1, 2].map((i) => (
            <mesh
              key={`${lado}-${i}`}
              position={[lado * 0.95, 1.05 + i * 0.22, 0.1]}
              rotation={[0, 0, lado * (0.5 - i * 0.32)]}
            >
              <capsuleGeometry args={[0.075, 0.34, 6, 12]} />
              <meshPhysicalMaterial
                color={color}
                roughness={0.25}
                transmission={0.5}
                thickness={0.4}
                ior={1.33}
              />
            </mesh>
          )),
        )}
      </group>
    )
  }

  if (receta.tentaculos) {
    return (
      <group>
        {Array.from({ length: receta.tentaculos }).map((_, i) => {
          const angulo = (i / receta.tentaculos!) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(angulo) * 0.52, 0.12, Math.sin(angulo) * 0.52]}
              rotation={[0, -angulo, 0]}
            >
              <capsuleGeometry args={[0.16, 0.2, 8, 16]} />
              <meshPhysicalMaterial
                color={color}
                roughness={0.2}
                transmission={0.7}
                thickness={0.5}
                ior={1.33}
              />
            </mesh>
          )
        })}
      </group>
    )
  }

  if (receta.patas) {
    return (
      <group>
        {[
          [-0.72, 0.55],
          [0.72, 0.55],
          [-0.6, -0.5],
          [0.6, -0.5],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.14, z]}>
            <sphereGeometry args={[0.24, 20, 20]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.25}
              transmission={0.6}
              thickness={0.5}
              ior={1.33}
            />
          </mesh>
        ))}
      </group>
    )
  }

  if (receta.orejas) {
    return (
      <group>
        {[-1, 1].map((lado) => (
          <mesh key={lado} position={[lado * 0.86, 1.16, 0]}>
            <sphereGeometry args={[0.34, 24, 24]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.2}
              transmission={0.75}
              thickness={0.6}
              ior={1.33}
            />
          </mesh>
        ))}
      </group>
    )
  }

  return <group />
}

/** Lo que se compra en la tienda, en 3D. */
function Puestos({
  especie,
  sombrero,
  accesorio,
}: {
  especie: EspecieMascota
  sombrero?: string | null
  accesorio?: string | null
}) {
  const alturaSombrero = ALTO * 0.84
  const radioCabeza = Math.max(0.3, radioEnAltura(especie, alturaSombrero))
  const radioCintura = Math.max(0.4, radioEnAltura(especie, ALTO * 0.34))

  return (
    <group>
      {sombrero === 'gorra' && (
        <group position={[0, alturaSombrero, 0]}>
          <mesh scale={[radioCabeza * 1.15, radioCabeza * 0.8, radioCabeza * 1.15]}>
            <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e05252" roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.01, radioCabeza * 1.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radioCabeza * 0.9, 20, 0, Math.PI]} />
            <meshStandardMaterial color="#c33f3f" roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {sombrero === 'corona' && (
        <group position={[0, alturaSombrero + 0.08, 0]}>
          <mesh>
            <cylinderGeometry args={[radioCabeza * 0.95, radioCabeza * 0.95, 0.16, 24, 1, true]} />
            <meshStandardMaterial
              color="#f5c542"
              metalness={0.85}
              roughness={0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * radioCabeza * 0.95, 0.19, Math.sin(a) * radioCabeza * 0.95]}
              >
                <coneGeometry args={[0.08, 0.26, 8]} />
                <meshStandardMaterial color="#f5c542" metalness={0.85} roughness={0.22} />
              </mesh>
            )
          })}
        </group>
      )}

      {sombrero === 'sombrilla' && (
        <group position={[0, alturaSombrero + 0.34, 0]}>
          <mesh>
            <coneGeometry args={[radioCabeza * 2.1, 0.5, 24, 1, true]} />
            <meshStandardMaterial color="#4fd1c5" roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
            <meshStandardMaterial color="#2c7a7b" roughness={0.6} />
          </mesh>
        </group>
      )}

      {accesorio === 'lentes' && (
        <group position={[0, recetaDe(especie).ojos.y, recetaDe(especie).ojos.z + 0.16]}>
          {[-1, 1].map((lado) => (
            <mesh key={lado} position={[lado * recetaDe(especie).ojos.separacion, 0, 0]}>
              <torusGeometry args={[recetaDe(especie).ojos.radio * 1.3, 0.035, 10, 28]} />
              <meshStandardMaterial color="#12212e" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, recetaDe(especie).ojos.separacion * 1.1, 8]} />
            <meshStandardMaterial color="#12212e" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )}

      {accesorio === 'bufanda' && (
        <mesh position={[0, ALTO * 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radioCintura * 1.02, 0.14, 12, 32]} />
          <meshStandardMaterial color="#7c5cff" roughness={0.75} />
        </mesh>
      )}

      {accesorio === 'flotador' && (
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radioEnAltura(especie, 0.3) * 1.25, 0.19, 14, 34]} />
          <meshStandardMaterial color="#ff8b5e" roughness={0.5} />
        </mesh>
      )}
    </group>
  )
}

function Criatura({
  especie,
  color,
  nivel,
  hidratacion,
  expresion,
  sombrero,
  accesorio,
}: {
  especie: EspecieMascota
  color: string
  nivel: NivelCuerpo
  hidratacion: number
  expresion: Expresion
  sombrero?: string | null
  accesorio?: string | null
}) {
  const grupo = useRef<THREE.Group>(null)
  const receta = recetaDe(especie)
  const rasgos = rasgosDe(expresion)
  const { gl, pointer } = useThree()

  useCieloDeEstudio()

  // El plano que corta el agua: deja solo lo que esta por debajo.
  const planoAgua = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])
  const nivelObjetivo = useRef(0)
  const nivelSuave = useRef(0)

  const { camera } = useThree()
  useEffect(() => {
    gl.localClippingEnabled = true
    // R3F apunta la camara al origen, o sea a los pies de la criatura, y eso
    // la empuja hacia arriba hasta recortarle la cabeza. Se mira al centro
    // del cuerpo.
    camera.lookAt(0, ALTO * 0.48, 0)
    camera.updateProjectionMatrix()
  }, [gl, camera])

  const geoCuerpo = useMemo(() => geometriaCuerpo(especie), [especie])
  const geoAgua = useMemo(() => geometriaCuerpo(especie, ENCOGIDO_AGUA), [especie])

  const seco = nivel === 'bajo' || nivel === 'critico'
  const [parpadeo, setParpadeo] = useState(0)
  const proximoParpadeo = useRef(2)
  const discoAgua = useRef<THREE.Mesh>(null)
  const menisco = useRef<THREE.Mesh>(null)
  const alturaAgua = useRef(0)

  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime

    // El agua sube y baja despacio hasta el nivel real, nunca de un salto.
    nivelObjetivo.current = (Math.max(0, Math.min(100, hidratacion)) / 100) * ALTO * 0.97 + 0.02
    nivelSuave.current += (nivelObjetivo.current - nivelSuave.current) * Math.min(1, delta * 2.2)
    // Un vaiven minimo, como el agua de un vaso que acaban de poner.
    const vaiven = Math.sin(t * 1.6) * 0.012 + Math.sin(t * 2.7) * 0.006
    const altura = nivelSuave.current + vaiven
    alturaAgua.current = altura

    // Lo que de verdad la hace parecer liquida: la superficie se INCLINA,
    // no solo sube y baja. Como el agua de un vaso al que uno mueve.
    const inclinaX = Math.sin(t * 0.9) * 0.045
    const inclinaZ = Math.cos(t * 1.15) * 0.038
    planoAgua.normal.set(inclinaX, -1, inclinaZ).normalize()
    planoAgua.constant = altura

    const radio = radioEnAltura(especie, nivelSuave.current, ENCOGIDO_AGUA)
    const seVe = nivelSuave.current > 0.06 && nivelSuave.current < ALTO * 0.95

    if (discoAgua.current) {
      discoAgua.current.position.y = altura
      discoAgua.current.rotation.x = -Math.PI / 2 + inclinaZ
      discoAgua.current.rotation.z = inclinaX
      discoAgua.current.scale.setScalar(Math.max(0.02, radio))
      discoAgua.current.visible = seVe
    }

    // El menisco: ese borde que sube por la pared del vaso.
    if (menisco.current) {
      menisco.current.position.y = altura
      menisco.current.rotation.x = Math.PI / 2 + inclinaZ
      menisco.current.rotation.z = inclinaX
      menisco.current.scale.set(radio, radio, 1)
      menisco.current.visible = seVe
    }

    if (grupo.current) {
      // Respiracion: se infla y se desinfla como algo vivo. La energia sale
      // de la expresion, asi que emocionada rebota y agotada casi no respira.
      const ritmo = 0.9 + rasgos.energia * 0.7
      const fuerza = 0.008 + rasgos.energia * 0.018
      const respirar = 1 + Math.sin(t * ritmo) * fuerza
      grupo.current.scale.set(respirar, 2 - respirar, respirar)
      grupo.current.position.y = seco ? -0.04 : Math.sin(t * ritmo * 0.5) * 0.035
      // Se ladea despacio, y mira un poquito hacia donde esta el dedo.
      grupo.current.rotation.z = Math.sin(t * 0.7) * (seco ? 0.01 : 0.035)
      grupo.current.rotation.y += (pointer.x * 0.32 - grupo.current.rotation.y) * 0.05
      grupo.current.rotation.x += (-pointer.y * 0.12 - grupo.current.rotation.x) * 0.05
    }

    // Parpadeo natural: cada 2 a 6 segundos, y mas seguido si esta decaida.
    proximoParpadeo.current -= delta
    if (proximoParpadeo.current <= 0) {
      proximoParpadeo.current = seco ? 1.4 + Math.random() * 2 : 2.2 + Math.random() * 4
      setParpadeo(1)
      window.setTimeout(() => setParpadeo(0), 130)
    }
  })

  // Los parpados a medio bajar son de la expresion; el parpadeo se suma.
  const cerrado = Math.max(rasgos.parpado, parpadeo)
  const mirada = useMemo(() => new THREE.Vector2(), [])
  useFrame(() => {
    mirada.set(pointer.x, pointer.y)
  })

  return (
    <group ref={grupo}>
      {/* El agua de adentro. AQUI vive el color de la mascota: cuando el
          cuerpo esta vacio se ve casi transparente, y a medida que sube el
          agua se va llenando de color. Eso es lo que hace que el nivel se
          entienda de un vistazo, sin leer ningun numero. */}
      <mesh geometry={geoAgua} position={[0, 0.02, 0]}>
        <meshPhysicalMaterial
          color={color}
          roughness={0.05}
          transmission={0.22}
          thickness={3.2}
          ior={1.333}
          clearcoat={1}
          clearcoatRoughness={0.03}
          attenuationColor={new THREE.Color(color)}
          attenuationDistance={0.45}
          envMapIntensity={1.1}
          side={THREE.DoubleSide}
          clippingPlanes={[planoAgua]}
          clipShadows
        />
      </mesh>

      {/* La superficie del agua */}
      <mesh ref={discoAgua} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 48]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.02}
          metalness={0}
          clearcoat={1}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* El menisco: el aro donde el agua trepa por la pared. Sin esto la
          superficie se ve cortada con tijera. */}
      <mesh ref={menisco} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.035, 8, 48]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0}
          transmission={0.75}
          thickness={0.2}
          ior={1.333}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Burbujitas subiendo */}
      <Burbujas nivel={alturaAgua} color={color} />

      {/* El cuerpo: vidrio casi incoloro, para que se vea lo de adentro. */}
      <mesh geometry={geoCuerpo} castShadow>
        <meshPhysicalMaterial
          color="#f2fbff"
          roughness={0.04}
          transmission={1}
          thickness={0.3}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.02}
          metalness={0}
          transparent
          opacity={0.96}
          envMapIntensity={2.2}
          iridescence={0.45}
          iridescenceIOR={1.25}
          specularIntensity={1}
          side={THREE.FrontSide}
        />
      </mesh>

      <Extras especie={especie} color={color} />
      <Puestos especie={especie} sombrero={sombrero} accesorio={accesorio} />

      <Ojo
        x={-receta.ojos.separacion}
        y={receta.ojos.y}
        z={receta.ojos.z}
        radio={receta.ojos.radio}
        cerrado={cerrado}
        mirada={mirada}
        forma={rasgos.ojos}
        chispas={rasgos.chispas}
      />
      <Ojo
        x={receta.ojos.separacion}
        y={receta.ojos.y}
        z={receta.ojos.z}
        radio={receta.ojos.radio}
        // El guino cierra SOLO el ojo derecho.
        cerrado={rasgos.ojos === 'guino' ? 1 : cerrado}
        mirada={mirada}
        forma={rasgos.ojos === 'guino' ? 'arco' : rasgos.ojos}
        chispas={rasgos.chispas}
      />
      <Cejas
        y={receta.ojos.y + receta.ojos.radio * 0.5}
        z={receta.ojos.z}
        separacion={receta.ojos.separacion}
        radio={receta.ojos.radio}
        forma={rasgos.cejas}
      />
      <Boca
        y={receta.bocaY}
        z={receta.ojos.z + 0.03}
        forma={rasgos.boca}
        radio={receta.ojos.radio}
      />

      {rasgos.cachetes && (
        <group>
          {[-1, 1].map((lado) => (
            <mesh key={lado} position={[lado * 0.62, receta.ojos.y - 0.3, 0.52]}>
              <sphereGeometry args={[0.17, 16, 16]} />
              <meshBasicMaterial color="#ff8fb1" transparent opacity={0.45} />
            </mesh>
          ))}
        </group>
      )}

      {rasgos.sudor && (
        <mesh position={[0.68, receta.ojos.y + 0.22, 0.42]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshPhysicalMaterial
            color="#8ee0ff"
            roughness={0}
            transmission={0.9}
            thickness={0.3}
            ior={1.333}
          />
        </mesh>
      )}

      {/* Los ZZZ de cuando esta dormida */}
      {rasgos.zzz && (
        <group position={[0.75, receta.ojos.y + 0.5, 0.3]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[i * 0.16, i * 0.22, 0]} scale={0.9 - i * 0.2}>
              <boxGeometry args={[0.16, 0.05, 0.05]} />
              <meshBasicMaterial color="#bfe8ff" transparent opacity={0.8 - i * 0.2} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

export default function Mascota3D({
  especie,
  color,
  nivel,
  hidratacion,
  expresion,
  sombrero,
  accesorio,
  alto = 300,
}: {
  especie: EspecieMascota
  color: string
  nivel: NivelCuerpo
  hidratacion: number
  expresion: Expresion
  sombrero?: string | null
  accesorio?: string | null
  alto?: number
}) {
  return (
    // Esquinas redondeadas: sin esto el telon de fondo se ve como un
    // recuadro pegado encima de la tarjeta.
    <div
      style={{ height: alto, width: '100%', borderRadius: 26, overflow: 'hidden' }}
    >
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: [0, 1.02, 6.6], fov: 28 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'pan-y' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={2.1} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#7fd4ff" />
        <pointLight position={[0, 0.5, 3]} intensity={6} color="#bfe8ff" distance={9} />

        <Telon />
        <Criatura
          especie={especie}
          color={color}
          nivel={nivel}
          hidratacion={hidratacion}
          expresion={expresion}
          sombrero={sombrero}
          accesorio={accesorio}
        />

        <ContactShadows
          position={[0, -0.02, 0]}
          opacity={0.5}
          scale={6}
          blur={2.6}
          far={3}
          color="#000814"
        />
      </Canvas>
    </div>
  )
}
