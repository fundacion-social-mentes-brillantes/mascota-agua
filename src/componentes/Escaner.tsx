// La camara que lee el codigo del empaque.
//
// POR QUE UN LECTOR PROPIO Y NO EL DEL NAVEGADOR: los navegadores traen uno
// (BarcodeDetector), pero en iPhone viene apagado desde iOS 17 y esta dañado
// desde iOS 18, y en Android depende de Google Play Services y cuando falla
// dice "no vi ningun codigo" -- igualito que cuando de verdad no hay ninguno.
// La persona no concluye "me falta un modulo de Google": concluye que la app
// no sirve. Asi que la app lleva su propio lector adentro, igual en los dos.
//
// EL ARCHIVO SE SIRVE DESDE NUESTRO DOMINIO. La libreria por defecto lo baja
// de un CDN ajeno en cada uso; con `?url` Vite lo empaqueta y sale de aqui.
// Son 1,1 MB, asi que NO se precarga al instalar la app (quien nunca escanee
// no tiene por que bajarlo); se baja la primera vez que alguien toca
// "Escanear" y de ahi en adelante queda guardado -- ver runtimeCaching en
// vite.config.ts. La segunda vez ya funciona sin datos.
//
// Lee CODIGO DE BARRAS y QR a la vez, a proposito: GS1 esta en transicion a
// doble marcaje hasta 2027 y muchos empaques ya traen los dos.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Pencil, X, Zap } from 'lucide-react'
import { readBarcodesFromImageData, prepareZXingModule } from 'zxing-wasm/reader'
import urlDelLector from 'zxing-wasm/reader/zxing_reader.wasm?url'

/** A los 12 segundos se deja de insistir y se ofrece escribir a mano. */
const SEGUNDOS_ANTES_DE_RENDIRSE = 12

let preparado = false
function prepararUnaVez() {
  if (preparado) return
  preparado = true
  prepareZXingModule({ overrides: { locateFile: () => urlDelLector } })
}

export default function Escaner({
  alLeer,
  alCerrar,
  alEscribirAMano,
}: {
  alLeer: (codigo: string) => void
  alCerrar: () => void
  alEscribirAMano: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const corriendo = useRef(true)
  const [estado, setEstado] = useState<'pidiendo' | 'buscando' | 'sin-permiso' | 'sin-camara'>(
    'pidiendo',
  )
  const [segundos, setSegundos] = useState(0)
  const [linterna, setLinterna] = useState<MediaStreamTrack | null>(null)
  const [linternaEncendida, setLinternaEncendida] = useState(false)

  const mirar = useCallback(async () => {
    const v = video.current
    const c = lienzo.current
    if (!v || !c || v.videoWidth === 0) return null
    // Se mira solo la franja del centro: es donde la gente pone el codigo, y
    // recortar hace que lea mucho mas rapido.
    const ancho = v.videoWidth
    const alto = Math.round(v.videoHeight * 0.4)
    const desdeY = Math.round((v.videoHeight - alto) / 2)
    c.width = ancho
    c.height = alto
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(v, 0, desdeY, ancho, alto, 0, 0, ancho, alto)
    const imagen = ctx.getImageData(0, 0, ancho, alto)
    try {
      const encontrados = await readBarcodesFromImageData(imagen, {
        tryHarder: true,
        formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'QRCode', 'DataMatrix'],
        maxNumberOfSymbols: 1,
      })
      const bueno = encontrados.find((b) => b.text && b.text.length >= 6)
      return bueno?.text ?? null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    prepararUnaVez()
    let flujo: MediaStream | null = null
    corriendo.current = true

    const arrancar = async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
        })
      } catch (fallo) {
        const nombre = (fallo as Error)?.name
        setEstado(nombre === 'NotAllowedError' ? 'sin-permiso' : 'sin-camara')
        return
      }
      if (!corriendo.current) {
        flujo.getTracks().forEach((t) => t.stop())
        return
      }
      const pista = flujo.getVideoTracks()[0]
      if (pista && 'torch' in (pista.getCapabilities?.() ?? {})) setLinterna(pista)
      if (video.current) {
        video.current.srcObject = flujo
        await video.current.play().catch(() => {})
      }
      setEstado('buscando')

      while (corriendo.current) {
        const codigo = await mirar()
        if (codigo) {
          corriendo.current = false
          if (navigator.vibrate) navigator.vibrate(60)
          alLeer(codigo)
          return
        }
        await new Promise((r) => setTimeout(r, 120))
      }
    }

    void arrancar()
    const reloj = window.setInterval(() => setSegundos((s) => s + 1), 1000)

    return () => {
      corriendo.current = false
      window.clearInterval(reloj)
      flujo?.getTracks().forEach((t) => t.stop())
    }
  }, [mirar, alLeer])

  async function cambiarLinterna() {
    if (!linterna) return
    const nueva = !linternaEncendida
    try {
      await linterna.applyConstraints({
        advanced: [{ torch: nueva } as unknown as MediaTrackConstraintSet],
      })
      setLinternaEncendida(nueva)
    } catch {
      /* si el telefono no deja, no pasa nada */
    }
  }

  const seRindio = segundos >= SEGUNDOS_ANTES_DE_RENDIRSE

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="zona-segura-arriba flex items-center justify-between p-4 text-white">
        <span className="text-sm font-semibold">Apunta al código del empaque</span>
        <button type="button" onClick={alCerrar} className="rounded-full p-2" aria-label="Cerrar">
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={video}
          playsInline
          muted
          className="h-full w-full object-cover"
          aria-label="Vista de la cámara"
        />
        <canvas ref={lienzo} className="hidden" />

        {/* La franja donde de verdad se busca. */}
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-40 -translate-y-1/2 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />

        {estado === 'buscando' && (
          <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-6 text-center text-white">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 size={15} className="animate-spin" />
              Buscando el código…
            </p>
            {linterna && (
              <button
                type="button"
                onClick={() => void cambiarLinterna()}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${
                  linternaEncendida ? 'bg-white text-black' : 'bg-white/20'
                }`}
              >
                <Zap size={14} />
                {linternaEncendida ? 'Apagar la luz' : 'Prender la luz'}
              </button>
            )}
          </div>
        )}

        {estado === 'pidiendo' && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
            <Camera size={16} /> Pidiendo permiso de la cámara…
          </p>
        )}

        {(estado === 'sin-permiso' || estado === 'sin-camara') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-white">
            <Camera size={28} />
            <p className="text-sm leading-relaxed">
              {estado === 'sin-permiso'
                ? 'No diste permiso para la cámara. Puedes registrar a mano, que funciona igual de bien.'
                : 'No pude abrir la cámara de este teléfono. Puedes registrar a mano.'}
            </p>
          </div>
        )}
      </div>

      {/* Escribir a mano NO es el plan B escondido: esta siempre a la vista. */}
      <div className="zona-segura-abajo bg-black p-4">
        {seRindio && estado === 'buscando' && (
          <p className="mb-3 text-center text-xs text-white/70">
            Si no lo agarra, no es culpa tuya: los empaques curvos y brillantes son difíciles.
          </p>
        )}
        <button
          type="button"
          onClick={alEscribirAMano}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 py-3.5 text-sm text-white"
        >
          <Pencil size={16} />
          Mejor lo escribo a mano
        </button>
      </div>
    </div>
  )
}
