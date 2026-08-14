import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { etiquetaDe, organosAhora, resumenDelCuerpo, type EstadoOrgano } from '../lib/organos'
import type { EstadoCuerpo } from '../lib/tipos'

// Lo que le está pasando a cada órgano AHORA, con el agua de hoy.
// Se recalcula solo, porque `estado` cambia con cada trago y con el reloj.

const COLOR: Record<EstadoOrgano, { barra: string; texto: string }> = {
  bien: { barra: 'from-[var(--color-logro)]/70 to-[var(--color-logro)]', texto: 'text-[var(--color-logro)]' },
  ajustando: {
    barra: 'from-[var(--color-agua-honda)] to-[var(--color-agua)]',
    texto: 'text-[var(--color-agua-clara)]',
  },
  exigido: {
    barra: 'from-[var(--color-alerta)]/70 to-[var(--color-alerta)]',
    texto: 'text-[var(--color-alerta)]',
  },
  sufriendo: {
    barra: 'from-[var(--color-peligro)]/70 to-[var(--color-peligro)]',
    texto: 'text-[var(--color-peligro)]',
  },
}

export default function PanelOrganos({ estado }: { estado: EstadoCuerpo }) {
  const organos = useMemo(() => organosAhora(estado), [estado])
  const resumen = useMemo(() => resumenDelCuerpo(estado), [estado])
  const [abierto, setAbierto] = useState<string | null>(null)
  // Plegado por defecto: el resumen se ve siempre, y el detalle se abre
  // cuando la persona quiera. Asi el chat no queda enterrado bajo la lista.
  const [desplegado, setDesplegado] = useState(false)

  return (
    <section className="mb-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
      <button
        type="button"
        onClick={() => setDesplegado((v) => !v)}
        className="w-full text-left"
      >
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold">Mis órganos ahora mismo</h2>
          <span className="shrink-0 text-xs text-[var(--color-texto-suave)]">
            {estado.totalHoyMl} ml de líquido
          </span>
        </div>
        <p className="text-xs text-[var(--color-texto-suave)]">{resumen}</p>
        <span className="mt-2 flex items-center gap-1 text-[11px] text-[var(--color-agua-clara)]">
          <ChevronDown size={13} className={desplegado ? 'rotate-180' : ''} />
          {desplegado ? 'Ocultar los 8 órganos' : 'Ver los 8 órganos uno por uno'}
        </span>
      </button>

      <ul className={`space-y-2.5 ${desplegado ? 'mt-4' : 'hidden'}`}>
        {organos.map((organo) => {
          const colores = COLOR[organo.estado]
          const desplegado = abierto === organo.id
          return (
            <li key={organo.id}>
              <button
                type="button"
                onClick={() => setAbierto(desplegado ? null : organo.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{organo.emoji}</span>
                  <span className="text-sm font-medium">{organo.nombre}</span>
                  <span className={`text-[11px] ${colores.texto}`}>
                    {etiquetaDe(organo.estado)}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`ml-auto shrink-0 text-[var(--color-texto-suave)] transition-transform ${
                      desplegado ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-fondo-2)]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colores.barra} transition-all duration-700`}
                    style={{ width: `${Math.max(4, 100 - organo.afectacion)}%` }}
                  />
                </div>
              </button>

              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                {organo.queLePasa}
              </p>

              {desplegado && (
                <div className="anim-entrar mt-2 rounded-2xl bg-[var(--color-fondo-2)] px-3.5 py-2.5">
                  <p className="text-[11px] leading-relaxed text-[var(--color-texto-suave)]">
                    <span className="text-[var(--color-agua-clara)]">Por qué:</span>{' '}
                    {organo.porQue}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-texto-suave)]/70">
                    {organo.aguaQueTiene}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p
        className={`mt-4 text-[11px] leading-relaxed text-[var(--color-texto-suave)]/70 ${desplegado ? '' : 'hidden'}`}
      >
        Esto se calcula con el agua que llevas hoy y el tiempo que llevas sin beber. Es una
        estimación con base en fisiología, no una medición de tu cuerpo: para eso está un
        profesional de la salud.
      </p>
    </section>
  )
}
