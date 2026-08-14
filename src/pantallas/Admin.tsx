// El panel de la Fundacion.
//
// Contesta una sola pregunta: ¿esto lo usa alguien de verdad, o la gente crea
// la cuenta y no vuelve? Por eso lo primero que se ve no es cuanta gente hay,
// sino cuanta se quedo en registrarse.
//
// No muestra peso, IMC, fotos ni lo que nadie le escribio a su mascota: para
// saber si alguien usa la app no hace falta nada de eso.
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { obtenerAuth } from '../lib/firebase'

interface Fila {
  uid: string
  correo: string | null
  nombre: string | null
  mascota: string | null
  tomadoHoyMl: number
  metaMl: number
  llamadas: number
  preguntas: number
  burbujas: number
  costoUsd: number
  diasSinTomar: number | null
  diasSinHablar: number | null
  soloSeRegistro: boolean
  avisosActivos: boolean
  tieneTelefono: boolean
}

interface Resumen {
  personas: number
  soloSeRegistraron: number
  tomaronAguaHoy: number
  hablaronConLaMascota: number
  llamadasAlModelo: number
  costoTotalUsd: number
  avisosEncendidos: number
}

type Respuesta = { resumen: Resumen; gente: Fila[] } | { error: string }

/** Le pregunta al servidor. No sabe nada de React a proposito. */
async function traerDelServidor(): Promise<Respuesta> {
  try {
    const token = await obtenerAuth().currentUser?.getIdToken()
    const respuesta = await fetch('/api/admin', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!respuesta.ok) {
      return {
        error:
          respuesta.status === 404
            ? 'Este panel es solo para el correo de la Fundación.'
            : 'No se pudo traer la información.',
      }
    }
    const datos = await respuesta.json()
    return { resumen: datos.resumen, gente: datos.gente ?? [] }
  } catch {
    return { error: 'No se pudo conectar.' }
  }
}

function cuandoFue(dias: number | null): string {
  if (dias === null) return 'nunca'
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

export default function Admin() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [gente, setGente] = useState<Fila[]>([])

  // Traer los datos y guardarlos en el estado son dos cosas distintas, y aqui
  // estan separadas a proposito: `traerDelServidor` (arriba, fuera del
  // componente) no toca React, y el estado solo se mueve cuando la respuesta
  // ya llego. Asi ningun efecto cambia el estado de una vez, que es lo que
  // dispara renders en cascada.
  const aplicar = useCallback((r: Respuesta) => {
    if ('error' in r) setError(r.error)
    else {
      setResumen(r.resumen)
      setGente(r.gente)
      setError(null)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    let vivo = true
    traerDelServidor().then((r) => {
      if (vivo) aplicar(r)
    })
    return () => {
      vivo = false
    }
  }, [aplicar])

  const actualizar = useCallback(() => {
    setCargando(true)
    traerDelServidor().then(aplicar)
  }, [aplicar])

  return (
    <div className="mx-auto max-w-lg px-5 pt-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-titulo)] text-xl font-bold">Panel</h1>
        <button
          type="button"
          onClick={actualizar}
          disabled={cargando}
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-borde)] px-3 py-1.5 text-xs text-[var(--color-texto-suave)] disabled:opacity-50"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Actualizar
        </button>
      </div>

      {error && (
        <p className="rounded-2xl bg-[var(--color-peligro)]/12 px-4 py-3 text-sm text-[var(--color-peligro)]">
          {error}
        </p>
      )}

      {resumen && (
        <>
          {/* Lo primero: ¿la usan o no? */}
          <section className="mb-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
            <p className="text-xs text-[var(--color-texto-suave)]">De {resumen.personas} personas</p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-agua-clara)]">
              {resumen.tomaronAguaHoy}
            </p>
            <p className="text-sm">registraron agua hoy</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-borde)] pt-4 text-xs">
              <div>
                <div className="text-lg font-bold">{resumen.soloSeRegistraron}</div>
                <div className="text-[var(--color-texto-suave)]">
                  solo crearon la cuenta y no volvieron
                </div>
              </div>
              <div>
                <div className="text-lg font-bold">{resumen.hablaronConLaMascota}</div>
                <div className="text-[var(--color-texto-suave)]">le hablaron a la mascota</div>
              </div>
              <div>
                <div className="text-lg font-bold">{resumen.avisosEncendidos}</div>
                <div className="text-[var(--color-texto-suave)]">tienen los avisos prendidos</div>
              </div>
              <div>
                <div className="text-lg font-bold">{resumen.llamadasAlModelo}</div>
                <div className="text-[var(--color-texto-suave)]">
                  llamadas al modelo · US${resumen.costoTotalUsd.toFixed(4)}
                </div>
              </div>
            </div>
          </section>

          <h2 className="mb-2 text-sm font-bold">Una por una</h2>
          <div className="space-y-2">
            {gente.map((f) => (
              <article
                key={f.uid}
                className={`rounded-2xl border p-4 ${
                  f.soloSeRegistro
                    ? 'border-[var(--color-alerta)]/40 bg-[var(--color-alerta)]/8'
                    : 'border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {f.nombre || f.correo || f.uid.slice(0, 10)}
                  </span>
                  {f.mascota && (
                    <span className="shrink-0 text-[11px] text-[var(--color-texto-suave)]">
                      {f.mascota}
                    </span>
                  )}
                </div>
                {f.correo && f.nombre && (
                  <p className="truncate text-[11px] text-[var(--color-texto-suave)]">{f.correo}</p>
                )}

                {f.soloSeRegistro ? (
                  <p className="mt-2 text-xs text-[var(--color-alerta)]">
                    Creó la cuenta y ya. Nunca registró agua ni le habló a la mascota.
                  </p>
                ) : (
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <dt className="text-[var(--color-texto-suave)]">Tomó agua</dt>
                      <dd className="font-semibold">{cuandoFue(f.diasSinTomar)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-texto-suave)]">Habló</dt>
                      <dd className="font-semibold">{cuandoFue(f.diasSinHablar)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-texto-suave)]">Modelo</dt>
                      <dd className="font-semibold">
                        {f.preguntas} + {f.burbujas}
                      </dd>
                    </div>
                  </dl>
                )}

                {f.llamadas > 0 && (
                  <p className="mt-2 border-t border-[var(--color-borde)] pt-2 text-[10px] text-[var(--color-texto-suave)]">
                    {f.preguntas} preguntas y {f.burbujas} burbujas · US$
                    {f.costoUsd.toFixed(4)} en total
                  </p>
                )}
              </article>
            ))}
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-texto-suave)]">
            Aquí no aparece el peso, la estatura, el IMC, las fotos de los vasos ni lo que cada
            persona le escribió a su mascota. Eso no sale del teléfono de cada quien.
          </p>
        </>
      )}
    </div>
  )
}
