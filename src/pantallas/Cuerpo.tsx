import FranjaAgua from '../componentes/FranjaAgua'
import PanelOrganos from '../componentes/PanelOrganos'
import { consejoAhora } from '../lib/hidratacion'
import type { EstadoCuerpo, Perfil } from '../lib/tipos'

// Esta pantalla es solo el cuerpo por dentro. No hay chat aqui a proposito:
// a la mascota se le habla en SU pantalla, mirandola.

const COLOR_ACCION: Record<string, string> = {
  tomar: 'var(--color-agua)',
  seguir: 'var(--color-logro)',
  esperar: 'var(--color-alerta)',
  frenar: 'var(--color-peligro)',
}

const TITULO_ACCION: Record<string, string> = {
  tomar: 'Te falta agua',
  seguir: 'Vas bien',
  esperar: 'Mejor espera',
  frenar: 'Frena ya',
}

export default function Cuerpo({ perfil, estado }: { perfil: Perfil; estado: EstadoCuerpo }) {
  const consejo = consejoAhora(perfil, estado)
  const color = COLOR_ACCION[consejo.accion]

  return (
    <div className="mx-auto max-w-lg px-5 pt-5 pb-6">
      <h1 className="mb-4 font-[family-name:var(--font-titulo)] text-xl font-bold">Mi cuerpo</h1>

      {/* Lo primero: mas agua, o menos. Es la pregunta que la gente tiene. */}
      <section
        className="mb-4 rounded-3xl border p-5"
        style={{ borderColor: `${color}66`, backgroundColor: `${color}14` }}
      >
        <p className="text-sm font-bold" style={{ color }}>
          {TITULO_ACCION[consejo.accion]}
          {consejo.ml > 0 && ` · unos ${consejo.ml} ml`}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-texto-suave)]">
          {consejo.resumen}
        </p>
      </section>

      <FranjaAgua perfil={perfil} estado={estado} />

      <PanelOrganos estado={estado} />

      {perfil.requiereMedico && (
        <p className="rounded-2xl border border-[var(--color-alerta)]/40 bg-[var(--color-alerta)]/10 p-4 text-xs leading-relaxed text-[var(--color-alerta)]">
          Marcaste una condición de salud que afecta los líquidos. Todo lo de esta pantalla es
          una referencia general: la cantidad correcta para ti la define tu médico.
        </p>
      )}
    </div>
  )
}
