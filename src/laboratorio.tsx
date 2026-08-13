import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Mascota3D from './componentes/Mascota3D'
import type { Expresion } from './lib/expresiones'
import type { EspecieMascota, NivelCuerpo } from './lib/tipos'

// Banco de pruebas de las mascotas. Solo vive en desarrollo: Vite compila
// unicamente index.html, asi que esta pagina nunca sale publicada.

const ESPECIES: EspecieMascota[] = ['gota', 'axolote', 'pulpo', 'tortuga', 'nube']
const NIVELES: NivelCuerpo[] = ['pleno', 'bien', 'atento', 'bajo', 'critico']
const EXPRESIONES: Expresion[] = [
  'emocionada',
  'feliz',
  'contenta',
  'neutral',
  'sed',
  'triste',
  'agotada',
  'dormida',
  'sorprendida',
  'guino',
  'hambrienta',
  'mareada',
]
const COLORES = ['#35b6f0', '#5ee0a8', '#ff8fb1', '#c79bff', '#ffd166', '#ff8b5e']

function Boton({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm ${activo ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/15' : 'border-[var(--color-borde)]'}`}
    >
      {children}
    </button>
  )
}

export default function Laboratorio() {
  const [especie, setEspecie] = useState<EspecieMascota>('gota')
  const [nivel, setNivel] = useState<NivelCuerpo>('bien')
  const [expresion, setExpresion] = useState<Expresion>('contenta')
  const [color, setColor] = useState(COLORES[0])
  const [agua, setAgua] = useState(70)

  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-xl font-bold">Laboratorio de mascotas</h1>

        <div className="mb-3 flex flex-wrap gap-2">
          {ESPECIES.map((e) => (
            <Boton key={e} activo={especie === e} onClick={() => setEspecie(e)}>
              {e}
            </Boton>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {NIVELES.map((n) => (
            <Boton key={n} activo={nivel === n} onClick={() => setNivel(n)}>
              {n}
            </Boton>
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

        <div className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)]">
          <Mascota3D
            especie={especie}
            color={color}
            nivel={nivel}
            expresion={expresion}
            hidratacion={agua}
            alto={440}
          />
        </div>

        {/* Los botones NO llevan 3D a proposito: el navegador solo aguanta
            unos 16 lienzos con WebGL a la vez y se apagan todos. */}
        <h2 className="mt-6 mb-2 text-sm font-bold">Todas las caras</h2>
        <div className="flex flex-wrap gap-2">
          {EXPRESIONES.map((e) => (
            <Boton key={e} activo={expresion === e} onClick={() => setExpresion(e)}>
              {e}
            </Boton>
          ))}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Laboratorio />)
