import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Volume2, VolumeX } from 'lucide-react'
import { escucharChat, guardarMensaje } from '../lib/almacen'
import { hablarConLaMascota, saludoInicial } from '../lib/mascotaIA'
import { VOZ_POR_DEFECTO, callarMascota, hablar, paraLeerEnVoz } from '../lib/voz'
import type { EstadoCuerpo, Mascota, MensajeChat, Perfil } from '../lib/tipos'

const SUGERENCIAS = [
  '¿Cómo estoy por dentro ahora mismo?',
  '¿Qué me pasa si no tomo agua en todo el día?',
  '¿Es verdad que el tinto deshidrata?',
  '¿Me falta mucho para la meta?',
]

export default function Charla({
  uid,
  perfil,
  mascota,
  estado,
}: {
  uid: string
  perfil: Perfil
  mascota: Mascota
  estado: EstadoCuerpo
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [hablando, setHablando] = useState<string | null>(null)
  const final = useRef<HTMLDivElement>(null)

  const voz = perfil.voz ?? VOZ_POR_DEFECTO
  const vozActiva = perfil.vozActiva !== false

  useEffect(() => escucharChat(uid, setMensajes), [uid])

  // Si se sale de la conversacion, la mascota se calla.
  useEffect(() => () => callarMascota(), [])

  const decirEnVoz = useCallback(
    async (id: string, contenido: string) => {
      setHablando(id)
      await hablar(paraLeerEnVoz(contenido), voz, estado.nivel)
      setHablando(null)
    },
    [voz, estado.nivel],
  )

  useEffect(() => {
    final.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length, pensando])

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim()
    if (!limpia || pensando) return
    setTexto('')
    setPensando(true)
    try {
      await guardarMensaje(uid, 'persona', limpia)
      const respuesta = await hablarConLaMascota(limpia, perfil, mascota, estado, mensajes)
      await guardarMensaje(uid, 'mascota', respuesta.texto)
      // La mascota contesta y, si la voz esta encendida, lo dice en voz alta.
      if (vozActiva) {
        setHablando('ultima')
        await hablar(paraLeerEnVoz(respuesta.texto), voz, estado.nivel)
        setHablando(null)
      }
    } catch {
      await guardarMensaje(
        uid,
        'mascota',
        'No pude responder ahora. Intenta otra vez en un momento.',
      ).catch(() => {})
    } finally {
      setPensando(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col px-5 pt-5">
      <h1 className="mb-3 font-[family-name:var(--font-titulo)] text-xl font-bold">
        Hablar con {mascota.nombre}
      </h1>

      <div className="flex-1 space-y-3">
        <Burbuja de="mascota">{saludoInicial(mascota, estado)}</Burbuja>

        {mensajes.map((mensaje) => (
          <Burbuja
            key={mensaje.id}
            de={mensaje.de}
            alEscuchar={
              mensaje.de === 'mascota'
                ? () =>
                    hablando === mensaje.id
                      ? (callarMascota(), setHablando(null))
                      : decirEnVoz(mensaje.id, mensaje.texto)
                : undefined
            }
            sonando={hablando === mensaje.id}
          >
            {mensaje.texto}
          </Burbuja>
        ))}

        {pensando && (
          <Burbuja de="mascota">
            <span className="anim-brillo">Pensando...</span>
          </Burbuja>
        )}

        {mensajes.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-3.5 py-2 text-xs"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={final} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar(texto)
        }}
        className="sticky bottom-0 flex gap-2 bg-[var(--color-fondo)] py-3"
      >
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Escríbele a ${mascota.nombre}`}
          className="flex-1 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3 outline-none focus:border-[var(--color-agua)]"
        />
        <button
          type="submit"
          disabled={pensando || texto.trim().length === 0}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-agua)] text-[#04121f] disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

function Burbuja({
  de,
  children,
  alEscuchar,
  sonando,
}: {
  de: 'persona' | 'mascota'
  children: React.ReactNode
  alEscuchar?: () => void
  sonando?: boolean
}) {
  const mia = de === 'persona'
  return (
    <div className={`flex ${mia ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          mia
            ? 'rounded-br-sm bg-[var(--color-agua)] text-[#04121f]'
            : 'rounded-bl-sm border border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
        }`}
      >
        {children}
        {alEscuchar && (
          <button
            type="button"
            onClick={alEscuchar}
            className={`mt-2 flex items-center gap-1.5 text-xs ${
              sonando ? 'text-[var(--color-agua-clara)]' : 'text-[var(--color-texto-suave)]'
            }`}
            aria-label={sonando ? 'Callar' : 'Escuchar'}
          >
            {sonando ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {sonando ? 'Callar' : 'Escuchar'}
          </button>
        )}
      </div>
    </div>
  )
}
