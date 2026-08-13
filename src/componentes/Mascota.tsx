import { useId } from 'react'
import type { EspecieMascota, NivelCuerpo } from '../lib/tipos'

// La mascota es translucida a proposito: por dentro se le ve el nivel de
// agua. Ese nivel es el mismo numero que calcula hidratacion.ts, asi que lo
// que ves en el dibujo es literalmente como esta el cuerpo.

const CUERPOS: Record<EspecieMascota, string> = {
  // Gota clasica.
  gota: 'M100 14 C 138 62 170 96 170 126 A 70 70 0 0 1 30 126 C 30 96 62 62 100 14 Z',
  // Axolote: cabeza ancha y redonda.
  axolote:
    'M100 26 C 148 26 176 60 176 106 C 176 152 144 180 100 180 C 56 180 24 152 24 106 C 24 60 52 26 100 26 Z',
  // Pulpo: domo arriba, faldon de tentaculos abajo.
  pulpo:
    'M100 20 C 146 20 172 56 172 100 L 172 140 C 160 140 158 168 146 168 C 134 168 132 142 120 142 C 108 142 106 170 100 170 C 94 170 92 142 80 142 C 68 142 66 168 54 168 C 42 168 40 140 28 140 L 28 100 C 28 56 54 20 100 20 Z',
  // Tortuga: caparazon ancho y bajito.
  tortuga:
    'M100 34 C 152 34 182 74 182 116 C 182 152 148 176 100 176 C 52 176 18 152 18 116 C 18 74 48 34 100 34 Z',
  // Nube.
  nube: 'M62 74 C 62 44 92 26 118 40 C 140 26 168 42 168 68 C 184 74 184 104 168 112 L 168 132 A 62 62 0 0 1 44 132 L 44 110 C 26 102 28 76 46 72 Z',
}

const COLAS: Partial<Record<EspecieMascota, string>> = {
  axolote: 'M176 118 C 198 106 200 148 174 142 Z',
  tortuga: 'M182 122 C 200 118 200 140 180 138 Z',
}

/** Branquias del axolote y patas de la tortuga: detalles que dan personalidad. */
function Adornos({ especie, color }: { especie: EspecieMascota; color: string }) {
  if (especie === 'axolote') {
    return (
      <g stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.85">
        <path d="M28 74 L 4 58" />
        <path d="M24 96 L -2 92" />
        <path d="M28 118 L 4 128" />
        <path d="M172 74 L 196 58" />
        <path d="M176 96 L 202 92" />
        <path d="M172 118 L 196 128" />
      </g>
    )
  }
  if (especie === 'tortuga') {
    return (
      <g fill={color} opacity="0.9">
        <ellipse cx="44" cy="172" rx="18" ry="11" />
        <ellipse cx="156" cy="172" rx="18" ry="11" />
      </g>
    )
  }
  return null
}

function Ojos({ nivel }: { nivel: NivelCuerpo }) {
  const izq = 74
  const der = 126
  const y = 96

  if (nivel === 'critico') {
    // Ojos apretados: no es gracioso, es el cuerpo pidiendo agua.
    return (
      <g stroke="#0a2233" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d={`M${izq - 11} ${y - 4} L ${izq + 11} ${y + 6}`} />
        <path d={`M${izq - 11} ${y + 6} L ${izq + 11} ${y - 4}`} />
        <path d={`M${der - 11} ${y - 4} L ${der + 11} ${y + 6}`} />
        <path d={`M${der - 11} ${y + 6} L ${der + 11} ${y - 4}`} />
      </g>
    )
  }

  if (nivel === 'bajo') {
    return (
      <g>
        <ellipse cx={izq} cy={y + 2} rx="11" ry="8" fill="#0a2233" />
        <ellipse cx={der} cy={y + 2} rx="11" ry="8" fill="#0a2233" />
        <g stroke="#0a2233" strokeWidth="6" strokeLinecap="round">
          <path d={`M${izq - 13} ${y - 9} L ${izq + 11} ${y - 6}`} />
          <path d={`M${der + 13} ${y - 9} L ${der - 11} ${y - 6}`} />
        </g>
      </g>
    )
  }

  const alto = nivel === 'atento' ? 10 : 14
  const brillo = nivel === 'pleno' ? 5 : 4
  return (
    <g>
      <ellipse cx={izq} cy={y} rx="11" ry={alto} fill="#0a2233" />
      <ellipse cx={der} cy={y} rx="11" ry={alto} fill="#0a2233" />
      <circle cx={izq + 4} cy={y - 5} r={brillo} fill="#ffffff" />
      <circle cx={der + 4} cy={y - 5} r={brillo} fill="#ffffff" />
    </g>
  )
}

function Boca({ nivel }: { nivel: NivelCuerpo }) {
  const y = 126
  if (nivel === 'pleno') {
    return (
      <g>
        <path d={`M84 ${y} Q 100 ${y + 18} 116 ${y}`} fill="#0a2233" />
        <path d={`M90 ${y + 9} Q 100 ${y + 16} 110 ${y + 9}`} fill="#ff9db4" />
      </g>
    )
  }
  if (nivel === 'bien') {
    return (
      <path
        d={`M84 ${y} Q 100 ${y + 12} 116 ${y}`}
        stroke="#0a2233"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    )
  }
  if (nivel === 'atento') {
    return (
      <path
        d={`M86 ${y + 4} L 114 ${y + 4}`}
        stroke="#0a2233"
        strokeWidth="6"
        strokeLinecap="round"
      />
    )
  }
  return (
    <path
      d={`M84 ${y + 8} Q 100 ${y - 6} 116 ${y + 8}`}
      stroke="#0a2233"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
  )
}

export default function Mascota({
  especie,
  color,
  nivel,
  hidratacion,
  sombrero,
  accesorio,
  tamano = 240,
}: {
  especie: EspecieMascota
  color: string
  nivel: NivelCuerpo
  /** 0 a 100: es la altura del agua que se le ve por dentro. */
  hidratacion: number
  sombrero?: string | null
  accesorio?: string | null
  tamano?: number
}) {
  const id = useId().replace(/:/g, '')
  const cuerpo = CUERPOS[especie]
  const cola = COLAS[especie]

  // El agua sube desde abajo. 190 es el borde inferior util del dibujo.
  const alturaAgua = Math.max(0, Math.min(100, hidratacion))
  const superficie = 190 - (alturaAgua / 100) * 176

  const seco = nivel === 'critico' || nivel === 'bajo'

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="-10 -10 220 220"
      className={seco ? '' : 'anim-flotar'}
      role="img"
      aria-label={`Tu mascota, con el cuerpo al ${Math.round(alturaAgua)} por ciento de agua`}
    >
      <defs>
        <clipPath id={`dentro-${id}`}>
          <path d={cuerpo} />
        </clipPath>
        <linearGradient id={`agua-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-agua-clara)" />
          <stop offset="100%" stopColor="var(--color-agua-honda)" />
        </linearGradient>
        <radialGradient id={`brillo-${id}`} cx="35%" cy="28%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sombra en el piso */}
      <ellipse cx="100" cy="196" rx={seco ? 52 : 62} ry="9" fill="#000" opacity="0.28" />

      <Adornos especie={especie} color={color} />
      {cola && <path d={cola} fill={color} opacity="0.9" />}

      {/* El vidrio del cuerpo */}
      <path d={cuerpo} fill={color} opacity="0.22" />

      {/* El agua que tiene por dentro */}
      <g clipPath={`url(#dentro-${id})`}>
        <rect x="-20" y={superficie} width="240" height="240" fill={`url(#agua-${id})`} />
        {alturaAgua > 3 && (
          <g>
            <path
              d={`M-40 ${superficie} q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 L 280 ${superficie + 40} L -40 ${superficie + 40} Z`}
              fill="var(--color-agua-clara)"
              opacity="0.55"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="80 0"
                dur="3.2s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}
      </g>

      {/* Borde y reflejo */}
      <path d={cuerpo} fill={`url(#brillo-${id})`} />
      <path d={cuerpo} fill="none" stroke={color} strokeWidth="5" opacity="0.95" />

      <Ojos nivel={nivel} />
      <Boca nivel={nivel} />

      {/* Sudor cuando esta bajo de agua */}
      {seco && (
        <path
          d="M148 76 c 0 0 -9 12 -9 18 a 9 9 0 0 0 18 0 c 0 -6 -9 -18 -9 -18 z"
          fill="var(--color-agua-clara)"
          opacity="0.85"
          className="anim-brillo"
        />
      )}

      {/* Cachetes cuando esta a tope */}
      {nivel === 'pleno' && (
        <g fill="#ff8fb1" opacity="0.5">
          <ellipse cx="58" cy="118" rx="11" ry="7" />
          <ellipse cx="142" cy="118" rx="11" ry="7" />
        </g>
      )}

      {sombrero === 'gorra' && (
        <g>
          <path d="M52 56 a 48 40 0 0 1 96 0 z" fill="#e05252" />
          <path d="M148 56 q 26 2 28 12 l -28 0 z" fill="#c33f3f" />
        </g>
      )}
      {sombrero === 'corona' && (
        <path
          d="M56 54 L 68 24 L 86 46 L 100 16 L 114 46 L 132 24 L 144 54 Z"
          fill="#f5c542"
          stroke="#d9a520"
          strokeWidth="3"
        />
      )}
      {sombrero === 'sombrilla' && (
        <g>
          <path d="M44 46 a 56 34 0 0 1 112 0 z" fill="#4fd1c5" />
          <path d="M100 46 L 100 12" stroke="#2c7a7b" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {accesorio === 'bufanda' && (
        <g fill="#7c5cff">
          <path d="M62 146 q 38 16 76 0 l 0 14 q -38 16 -76 0 z" />
          <path d="M128 158 l 16 30 l -14 4 l -12 -28 z" />
        </g>
      )}
      {accesorio === 'lentes' && (
        <g stroke="#0a2233" strokeWidth="5" fill="#0a2233" opacity="0.85">
          <rect x="58" y="84" width="32" height="22" rx="8" />
          <rect x="110" y="84" width="32" height="22" rx="8" />
          <path d="M90 94 L 110 94" fill="none" />
        </g>
      )}
      {accesorio === 'flotador' && (
        <g>
          <ellipse cx="100" cy="164" rx="66" ry="20" fill="#ff8b5e" opacity="0.9" />
          <ellipse cx="100" cy="164" rx="34" ry="9" fill="var(--color-fondo)" />
        </g>
      )}
    </svg>
  )
}
