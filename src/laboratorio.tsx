import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import './index.css'
import Mascota3D from './componentes/Mascota3D'
import type { EspecieMascota, NivelCuerpo } from './lib/tipos'

// Banco de pruebas de las mascotas. Solo vive en desarrollo.

const ESPECIES: EspecieMascota[] = ['gota', 'axolote', 'pulpo', 'tortuga', 'nube']
const NIVELES: NivelCuerpo[] = ['pleno', 'bien', 'atento', 'bajo', 'critico']
const COLORES = ['#35b6f0', '#5ee0a8', '#ff8fb1', '#c79bff', '#ffd166', '#ff8b5e']

export default function Laboratorio() {
  const [especie, setEspecie] = useState<EspecieMascota>('gota')
  const [nivel, setNivel] = useState<NivelCuerpo>('bien')
  const [color, setColor] = useState(COLORES[0])
  const [agua, setAgua] = useState(70)

  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-xl font-bold">Laboratorio de mascotas</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {ESPECIES.map((e) => (
            <button
              key={e}
              onClick={() => setEspecie(e)}
              className={`rounded-xl border px-3 py-2 text-sm ${especie === e ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/15' : 'border-[var(--color-borde)]'}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {NIVELES.map((n) => (
            <button
              key={n}
              onClick={() => setNivel(n)}
              className={`rounded-xl border px-3 py-2 text-sm ${nivel === n ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/15' : 'border-[var(--color-borde)]'}`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          {COLORES.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="ml-4 flex items-center gap-3 text-sm">
            agua {agua}%
            <input
              type="range"
              min={0}
              max={100}
              value={agua}
              onChange={(e) => setAgua(Number(e.target.value))}
              className="w-64"
            />
          </label>
        </div>

        {/* Prueba minima: si este cubo no aparece, el problema es R3F, no la criatura. */}
        <div style={{ height: 200, width: '100%', border: '1px solid #14496b' }}>
          <Canvas camera={{ position: [0, 0, 4] }}>
            <ambientLight intensity={1.5} />
            <mesh rotation={[0.5, 0.5, 0]}>
              <boxGeometry args={[1.6, 1.6, 1.6]} />
              <meshNormalMaterial />
            </mesh>
          </Canvas>
        </div>

        <div className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)]">
          <Mascota3D
            especie={especie}
            color={color}
            nivel={nivel}
            hidratacion={agua}
            alto={460}
          />
        </div>

        <div className="mt-6 grid grid-cols-5 gap-3">
          {ESPECIES.map((e) => (
            <div
              key={e}
              className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)]"
            >
              <Mascota3D
                especie={e}
                color={color}
                nivel={nivel}
                hidratacion={agua}
                alto={190}
              />
              <p className="pb-2 text-center text-xs text-[var(--color-texto-suave)]">{e}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Laboratorio />)
