// Los botones de un toque, encima del boton grande.
//
// Registran de una, sin abrir ninguna ventana. Pero pasan por los MISMOS topes
// de seguridad que el registro normal: si el rinon ya va lleno para esta hora,
// el boton lo dice y no guarda nada. La comodidad no puede saltarse la salud.
import { useState } from 'react'
import { Undo2 } from 'lucide-react'
import { bebidaPorId, VERSION_CATALOGO } from '../lib/bebidas'
import { revisarToma } from '../lib/hidratacion'
import { agregarRegistro, borrarRegistro, sumarGotas } from '../lib/almacen'
import type { Sugerencia } from '../lib/sugerencias'
import type { Registro } from '../lib/tipos'

const GOTAS_POR_TRAGO = 5

export default function LoDeSiempre({
  uid,
  metaMl,
  sugerencias,
  registros,
}: {
  uid: string
  metaMl: number
  sugerencias: Sugerencia[]
  registros: Registro[]
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  /** Lo ultimo que se guardo, para poder deshacerlo de un toque. */
  const [ultimo, setUltimo] = useState<{ id: string; texto: string } | null>(null)

  if (sugerencias.length === 0) return null

  async function registrar(s: Sugerencia) {
    const clave = `${s.bebida}|${s.ml}`
    if (ocupado) return
    const revision = revisarToma(s.ml, registros, s.bebida)
    if (revision.veredicto === 'rechazado') {
      setAviso(revision.motivo)
      return
    }
    setOcupado(clave)
    setAviso(null)
    try {
      const id = await agregarRegistro(
        uid,
        {
          ml: revision.mlEfectivo,
          mlBruto: revision.mlAceptado,
          bebida: s.bebida,
          versionCatalogo: VERSION_CATALOGO,
          recipiente: 'otro',
          verificacion: 'sin-foto',
          tieneFotoLocal: false,
        },
        metaMl,
      )
      await sumarGotas(uid, GOTAS_POR_TRAGO, Math.round(revision.mlEfectivo / 50))
      setUltimo({
        id,
        texto: `${bebidaPorId(s.bebida).nombre} · ${revision.mlAceptado} ml`,
      })
      if (revision.veredicto === 'recortado') setAviso(revision.motivo)
    } catch {
      setAviso('No se pudo guardar. Revisa tu conexión.')
    } finally {
      setOcupado(null)
    }
  }

  async function deshacer() {
    if (!ultimo) return
    const registro = registros.find((r) => r.id === ultimo.id)
    setUltimo(null)
    setAviso(null)
    if (registro) await borrarRegistro(uid, registro)
  }

  return (
    <div className="mb-3">
      <p className="mb-2 text-xs text-[var(--color-texto-suave)]">Lo de siempre</p>
      <div className="flex flex-wrap gap-2">
        {sugerencias.map((s) => {
          const bebida = bebidaPorId(s.bebida)
          const clave = `${s.bebida}|${s.ml}`
          return (
            <button
              key={clave}
              type="button"
              onClick={() => void registrar(s)}
              disabled={ocupado !== null}
              className="flex items-center gap-2 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-3.5 py-2.5 text-sm transition active:scale-[0.97] disabled:opacity-50"
            >
              <span>{bebida.emoji}</span>
              <span className="font-medium">{bebida.nombre}</span>
              <span className="text-[var(--color-agua-clara)]">{s.ml} ml</span>
            </button>
          )
        })}
      </div>

      {ultimo && (
        <button
          type="button"
          onClick={() => void deshacer()}
          className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)] underline underline-offset-2"
        >
          <Undo2 size={13} />
          Anoté {ultimo.texto}. Deshacer
        </button>
      )}
      {aviso && (
        <p className="mt-2 rounded-xl bg-[var(--color-alerta)]/12 px-3 py-2 text-xs text-[var(--color-alerta)]">
          {aviso}
        </p>
      )}
    </div>
  )
}
