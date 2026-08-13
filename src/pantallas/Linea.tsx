import { useEffect, useMemo, useState } from 'react'
import { Camera, Trash2, X } from 'lucide-react'
import { borrarRegistro, leerHistorico } from '../lib/almacen'
import { borrarFoto, leerFoto } from '../lib/fotos'
import { metaEsperadaAhora } from '../lib/hidratacion'
import { recipientePorId } from '../lib/recipientes'
import type { EstadoCuerpo, Perfil, Registro, ResumenDia } from '../lib/tipos'

function horaCorta(hora: number): string {
  return new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function diaCorto(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function Linea({
  uid,
  perfil,
  registros,
  estado,
}: {
  uid: string
  perfil: Perfil
  registros: Registro[]
  estado: EstadoCuerpo
}) {
  const [historico, setHistorico] = useState<ResumenDia[]>([])
  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null)
  const [cargandoFoto, setCargandoFoto] = useState(false)
  const [recargar, setRecargar] = useState(0)

  useEffect(() => {
    let vivo = true
    leerHistorico(uid, 30)
      .then((dias) => {
        if (vivo) setHistorico(dias)
      })
      .catch(() => {
        if (vivo) setHistorico([])
      })
    return () => {
      vivo = false
    }
  }, [uid, recargar, registros.length])

  /** Los tragos repartidos por hora, para la barra del dia. */
  const porHora = useMemo(() => {
    const horas = new Array(24).fill(0) as number[]
    registros.forEach((registro) => {
      horas[new Date(registro.hora).getHours()] += registro.ml
    })
    return horas
  }, [registros])

  const maximoHora = Math.max(250, ...porHora)
  const esperado = metaEsperadaAhora(perfil)
  const atraso = esperado - estado.totalHoyMl

  const rachaDias = useMemo(() => {
    let racha = 0
    for (const dia of historico) {
      if (dia.metaMl > 0 && dia.totalMl >= dia.metaMl) racha += 1
      else break
    }
    return racha
  }, [historico])

  async function verFoto(registro: Registro) {
    if (!registro.tieneFotoLocal) return
    setCargandoFoto(true)
    const foto = await leerFoto(registro.id)
    setCargandoFoto(false)
    setFotoAbierta(foto ?? 'no-esta')
  }

  async function eliminar(registro: Registro) {
    await borrarRegistro(uid, registro)
    if (registro.tieneFotoLocal) await borrarFoto(registro.id)
    setRecargar((n) => n + 1)
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-5">
      <h1 className="mb-4 font-[family-name:var(--font-titulo)] text-xl font-bold">Mi agua</h1>

      <section className="mb-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">Hoy, hora por hora</h2>
          <span className="text-xs text-[var(--color-texto-suave)]">
            {estado.totalHoyMl} / {estado.metaMl} ml
          </span>
        </div>

        <div className="flex h-28 items-end gap-[3px]">
          {porHora.map((ml, hora) => {
            const dormido =
              hora < Number.parseInt(perfil.horaDespertar.slice(0, 2), 10) ||
              hora > Number.parseInt(perfil.horaDormir.slice(0, 2), 10)
            return (
              <div key={hora} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-all ${
                    ml > 0
                      ? 'bg-gradient-to-t from-[var(--color-agua-honda)] to-[var(--color-agua-clara)]'
                      : dormido
                        ? 'bg-[var(--color-borde)]/30'
                        : 'bg-[var(--color-borde)]/70'
                  }`}
                  style={{ height: ml > 0 ? `${Math.max(8, (ml / maximoHora) * 88)}px` : '4px' }}
                  title={`${hora}:00 — ${ml} ml`}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-texto-suave)]">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>

        <p className="mt-3 rounded-2xl bg-[var(--color-fondo-2)] px-4 py-3 text-sm">
          {atraso > 100
            ? `A esta hora deberías llevar unos ${esperado} ml. Vas ${atraso} ml atrás.`
            : atraso < -100
              ? `Vas ${Math.abs(atraso)} ml adelantado para la hora que es. Bien.`
              : 'Vas justo al ritmo que toca para esta hora.'}
        </p>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-bold">Cada trago de hoy</h2>
        {registros.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--color-borde)] p-6 text-center text-sm text-[var(--color-texto-suave)]">
            Nada registrado todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {registros.map((registro) => (
              <li
                key={registro.id}
                className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{recipientePorId(registro.recipiente).emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {registro.ml} ml · {recipientePorId(registro.recipiente).nombre}
                    </p>
                    <p className="text-xs text-[var(--color-texto-suave)]">
                      {horaCorta(registro.hora)}
                      {registro.verificacion === 'confirmado' && ' · confirmado con foto'}
                      {registro.verificacion === 'dudoso' && ' · foto sin confirmar'}
                      {registro.verificacion === 'con-foto' && ' · con foto'}
                    </p>
                  </div>
                  {registro.tieneFotoLocal && (
                    <button
                      type="button"
                      onClick={() => verFoto(registro)}
                      className="rounded-full bg-[var(--color-fondo-2)] p-2"
                      aria-label="Ver la foto"
                    >
                      <Camera size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminar(registro)}
                    className="rounded-full bg-[var(--color-fondo-2)] p-2 text-[var(--color-texto-suave)]"
                    aria-label="Borrar este registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {registro.notaFoto && (
                  <p className="mt-2 text-xs text-[var(--color-texto-suave)]">{registro.notaFoto}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">Los últimos días</h2>
          {rachaDias > 0 && (
            <span className="text-xs text-[var(--color-logro)]">
              🔥 {rachaDias} {rachaDias === 1 ? 'día' : 'días'} seguidos cumpliendo
            </span>
          )}
        </div>
        {historico.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--color-borde)] p-6 text-center text-sm text-[var(--color-texto-suave)]">
            Aquí va a quedar tu historia. Vuelve mañana.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {historico.map((dia) => {
              const meta = dia.metaMl || perfil.metaMl
              const porcentaje = meta > 0 ? Math.min(100, (dia.totalMl / meta) * 100) : 0
              const cumplio = meta > 0 && dia.totalMl >= meta
              return (
                <li key={dia.dia} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-[var(--color-texto-suave)]">
                    {diaCorto(dia.dia)}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-lg bg-[var(--color-fondo-2)]">
                    <div
                      className={`h-full rounded-lg ${
                        cumplio
                          ? 'bg-gradient-to-r from-[var(--color-logro)]/70 to-[var(--color-logro)]'
                          : 'bg-gradient-to-r from-[var(--color-agua-honda)] to-[var(--color-agua)]'
                      }`}
                      style={{ width: `${Math.max(3, porcentaje)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs">
                    {(dia.totalMl / 1000).toFixed(1)} L
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {(fotoAbierta || cargandoFoto) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setFotoAbierta(null)}
        >
          <button
            type="button"
            onClick={() => setFotoAbierta(null)}
            className="absolute top-6 right-6 rounded-full bg-white/10 p-3"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
          {cargandoFoto ? (
            <p className="text-sm text-[var(--color-texto-suave)]">Abriendo la foto...</p>
          ) : fotoAbierta === 'no-esta' ? (
            <p className="max-w-xs text-center text-sm text-[var(--color-texto-suave)]">
              Esta foto ya no está en este teléfono. Las fotos no se suben a ningún servidor,
              así que solo viven en el aparato donde se tomaron.
            </p>
          ) : (
            <img
              src={fotoAbierta ?? ''}
              alt="El recipiente registrado"
              className="max-h-[80vh] max-w-full rounded-2xl"
            />
          )}
        </div>
      )}
    </div>
  )
}
