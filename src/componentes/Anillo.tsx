export default function Anillo({
  porcentaje,
  tamano = 96,
  grosor = 9,
  children,
}: {
  porcentaje: number
  tamano?: number
  grosor?: number
  children?: React.ReactNode
}) {
  const radio = (tamano - grosor) / 2
  const vuelta = 2 * Math.PI * radio
  const avance = Math.min(100, Math.max(0, porcentaje))
  const pasado = porcentaje > 100

  return (
    <div className="relative" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90">
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke="var(--color-borde)"
          strokeWidth={grosor}
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          stroke={pasado ? 'var(--color-alerta)' : 'var(--color-agua)'}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={vuelta - (vuelta * avance) / 100}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
