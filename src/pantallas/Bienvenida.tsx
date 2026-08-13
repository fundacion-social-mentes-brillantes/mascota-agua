import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { guardarMascota, guardarPerfil } from '../lib/almacen'
import { calcularMeta } from '../lib/hidratacion'
import { evaluarImc, fraseMundial } from '../lib/imc'
import type { User } from '../lib/firebase'
import type {
  Actividad,
  Clima,
  CondicionDelicada,
  EspecieMascota,
  Etapa,
  Mascota,
  Perfil,
  Sexo,
} from '../lib/tipos'
import MascotaDibujo from '../componentes/MascotaViva'

const ESPECIES: { id: EspecieMascota; nombre: string }[] = [
  { id: 'gota', nombre: 'Gota' },
  { id: 'axolote', nombre: 'Axolote' },
  { id: 'pulpo', nombre: 'Pulpo' },
  { id: 'tortuga', nombre: 'Tortuga' },
  { id: 'nube', nombre: 'Nube' },
]

const COLORES = ['#35b6f0', '#5ee0a8', '#ff8fb1', '#c79bff', '#ffd166', '#ff8b5e']

const CONDICIONES: { id: CondicionDelicada; texto: string }[] = [
  { id: 'rinon', texto: 'Enfermedad del riñón o diálisis' },
  { id: 'corazon', texto: 'Insuficiencia cardíaca' },
  { id: 'higado', texto: 'Cirrosis o enfermedad del hígado' },
  { id: 'diuretico', texto: 'Tomo diuréticos' },
  { id: 'restriccion', texto: 'Me mandaron a tomar menos líquido' },
  { id: 'otra', texto: 'Otra condición en la que me controlan los líquidos' },
]

const ACTIVIDADES: { id: Actividad; titulo: string; detalle: string }[] = [
  { id: 'poca', titulo: 'Poca', detalle: 'Paso el día sentado o de pie, sin ejercicio' },
  {
    id: 'moderada',
    titulo: 'Moderada',
    detalle: 'Camino harto o hago ejercicio 2 o 3 veces por semana',
  },
  { id: 'alta', titulo: 'Alta', detalle: 'Entreno casi todos los días o mi trabajo es físico' },
  {
    id: 'muy-alta',
    titulo: 'Muy alta',
    detalle: 'Entreno fuerte todos los días o trabajo pesado al sol',
  },
]

const CLIMAS: { id: Clima; titulo: string }[] = [
  { id: 'frio', titulo: 'Frío' },
  { id: 'templado', titulo: 'Templado' },
  { id: 'calor', titulo: 'Caliente y seco' },
  { id: 'calor-humedo', titulo: 'Caliente y húmedo' },
]

export default function Bienvenida({
  usuario,
  perfilPrevio,
  mascotaPrevia,
}: {
  usuario: User
  perfilPrevio: Perfil | null
  mascotaPrevia: Mascota | null
}) {
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState(perfilPrevio?.nombre ?? usuario.displayName?.split(' ')[0] ?? '')
  const [edad, setEdad] = useState(perfilPrevio?.edad ? String(perfilPrevio.edad) : '')
  const [sexo, setSexo] = useState<Sexo>(perfilPrevio?.sexo ?? 'sin-decir')
  const [pesoKg, setPesoKg] = useState(perfilPrevio?.pesoKg ? String(perfilPrevio.pesoKg) : '')
  const [alturaCm, setAlturaCm] = useState(perfilPrevio?.alturaCm ? String(perfilPrevio.alturaCm) : '')
  const [actividad, setActividad] = useState<Actividad>(perfilPrevio?.actividad ?? 'poca')
  const [clima, setClima] = useState<Clima>(perfilPrevio?.clima ?? 'templado')
  const [altitudAlta, setAltitudAlta] = useState(perfilPrevio?.altitudAlta ?? false)
  const [etapa, setEtapa] = useState<Etapa>(perfilPrevio?.etapa ?? 'ninguna')
  const [condiciones, setCondiciones] = useState<CondicionDelicada[]>(perfilPrevio?.condiciones ?? [])
  const [horaDespertar, setHoraDespertar] = useState(perfilPrevio?.horaDespertar ?? '06:30')
  const [horaDormir, setHoraDormir] = useState(perfilPrevio?.horaDormir ?? '22:30')
  const [recordatorios, setRecordatorios] = useState(perfilPrevio?.recordatoriosActivos ?? true)

  const [nombreMascota, setNombreMascota] = useState(mascotaPrevia?.nombre ?? '')
  const [especie, setEspecie] = useState<EspecieMascota>(mascotaPrevia?.especie ?? 'gota')
  const [color, setColor] = useState(mascotaPrevia?.color ?? COLORES[0])

  const edadNum = Number.parseInt(edad, 10)
  const pesoNum = Number.parseFloat(pesoKg.replace(',', '.'))
  const alturaNum = Number.parseFloat(alturaCm.replace(',', '.'))

  const imc = useMemo(() => {
    if (!Number.isFinite(pesoNum) || !Number.isFinite(alturaNum) || alturaNum < 80) return null
    return evaluarImc(pesoNum, alturaNum, sexo, Number.isFinite(edadNum) ? edadNum : 30)
  }, [pesoNum, alturaNum, sexo, edadNum])

  const meta = useMemo(() => {
    if (!Number.isFinite(pesoNum) || !Number.isFinite(edadNum)) return null
    return calcularMeta({
      edad: edadNum,
      sexo,
      pesoKg: pesoNum,
      actividad,
      clima,
      altitudAlta,
      etapa,
      condiciones,
    })
  }, [pesoNum, edadNum, sexo, actividad, clima, altitudAlta, etapa, condiciones])

  const pasos = [
    {
      titulo: 'Empecemos por ti',
      valido: nombre.trim().length > 0 && Number.isFinite(edadNum) && edadNum >= 5 && edadNum <= 110,
    },
    {
      titulo: 'Tu cuerpo',
      valido:
        Number.isFinite(pesoNum) &&
        pesoNum >= 15 &&
        pesoNum <= 300 &&
        Number.isFinite(alturaNum) &&
        alturaNum >= 80 &&
        alturaNum <= 230,
    },
    { titulo: 'Cómo es tu día', valido: true },
    { titulo: 'Salud', valido: true },
    { titulo: 'Tus horarios', valido: true },
    { titulo: 'Tu meta', valido: Boolean(meta) },
    { titulo: 'Tu mascota', valido: nombreMascota.trim().length > 0 },
  ]

  function alternarCondicion(id: CondicionDelicada) {
    setCondiciones((previas) =>
      previas.includes(id) ? previas.filter((c) => c !== id) : [...previas, id],
    )
  }

  async function terminar() {
    if (!meta) return
    setGuardando(true)
    setError(null)
    try {
      const ahora = Date.now()
      const perfil: Perfil = {
        nombre: nombre.trim(),
        edad: edadNum,
        sexo,
        pesoKg: pesoNum,
        alturaCm: alturaNum,
        actividad,
        clima,
        altitudAlta,
        etapa,
        condiciones,
        requiereMedico: condiciones.length > 0,
        horaDespertar,
        horaDormir,
        recordatoriosActivos: recordatorios,
        metaMl: meta.metaMl,
        creado: perfilPrevio?.creado ?? ahora,
        actualizado: ahora,
      }
      const mascota: Mascota = {
        nombre: nombreMascota.trim(),
        especie,
        color,
        sombrero: mascotaPrevia?.sombrero ?? null,
        accesorio: mascotaPrevia?.accesorio ?? null,
        gotas: mascotaPrevia?.gotas ?? 30,
        xp: mascotaPrevia?.xp ?? 0,
        nivel: mascotaPrevia?.nivel ?? 1,
        ultimaComida: mascotaPrevia?.ultimaComida ?? ahora,
        comprados: mascotaPrevia?.comprados ?? [],
      }
      await guardarPerfil(usuario.uid, perfil)
      await guardarMascota(usuario.uid, mascota)
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e intenta otra vez.')
      setGuardando(false)
    }
  }

  const actual = pasos[paso]

  return (
    <div className="zona-segura-arriba zona-segura-abajo mx-auto flex min-h-full max-w-lg flex-col px-5 py-6">
      <div className="mb-6 flex gap-1.5">
        {pasos.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= paso ? 'bg-[var(--color-agua)]' : 'bg-[var(--color-borde)]'}`}
          />
        ))}
      </div>

      <h1 className="mb-1 font-[family-name:var(--font-titulo)] text-2xl font-bold">
        {actual.titulo}
      </h1>

      <div key={paso} className="anim-entrar flex-1 py-4">
        {paso === 0 && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--color-texto-suave)]">
              Con esto calculo cuánta agua necesitas tú, no un promedio de internet.
            </p>
            <Campo etiqueta="Cómo te llamas">
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="given-name"
                className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
              />
            </Campo>
            <Campo etiqueta="Cuántos años tienes">
              <input
                type="number"
                inputMode="numeric"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                placeholder="Ej: 34"
                className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
              />
            </Campo>
            <Campo etiqueta="Sexo (para la referencia mundial)">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['mujer', 'Mujer'],
                    ['hombre', 'Hombre'],
                    ['sin-decir', 'Prefiero no decir'],
                  ] as [Sexo, string][]
                ).map(([id, texto]) => (
                  <Opcion key={id} activa={sexo === id} onClick={() => setSexo(id)}>
                    {texto}
                  </Opcion>
                ))}
              </div>
            </Campo>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Peso (kg)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  placeholder="70"
                  className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
                />
              </Campo>
              <Campo etiqueta="Altura (cm)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={alturaCm}
                  onChange={(e) => setAlturaCm(e.target.value)}
                  placeholder="170"
                  className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
                />
              </Campo>
            </div>

            {imc && (
              <div className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-[var(--color-texto-suave)]">Tu IMC</span>
                  <span className="text-3xl font-bold text-[var(--color-agua-clara)]">{imc.imc}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{imc.etiqueta}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-texto-suave)]">
                  {imc.frase}
                </p>
                <p className="mt-3 rounded-2xl bg-[var(--color-fondo-2)] px-4 py-3 text-sm">
                  {fraseMundial(imc.percentilMundial)}
                </p>
                {imc.advertencia && (
                  <p className="mt-3 text-xs text-[var(--color-alerta)]">{imc.advertencia}</p>
                )}
                <p className="mt-3 text-xs text-[var(--color-texto-suave)]/80">
                  Esta app no es para bajar de peso. El peso entra solo porque el agua que
                  necesitas depende de él.
                </p>
              </div>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <Campo etiqueta="Cuánta actividad física haces">
              <div className="space-y-2">
                {ACTIVIDADES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActividad(a.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      actividad === a.id
                        ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/12'
                        : 'border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
                    }`}
                  >
                    <div className="font-medium">{a.titulo}</div>
                    <div className="text-xs text-[var(--color-texto-suave)]">{a.detalle}</div>
                  </button>
                ))}
              </div>
            </Campo>

            <Campo etiqueta="Cómo es el clima donde vives">
              <div className="grid grid-cols-2 gap-2">
                {CLIMAS.map((c) => (
                  <Opcion key={c.id} activa={clima === c.id} onClick={() => setClima(c.id)}>
                    {c.titulo}
                  </Opcion>
                ))}
              </div>
            </Campo>

            <label className="flex items-start gap-3 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-4">
              <input
                type="checkbox"
                checked={altitudAlta}
                onChange={(e) => setAltitudAlta(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--color-agua)]"
              />
              <span className="text-sm">
                Vivo a más de 2.000 metros de altura
                <span className="block text-xs text-[var(--color-texto-suave)]">
                  Bogotá, Tunja, Pasto, Manizales. El aire seco de altura hace perder más agua
                  solo por respirar.
                </span>
              </span>
            </label>

            {sexo !== 'hombre' && (
              <Campo etiqueta="¿Estás en embarazo o lactancia?">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['ninguna', 'No'],
                      ['embarazo', 'Embarazo'],
                      ['lactancia', 'Lactancia'],
                    ] as [Etapa, string][]
                  ).map(([id, texto]) => (
                    <Opcion key={id} activa={etapa === id} onClick={() => setEtapa(id)}>
                      {texto}
                    </Opcion>
                  ))}
                </div>
              </Campo>
            )}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-texto-suave)]">
              Esta parte es la más importante de todas. Hay condiciones en las que tomar más
              agua no ayuda: hace daño. Marca si tienes alguna.
            </p>
            <div className="space-y-2">
              {CONDICIONES.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                    condiciones.includes(c.id)
                      ? 'border-[var(--color-alerta)] bg-[var(--color-alerta)]/10'
                      : 'border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={condiciones.includes(c.id)}
                    onChange={() => alternarCondicion(c.id)}
                    className="h-5 w-5 accent-[var(--color-alerta)]"
                  />
                  <span className="text-sm">{c.texto}</span>
                </label>
              ))}
            </div>
            {condiciones.length > 0 && (
              <p className="rounded-2xl border border-[var(--color-alerta)]/40 bg-[var(--color-alerta)]/10 p-4 text-sm text-[var(--color-alerta)]">
                Entendido. La app te va a mostrar la meta solo como referencia y no te va a
                empujar a tomar más. La cantidad correcta para ti te la tiene que decir tu
                médico.
              </p>
            )}
            <p className="text-xs leading-relaxed text-[var(--color-texto-suave)]/80">
              Esta aplicación no da diagnósticos ni reemplaza a un profesional de la salud.
              Es una ayuda para recordar y para entender lo que pasa en el cuerpo.
            </p>
          </div>
        )}

        {paso === 4 && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--color-texto-suave)]">
              Con esto reparto la meta a lo largo del día y evito avisarte de madrugada.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Me levanto a las">
                <input
                  type="time"
                  value={horaDespertar}
                  onChange={(e) => setHoraDespertar(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
                />
              </Campo>
              <Campo etiqueta="Me acuesto a las">
                <input
                  type="time"
                  value={horaDormir}
                  onChange={(e) => setHoraDormir(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
                />
              </Campo>
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-4">
              <input
                type="checkbox"
                checked={recordatorios}
                onChange={(e) => setRecordatorios(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--color-agua)]"
              />
              <span className="text-sm">
                Quiero que me avise cuando lleve mucho sin tomar agua
                <span className="block text-xs text-[var(--color-texto-suave)]">
                  Nunca entre tus horas de sueño. El permiso se pide después, desde Ajustes.
                </span>
              </span>
            </label>
          </div>
        )}

        {paso === 5 && meta && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--color-agua)]/40 bg-[var(--color-agua)]/10 p-6 text-center">
              <p className="text-sm text-[var(--color-texto-suave)]">Tu meta de agua bebida</p>
              <p className="my-1 text-5xl font-bold text-[var(--color-agua-clara)]">
                {(meta.metaMl / 1000).toFixed(2).replace('.', ',')}
                <span className="ml-1 text-2xl">L</span>
              </p>
              <p className="text-sm text-[var(--color-texto-suave)]">
                {meta.metaMl} ml al día, unos {Math.round(meta.metaMl / 250)} vasos
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5 text-sm">
              <p className="mb-3 font-medium">De dónde sale ese número</p>
              <Renglon texto="Por tu peso y tu edad" ml={meta.baseMl} />
              {meta.extras.map((extra) => (
                <Renglon key={extra.motivo} texto={extra.motivo} ml={extra.ml} />
              ))}
              <p className="mt-3 text-xs leading-relaxed text-[var(--color-texto-suave)]">
                Ya viene descontada la quinta parte del agua que entra con la comida: sopas,
                frutas y verduras también hidratan.
              </p>
            </div>

            {meta.avisos.map((aviso) => (
              <p
                key={aviso}
                className="rounded-2xl border border-[var(--color-alerta)]/40 bg-[var(--color-alerta)]/10 p-4 text-sm text-[var(--color-alerta)]"
              >
                {aviso}
              </p>
            ))}
          </div>
        )}

        {paso === 6 && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--color-texto-suave)]">
              Esta mascota eres tú por dentro. El agua que se le ve adentro es la que llevas
              de verdad.
            </p>
            <div className="flex justify-center">
              <MascotaDibujo
                especie={especie}
                color={color}
                nivel="bien"
                hidratacion={72}
                tamano={200}
              />
            </div>
            <Campo etiqueta="Cómo se va a llamar">
              <input
                type="text"
                value={nombreMascota}
                onChange={(e) => setNombreMascota(e.target.value)}
                placeholder="Ponle nombre"
                maxLength={18}
                className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] px-4 py-3.5 outline-none focus:border-[var(--color-agua)]"
              />
            </Campo>
            <Campo etiqueta="Qué es">
              <div className="grid grid-cols-3 gap-2">
                {ESPECIES.map((e) => (
                  <Opcion key={e.id} activa={especie === e.id} onClick={() => setEspecie(e.id)}>
                    {e.nombre}
                  </Opcion>
                ))}
              </div>
            </Campo>
            <Campo etiqueta="De qué color">
              <div className="flex flex-wrap gap-3">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={`h-11 w-11 rounded-full border-2 transition ${
                      color === c ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Campo>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-[var(--color-peligro)]/12 px-3 py-2 text-sm text-[var(--color-peligro)]">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {paso > 0 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="flex items-center justify-center rounded-2xl border border-[var(--color-borde)] px-5 py-4"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <button
          type="button"
          disabled={!actual.valido || guardando}
          onClick={() => (paso === pasos.length - 1 ? terminar() : setPaso((p) => p + 1))}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-agua-clara)] to-[var(--color-agua)] py-4 font-bold text-[#04121f] transition active:scale-[0.99] disabled:opacity-40"
        >
          {paso === pasos.length - 1 ? (guardando ? 'Creando...' : 'Crear mi mascota') : 'Seguir'}
          {paso < pasos.length - 1 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-[var(--color-texto-suave)]">{etiqueta}</span>
      {children}
    </label>
  )
}

function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-sm transition ${
        activa
          ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/12 font-medium'
          : 'border-[var(--color-borde)] bg-[var(--color-tarjeta)]'
      }`}
    >
      {children}
    </button>
  )
}

function Renglon({ texto, ml }: { texto: string; ml: number }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-borde)]/50 py-1.5 last:border-0">
      <span className="text-[var(--color-texto-suave)]">{texto}</span>
      <span className="font-medium">+{ml} ml</span>
    </div>
  )
}
