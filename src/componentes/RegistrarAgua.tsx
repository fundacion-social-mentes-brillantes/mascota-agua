import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, Minus, Plus, X } from 'lucide-react'
import { agregarRegistro, sumarGotas } from '../lib/almacen'
import { comprimirImagen, guardarFoto } from '../lib/fotos'
import { RECIPIENTES, recipientePorId } from '../lib/recipientes'
import { TOPES } from '../lib/hidratacion'
import { revisarFoto } from '../lib/vision'
import type { EstadoCuerpo, EstadoVerificacion, Mascota, Perfil, Recipiente } from '../lib/tipos'

const GOTAS_POR_TRAGO = 5
const GOTAS_POR_FOTO = 10
const GOTAS_POR_CONFIRMADA = 5

export default function RegistrarAgua({
  uid,
  perfil,
  mascota,
  estado,
  alCerrar,
}: {
  uid: string
  perfil: Perfil
  mascota: Mascota
  estado: EstadoCuerpo
  alCerrar: () => void
}) {
  const [recipiente, setRecipiente] = useState<Recipiente>('vaso')
  const [ml, setMl] = useState(250)
  const [foto, setFoto] = useState<string | null>(null)
  const [revisando, setRevisando] = useState(false)
  const [revision, setRevision] = useState<{ estado: EstadoVerificacion; nota: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const entradaFoto = useRef<HTMLInputElement>(null)

  // Mientras la ventana esta abierta, la pantalla de atras no se mueve.
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  const seVaAPasar = estado.mlUltimaHora + ml > TOPES.maximoPorHoraMl

  function elegirRecipiente(id: Recipiente) {
    setRecipiente(id)
    setMl(recipientePorId(id).ml)
  }

  async function alTomarFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = '' // permite volver a elegir la misma foto
    if (!archivo) return
    setError(null)
    try {
      const pequena = await comprimirImagen(archivo)
      setFoto(pequena)
      setRevisando(true)
      const resultado = await revisarFoto(pequena, recipiente)
      if (!resultado) {
        setRevision({
          estado: 'con-foto',
          nota: 'Foto guardada en tu teléfono. La revisión automática no está disponible.',
        })
      } else if (!resultado.hayRecipiente) {
        setRevision({
          estado: 'dudoso',
          nota: 'No alcancé a ver un vaso o pocillo en la foto. La guardo igual, pero tú sabes.',
        })
      } else if (resultado.estado === 'vacio') {
        setRevision({ estado: 'confirmado', nota: resultado.nota || 'Se ve vacío. Bien ahí.' })
      } else {
        setRevision({
          estado: 'dudoso',
          nota:
            resultado.nota ||
            'Se ve que todavía tiene agua. Tómatelo y vuelve a tomar la foto si quieres que cuente como confirmado.',
        })
      }
    } catch {
      setError('No se pudo procesar la foto. Puedes registrar sin foto.')
    } finally {
      setRevisando(false)
    }
  }

  async function guardar() {
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      const verificacion: EstadoVerificacion = foto ? (revision?.estado ?? 'con-foto') : 'sin-foto'
      const id = await agregarRegistro(
        uid,
        {
          ml,
          recipiente,
          verificacion,
          tieneFotoLocal: Boolean(foto),
          ...(revision?.nota ? { notaFoto: revision.nota } : {}),
        },
        perfil.metaMl,
      )
      if (foto) await guardarFoto(id, foto)

      const gotas =
        GOTAS_POR_TRAGO +
        (foto ? GOTAS_POR_FOTO : 0) +
        (verificacion === 'confirmado' ? GOTAS_POR_CONFIRMADA : 0)
      await sumarGotas(uid, gotas, Math.round(ml / 50))
      alCerrar()
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e intenta otra vez.')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="anim-entrar zona-segura-abajo max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-[var(--color-borde)] bg-[var(--color-fondo-2)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">¿Cuánta agua tomaste?</h2>
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-full p-2 text-[var(--color-texto-suave)]"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-2 text-xs text-[var(--color-texto-suave)]">En qué la tomaste</p>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {RECIPIENTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => elegirRecipiente(r.id)}
              className={`rounded-2xl border px-2 py-3 text-center transition ${
                recipiente === r.id
                  ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/15'
                  : 'border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
              }`}
            >
              <div className="text-xl">{r.emoji}</div>
              <div className="mt-1 text-xs font-medium">{r.nombre}</div>
              <div className="text-[10px] text-[var(--color-texto-suave)]">{r.ml} ml</div>
            </button>
          ))}
        </div>

        <div className="mb-5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMl((n) => Math.max(50, n - 50))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-fondo-2)]"
              aria-label="Quitar 50 mililitros"
            >
              <Minus size={20} />
            </button>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--color-agua-clara)]">{ml}</div>
              <div className="text-xs text-[var(--color-texto-suave)]">mililitros</div>
            </div>
            <button
              type="button"
              onClick={() => setMl((n) => Math.min(TOPES.maximoPorTomaMl, n + 50))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-fondo-2)]"
              aria-label="Agregar 50 mililitros"
            >
              <Plus size={20} />
            </button>
          </div>
          {seVaAPasar && (
            <p className="mt-3 rounded-xl bg-[var(--color-alerta)]/12 px-3 py-2 text-xs text-[var(--color-alerta)]">
              Con este vaso pasarías de {TOPES.maximoPorHoraMl} ml en una hora. El riñón no
              alcanza a eliminar más que eso: mejor esperar un rato.
            </p>
          )}
        </div>

        <div className="mb-5">
          <input
            ref={entradaFoto}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={alTomarFoto}
            className="hidden"
          />
          {foto ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-borde)]">
              <img
                src={foto}
                alt="El recipiente que usaste"
                className="max-h-52 w-full object-cover"
              />
              <div className="flex items-center gap-2 p-3 text-xs">
                {revisando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mirando la foto...
                  </>
                ) : (
                  <>
                    {revision?.estado === 'confirmado' ? (
                      <Check size={16} className="text-[var(--color-logro)]" />
                    ) : (
                      <Camera size={16} className="text-[var(--color-texto-suave)]" />
                    )}
                    <span className="text-[var(--color-texto-suave)]">{revision?.nota}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => entradaFoto.current?.click()}
                className="w-full border-t border-[var(--color-borde)] py-2.5 text-xs text-[var(--color-agua-clara)]"
              >
                Tomar otra
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => entradaFoto.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-agua)]/50 bg-[var(--color-agua)]/8 px-4 py-5 text-sm"
            >
              <Camera size={20} className="text-[var(--color-agua-clara)]" />
              <span className="text-left">
                <span className="block font-semibold">Foto del vaso ya vacío</span>
                <span className="block text-xs text-[var(--color-texto-suave)]">
                  Opcional. Es para ti, no para nadie más. +{GOTAS_POR_FOTO} gotas
                </span>
              </span>
            </button>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-[var(--color-peligro)]/12 px-3 py-2 text-xs text-[var(--color-peligro)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={guardar}
          disabled={guardando || revisando}
          className="w-full rounded-2xl bg-gradient-to-r from-[var(--color-agua-clara)] to-[var(--color-agua)] py-4 font-bold text-[#04121f] transition active:scale-[0.99] disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : `Registrar ${ml} ml para ${mascota.nombre}`}
        </button>
      </div>
    </div>
  )
}
