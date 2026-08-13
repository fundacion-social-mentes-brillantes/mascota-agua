import { AlertTriangle, Clock, Droplets, Heart } from 'lucide-react'
import Mascota from '../componentes/MascotaViva'
import Anillo from '../componentes/Anillo'
import { saludoDeLaMascota } from '../lib/frases'
import { tieneHambre } from '../lib/tienda'
import type { EstadoCuerpo, Mascota as MascotaTipo, Perfil, Registro } from '../lib/tipos'

function horaCorta(hora: number): string {
  return new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function textoSinBeber(horas: number): string {
  if (!Number.isFinite(horas)) return 'Aún no tomas agua hoy'
  if (horas < 1) return `Hace ${Math.round(horas * 60)} minutos`
  const enteras = Math.floor(horas)
  const minutos = Math.round((horas - enteras) * 60)
  return minutos > 0 ? `Hace ${enteras} h ${minutos} min` : `Hace ${enteras} h`
}

export default function Casa({
  perfil,
  mascota,
  estado,
  registros,
  alRegistrar,
}: {
  perfil: Perfil
  mascota: MascotaTipo
  estado: EstadoCuerpo
  registros: Registro[]
  alRegistrar: () => void
}) {
  const hambre = tieneHambre(mascota.ultimaComida)
  const faltan = Math.max(0, estado.metaMl - estado.totalHoyMl)

  return (
    <div className="mx-auto max-w-lg px-5 pt-5">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-texto-suave)]">Hola, {perfil.nombre}</p>
          <h1 className="font-[family-name:var(--font-titulo)] text-xl font-bold">
            {saludoDeLaMascota(estado, mascota.nombre)}
          </h1>
        </div>
        <div className="rounded-full border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-3 py-1.5 text-sm">
          💧 {mascota.gotas}
        </div>
      </header>

      {estado.alertaExceso && (
        <div className="mb-3 flex gap-3 rounded-2xl border border-[var(--color-alerta)]/50 bg-[var(--color-alerta)]/12 p-4">
          <AlertTriangle size={20} className="shrink-0 text-[var(--color-alerta)]" />
          <p className="text-sm text-[var(--color-alerta)]">{estado.alertaExceso}</p>
        </div>
      )}

      <div className="relative flex justify-center py-2">
        <Mascota
          especie={mascota.especie}
          color={mascota.color}
          nivel={estado.nivel}
          hidratacion={estado.hidratacion}
          sombrero={mascota.sombrero}
          accesorio={mascota.accesorio}
          tamano={300}
        />
        {hambre && (
          <span
            className="anim-brillo absolute top-2 right-2 rounded-full bg-[var(--color-tarjeta)] px-3 py-1.5 text-xs"
            title="Tiene hambre"
          >
            🍽️ tiene hambre
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={alRegistrar}
        className="mb-4 flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-[var(--color-agua-clara)] to-[var(--color-agua)] py-4 text-base font-bold text-[#04121f] shadow-[0_10px_28px_rgba(53,182,240,0.35)] transition active:scale-[0.99]"
      >
        <Droplets size={22} strokeWidth={2.4} />
        Acabo de tomar agua
      </button>

      <div className="mb-4 flex items-center gap-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-4">
        <Anillo porcentaje={estado.porcentaje}>
          <span className="text-lg font-bold">{estado.porcentaje}%</span>
          <span className="text-[10px] text-[var(--color-texto-suave)]">de tu meta</span>
        </Anillo>
        <div className="flex-1">
          <p className="text-2xl font-bold text-[var(--color-agua-clara)]">
            {estado.totalHoyMl} <span className="text-sm font-normal">ml hoy</span>
          </p>
          <p className="text-sm text-[var(--color-texto-suave)]">
            {faltan > 0 ? `Te faltan ${faltan} ml` : 'Meta cumplida'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-texto-suave)]">
            <Clock size={13} />
            {textoSinBeber(estado.horasSinBeber)}
          </p>
        </div>
      </div>

      <section className="mb-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Heart size={16} className="text-[var(--color-agua-clara)]" />
          <h2 className="text-sm font-bold">Cómo estoy por dentro</h2>
        </div>
        <div className="space-y-2.5">
          {estado.loQuePasa.map((linea) => (
            <p key={linea} className="text-sm leading-relaxed text-[var(--color-texto-suave)]">
              {linea}
            </p>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-fondo-2)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-agua-honda)] to-[var(--color-agua-clara)] transition-all duration-700"
              style={{ width: `${estado.hidratacion}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-texto-suave)]">
            {estado.hidratacion}% de agua
          </span>
        </div>
      </section>

      {perfil.requiereMedico && (
        <p className="mb-4 rounded-2xl border border-[var(--color-alerta)]/40 bg-[var(--color-alerta)]/10 p-4 text-xs leading-relaxed text-[var(--color-alerta)]">
          Marcaste una condición de salud que afecta los líquidos. Esta meta es solo una
          referencia: la cantidad correcta para ti te la dice tu médico, no esta app.
        </p>
      )}

      <section className="pb-6">
        <h2 className="mb-2 text-sm font-bold">Lo de hoy</h2>
        {registros.length === 0 ? (
          <button
            type="button"
            onClick={alRegistrar}
            className="w-full rounded-3xl border border-dashed border-[var(--color-borde)] p-6 text-sm text-[var(--color-texto-suave)]"
          >
            Todavía no has registrado nada hoy. Toca aquí cuando tomes agua.
          </button>
        ) : (
          <ul className="space-y-2">
            {registros.slice(0, 6).map((registro) => (
              <li
                key={registro.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3"
              >
                <span className="text-lg">
                  {registro.verificacion === 'confirmado'
                    ? '✅'
                    : registro.tieneFotoLocal
                      ? '📷'
                      : '💧'}
                </span>
                <span className="flex-1 text-sm">{registro.ml} ml</span>
                <span className="text-xs text-[var(--color-texto-suave)]">
                  {horaCorta(registro.hora)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
