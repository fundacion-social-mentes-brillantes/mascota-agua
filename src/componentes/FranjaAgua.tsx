// La franja del dia: los cuatro numeros en una sola barra.
//
// Una meta sola no dice la verdad completa. No es lo mismo quedarse corto que
// quedarse por debajo de lo que el cuerpo gasta solo respirando, ni pasarse un
// poco que pasarse hasta hacerse dano. Por eso aqui se ven los cuatro y donde
// cae uno hoy.
import { franjaDelDia, minimoVitalMl, zonaDelDia, type ZonaDelDia } from '../lib/hidratacion'
import { CAFEINA_MUCHA_MG, CAFEINA_QUE_YA_SE_NOTA_MG } from '../lib/bebidas'
import type { EstadoCuerpo, Perfil } from '../lib/tipos'

const TEXTO_ZONA: Record<ZonaDelDia, { titulo: string; explica: string; color: string }> = {
  'en-el-hueso': {
    titulo: 'En el hueso',
    explica:
      'Vas por debajo de lo que el cuerpo gasta solo respirando y haciendo orina. Lo que falta lo está sacando de donde no debe.',
    color: 'var(--color-peligro)',
  },
  corto: {
    titulo: 'Corto',
    explica: 'Ya cubriste lo básico, pero todavía no llegas al punto donde el cuerpo trabaja cómodo.',
    color: 'var(--color-alerta)',
  },
  equilibrio: {
    titulo: 'En equilibrio',
    explica: 'Aquí es donde debe estar. Ni de menos ni de más.',
    color: 'var(--color-logro)',
  },
  'de-sobra': {
    titulo: 'De sobra',
    explica:
      'Más agua de la que necesitas. Todavía no hace daño, pero tampoco aporta nada: solo más viajes al baño.',
    color: 'var(--color-alerta)',
  },
  pasado: {
    titulo: 'Te pasaste',
    explica:
      'Por encima de este punto el agua empieza a diluir el sodio de la sangre. Hoy ya no más.',
    color: 'var(--color-peligro)',
  },
}

export default function FranjaAgua({ perfil, estado }: { perfil: Perfil; estado: EstadoCuerpo }) {
  const franja = franjaDelDia(perfil.metaMl, perfil.pesoKg)
  const zona = zonaDelDia(estado.totalHoyMl, franja)
  const info = TEXTO_ZONA[zona]

  // La barra llega hasta el maximo, para que se vea que la meta NO es el tope.
  const aPorcentaje = (ml: number) => Math.min(100, (ml / franja.maximoMl) * 100)
  const hitos = [
    { ml: franja.minimoMl, nombre: 'mínimo' },
    { ml: franja.metaMl, nombre: 'meta' },
    { ml: franja.techoMl, nombre: 'techo' },
  ]

  return (
    <section className="mb-4 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-bold">Mi franja de hoy</h2>
        <span className="text-xs text-[var(--color-texto-suave)]">
          {estado.totalHoyMl} ml de líquido
        </span>
      </div>
      <p className="mb-4 text-xs font-semibold" style={{ color: info.color }}>
        {info.titulo}
      </p>

      {/* Lo que llena el cuerpo y lo que cuenta para la meta son dos cosas.
          Si no se ven separadas, la persona no entiende por que la barra va
          alta y la meta no se cumple. */}
      {estado.otrasBebidasMl > 0 && (
        <dl className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-fondo-2)] p-3 text-xs">
          <div>
            <dt className="text-[var(--color-texto-suave)]">Agua (la meta)</dt>
            <dd className="font-bold text-[var(--color-agua-clara)]">{estado.aguaHoyMl} ml</dd>
          </div>
          <div>
            <dt className="text-[var(--color-texto-suave)]">Otras bebidas</dt>
            <dd className="font-bold">{estado.otrasBebidasMl} ml</dd>
          </div>
          <p className="col-span-2 text-[10px] leading-relaxed text-[var(--color-texto-suave)]">
            Las dos te sirven: la barra de arriba las suma porque tu cuerpo no
            pregunta de dónde vino el agua. La meta sí es solo de agua.
          </p>
        </dl>
      )}

      {/* La barra: zonas de color de fondo y una marca de donde va hoy. */}
      <div className="relative mb-1.5 h-3 overflow-hidden rounded-full bg-[var(--color-fondo-2)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--color-peligro)]/35"
          style={{ width: `${aPorcentaje(franja.minimoMl)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-[var(--color-alerta)]/30"
          style={{
            left: `${aPorcentaje(franja.minimoMl)}%`,
            width: `${aPorcentaje(franja.metaMl) - aPorcentaje(franja.minimoMl)}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-[var(--color-logro)]/45"
          style={{
            left: `${aPorcentaje(franja.metaMl)}%`,
            width: `${aPorcentaje(franja.techoMl) - aPorcentaje(franja.metaMl)}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-[var(--color-alerta)]/30"
          style={{
            left: `${aPorcentaje(franja.techoMl)}%`,
            width: `${100 - aPorcentaje(franja.techoMl)}%`,
          }}
        />
        {/* Donde va hoy. */}
        <div
          className="absolute inset-y-0 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
          style={{ left: `calc(${aPorcentaje(estado.totalHoyMl)}% - 2px)` }}
        />
      </div>

      {/* Las marcas, con su numero. */}
      <div className="relative mb-3 h-8 text-[10px] text-[var(--color-texto-suave)]">
        {hitos.map((h) => (
          <span
            key={h.nombre}
            className="absolute -translate-x-1/2 text-center leading-tight"
            style={{ left: `${aPorcentaje(h.ml)}%` }}
          >
            <span className="block">{h.ml}</span>
            <span className="block opacity-70">{h.nombre}</span>
          </span>
        ))}
        <span className="absolute right-0 text-right leading-tight">
          <span className="block">{franja.maximoMl}</span>
          <span className="block opacity-70">máximo</span>
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-texto-suave)]">{info.explica}</p>

      {/* La cafeina se INFORMA y ya. No descuenta liquido: no existe una cifra
          publicada para eso, y esta app no se inventa multiplicadores. */}
      {estado.cafeinaHoyMg > 0 && (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed ${
            estado.cafeinaHoyMg >= CAFEINA_QUE_YA_SE_NOTA_MG
              ? 'bg-[var(--color-alerta)]/12 text-[var(--color-alerta)]'
              : 'bg-[var(--color-fondo-2)] text-[var(--color-texto-suave)]'
          }`}
        >
          <strong>{estado.cafeinaHoyMg} mg de cafeína hoy.</strong>{' '}
          {estado.cafeinaHoyMg >= CAFEINA_MUCHA_MG
            ? `Pasaste de ${CAFEINA_MUCHA_MG} mg, que es lo que se considera mucho para un adulto sano.`
            : estado.cafeinaHoyMg >= CAFEINA_QUE_YA_SE_NOTA_MG
              ? `Desde unos ${CAFEINA_QUE_YA_SE_NOTA_MG} mg la cafeína sí te hace orinar un poco más. No te quito nada del líquido: es un dato, no un regaño.`
              : 'Todavía lejos del punto donde empieza a hacerte orinar más.'}
        </p>
      )}

      {estado.alcoholHoyMl > 0 && (
        <p className="mt-2 rounded-xl bg-[var(--color-fondo-2)] px-3 py-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
          {estado.alcoholHoyMl} ml de bebidas con alcohol. Quedan anotados; no
          cuentan para la meta ni para la medalla.
        </p>
      )}

      <details className="mt-3 border-t border-[var(--color-borde)] pt-3">
        <summary className="cursor-pointer text-xs text-[var(--color-agua-clara)]">
          De dónde salen estos cuatro números
        </summary>
        <dl className="mt-2.5 space-y-2 text-xs leading-relaxed text-[var(--color-texto-suave)]">
          <div>
            <dt className="font-semibold text-[var(--color-texto)]">
              Mínimo · {minimoVitalMl(perfil.pesoKg)} ml
            </dt>
            <dd>
              Lo que pierdes sí o sí: respirar y sudar sin darte cuenta gasta cerca de 0,45 ml
              por kilo cada hora, y el riñón no puede hacer menos de medio litro de orina al día
              para sacar los desechos. Aquí ya se descontó el agua que entra con la comida.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-texto)]">Meta · {franja.metaMl} ml</dt>
            <dd>
              Tu equilibrio, según tu peso, tu edad, el clima y lo que te mueves. Es a lo que
              apunta la app.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-texto)]">Techo · {franja.techoMl} ml</dt>
            <dd>
              Un cuarto por encima de la meta. Hasta ahí es un día normal con calor o trabajo
              pesado; más allá es agua que sobra.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-texto)]">
              Máximo · {franja.maximoMl} ml
            </dt>
            <dd>
              El tope duro. Pasar de 4 litros sin ejercicio fuerte ni calor extremo puede diluir
              el sodio de la sangre. Y sin importar el total: nunca más de 800 ml en una hora,
              que es lo que el riñón alcanza a eliminar.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  )
}
