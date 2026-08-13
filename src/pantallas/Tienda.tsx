import { useState } from 'react'
import { ARTICULOS, alimentar, nivelPorXp, tieneHambre, xpQueFaltaParaSubir } from '../lib/tienda'
import type { ArticuloTienda } from '../lib/tienda'
import type { Mascota } from '../lib/tipos'

const GRUPOS: { tipo: ArticuloTienda['tipo']; titulo: string; nota: string }[] = [
  {
    tipo: 'comida',
    titulo: 'Comida',
    nota: 'La alimenta y sube experiencia. No cambia tu nivel de agua.',
  },
  { tipo: 'sombrero', titulo: 'Sombreros', nota: 'Se le pone uno a la vez.' },
  { tipo: 'accesorio', titulo: 'Accesorios', nota: 'Se le pone uno a la vez.' },
]

export default function Tienda({
  mascota,
  alGuardar,
}: {
  mascota: Mascota
  alGuardar: (mascota: Mascota) => Promise<void>
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const nivel = nivelPorXp(mascota.xp)
  const hambre = tieneHambre(mascota.ultimaComida)

  async function comprar(articulo: ArticuloTienda) {
    if (ocupado) return
    if (mascota.gotas < articulo.precio) {
      setAviso('Te faltan gotas. Se ganan tomando agua y registrando con foto.')
      return
    }
    if (articulo.tipo !== 'comida' && mascota.comprados.includes(articulo.id)) {
      setAviso('Ese ya lo tienes.')
      return
    }
    setOcupado(articulo.id)
    setAviso(null)
    try {
      if (articulo.tipo === 'comida') {
        const comida = alimentar(mascota, articulo.precio)
        await alGuardar({ ...comida, nivel: nivelPorXp(comida.xp) })
        setAviso(`${mascota.nombre} se comió ${articulo.nombre.toLowerCase()}. Quedó contenta.`)
      } else {
        await alGuardar({
          ...mascota,
          gotas: mascota.gotas - articulo.precio,
          comprados: [...mascota.comprados, articulo.id],
          ...(articulo.tipo === 'sombrero'
            ? { sombrero: articulo.valor ?? null }
            : { accesorio: articulo.valor ?? null }),
        })
        setAviso(`${articulo.nombre} comprado y puesto.`)
      }
    } catch {
      setAviso('No se pudo. Revisa tu conexión.')
    } finally {
      setOcupado(null)
    }
  }

  async function alternarPuesto(articulo: ArticuloTienda) {
    if (ocupado) return
    setOcupado(articulo.id)
    try {
      const campo = articulo.tipo === 'sombrero' ? 'sombrero' : 'accesorio'
      const puestoAhora = mascota[campo] === articulo.valor
      await alGuardar({ ...mascota, [campo]: puestoAhora ? null : (articulo.valor ?? null) })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-5 pb-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-titulo)] text-xl font-bold">Tienda</h1>
        <span className="rounded-full border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-3.5 py-1.5 text-sm">
          💧 {mascota.gotas} gotas
        </span>
      </header>

      <div className="mb-5 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium">
            {mascota.nombre} · nivel {nivel}
          </span>
          <span className="text-xs text-[var(--color-texto-suave)]">
            faltan {xpQueFaltaParaSubir(mascota.xp)} para subir
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-fondo-2)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-agua-honda)] to-[var(--color-agua-clara)]"
            style={{ width: `${mascota.xp % 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
          {hambre
            ? 'Tiene hambre. Darle de comer no la hidrata, pero la pone contenta.'
            : 'Comió hace poco.'}
        </p>
      </div>

      {aviso && (
        <p className="mb-4 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 text-sm">
          {aviso}
        </p>
      )}

      {GRUPOS.map((grupo) => (
        <section key={grupo.tipo} className="mb-6">
          <h2 className="text-sm font-bold">{grupo.titulo}</h2>
          <p className="mb-2 text-xs text-[var(--color-texto-suave)]">{grupo.nota}</p>
          <ul className="space-y-2">
            {ARTICULOS.filter((a) => a.tipo === grupo.tipo).map((articulo) => {
              const comprado = mascota.comprados.includes(articulo.id)
              const puesto =
                articulo.tipo === 'sombrero'
                  ? mascota.sombrero === articulo.valor
                  : articulo.tipo === 'accesorio'
                    ? mascota.accesorio === articulo.valor
                    : false
              const alcanza = mascota.gotas >= articulo.precio
              return (
                <li
                  key={articulo.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3"
                >
                  <span className="text-2xl">{articulo.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{articulo.nombre}</p>
                    <p className="text-xs text-[var(--color-texto-suave)]">
                      {articulo.descripcion}
                    </p>
                  </div>
                  {comprado && articulo.tipo !== 'comida' ? (
                    <button
                      type="button"
                      onClick={() => alternarPuesto(articulo)}
                      disabled={ocupado === articulo.id}
                      className={`rounded-xl px-3 py-2 text-xs font-medium ${
                        puesto
                          ? 'bg-[var(--color-agua)] text-[#04121f]'
                          : 'border border-[var(--color-borde)]'
                      }`}
                    >
                      {puesto ? 'Puesto' : 'Poner'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => comprar(articulo)}
                      disabled={ocupado === articulo.id || !alcanza}
                      className="rounded-xl bg-[var(--color-agua)] px-3 py-2 text-xs font-medium text-[#04121f] disabled:opacity-35"
                    >
                      💧 {articulo.precio}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs leading-relaxed text-[var(--color-texto-suave)]/80">
        Nada de lo que se compra aquí sube tu nivel de agua. Si comprar cositas pudiera
        curar a la mascota, la app estaría enseñándote lo contrario de lo que quiere
        enseñarte.
      </p>
    </div>
  )
}
