import { useEffect, useState } from 'react'
import { Bell, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { salir, type User } from '../lib/firebase'
import { borrarChat, borrarTodo, guardarPerfil } from '../lib/almacen'
import {
  consultaEncendida,
  cuantosCodigosAprendidos,
  olvidarCodigos,
  ponerConsulta,
} from '../lib/productos'
import { borrarTodasLasFotos, contarFotos } from '../lib/fotos'
import { calcularMeta, VERSION_META } from '../lib/hidratacion'
import { evaluarImc, fraseMundial } from '../lib/imc'
import { estadoDeLosAvisos } from '../lib/recordatorios'
import { estaSuscrito, suscribirAvisos } from '../lib/push'
import MascotaDibujo from '../componentes/MascotaViva'
import type { Actividad, Clima, EspecieMascota, Mascota, Perfil } from '../lib/tipos'

const ACTIVIDADES: { id: Actividad; titulo: string }[] = [
  { id: 'poca', titulo: 'Poca' },
  { id: 'moderada', titulo: 'Moderada' },
  { id: 'alta', titulo: 'Alta' },
  { id: 'muy-alta', titulo: 'Muy alta' },
]

const CLIMAS: { id: Clima; titulo: string }[] = [
  { id: 'frio', titulo: 'Frío' },
  { id: 'templado', titulo: 'Templado' },
  { id: 'calor', titulo: 'Caliente y seco' },
  { id: 'calor-humedo', titulo: 'Caliente y húmedo' },
]

const ESPECIES: { id: EspecieMascota; nombre: string }[] = [
  { id: 'gota', nombre: 'Gota' },
  { id: 'axolote', nombre: 'Axolote' },
  { id: 'pulpo', nombre: 'Pulpo' },
  { id: 'tortuga', nombre: 'Tortuga' },
  { id: 'nube', nombre: 'Nube' },
]

const COLORES = ['#35b6f0', '#5ee0a8', '#ff8fb1', '#c79bff', '#ffd166', '#ff8b5e']

export default function Ajustes({
  uid,
  usuario,
  perfil,
  mascota,
  alGuardarMascota,
}: {
  uid: string
  usuario: User
  perfil: Perfil
  mascota: Mascota
  alGuardarMascota: (mascota: Mascota) => Promise<void>
}) {
  const [peso, setPeso] = useState(String(perfil.pesoKg))
  const [altura, setAltura] = useState(String(perfil.alturaCm))
  const [actividad, setActividad] = useState(perfil.actividad)
  const [clima, setClima] = useState(perfil.clima)
  const [altitudAlta, setAltitudAlta] = useState(perfil.altitudAlta)
  const [metaManual, setMetaManual] = useState(String(perfil.metaManualMl ?? ''))
  const [despertar, setDespertar] = useState(perfil.horaDespertar)
  const [dormir, setDormir] = useState(perfil.horaDormir)
  const [avisos, setAvisos] = useState(perfil.recordatoriosActivos)
  const [alcohol, setAlcohol] = useState(Boolean(perfil.registrarAlcohol))
  // El interruptor del lector vive en el TELEFONO, no en el perfil: es una
  // decision sobre lo que sale de este aparato, no sobre la persona.
  const [consultar, setConsultar] = useState(consultaEncendida)
  const [aprendidos, setAprendidos] = useState(cuantosCodigosAprendidos)
  const [, setPermiso] = useState(estadoDeLosAvisos())
  const [fotos, setFotos] = useState(0)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const [nombreMascota, setNombreMascota] = useState(mascota.nombre)
  const [suscrito, setSuscrito] = useState(false)
  const [ocupadoAvisos, setOcupadoAvisos] = useState(false)

  useEffect(() => {
    estaSuscrito().then(setSuscrito)
  }, [])

  useEffect(() => {
    contarFotos().then(setFotos)
  }, [])

  const pesoNum = Number.parseFloat(peso.replace(',', '.'))
  const alturaNum = Number.parseFloat(altura.replace(',', '.'))
  const imc =
    Number.isFinite(pesoNum) && Number.isFinite(alturaNum) && alturaNum >= 80
      ? evaluarImc(pesoNum, alturaNum, perfil.sexo, perfil.edad)
      : null

  async function guardar() {
    if (!Number.isFinite(pesoNum) || !Number.isFinite(alturaNum)) {
      setMensaje('Revisa el peso y la altura: tienen que ser números.')
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      const calculada = calcularMeta({
        edad: perfil.edad,
        sexo: perfil.sexo,
        pesoKg: pesoNum,
        actividad,
        clima,
        altitudAlta,
        etapa: perfil.etapa,
        condiciones: perfil.condiciones,
      })
      const manual = Number.parseInt(metaManual, 10)
      const usaManual = Number.isFinite(manual) && manual >= 500 && manual <= 5000
      await guardarPerfil(
        uid,
        {
          ...perfil,
          pesoKg: pesoNum,
          alturaCm: alturaNum,
          actividad,
          clima,
          altitudAlta,
          horaDespertar: despertar,
          horaDormir: dormir,
          recordatoriosActivos: avisos,
          registrarAlcohol: alcohol,
          metaMl: usaManual ? manual : calculada.metaMl,
          versionMeta: VERSION_META,
          ...(usaManual ? { metaManualMl: manual } : {}),
        },
        // Si el campo queda vacío, se borra la meta a mano y vuelve la calculada.
        { quitarMetaManual: !usaManual },
      )
      const nombreLimpio = nombreMascota.trim()
      if (nombreLimpio && nombreLimpio !== mascota.nombre) {
        await alGuardarMascota({ ...mascota, nombre: nombreLimpio })
      }
      setMensaje('Guardado.')
    } catch {
      setMensaje('No se pudo guardar. Revisa tu conexión.')
    } finally {
      setGuardando(false)
    }
  }

  async function activarAvisos() {
    setOcupadoAvisos(true)
    setMensaje(null)
    try {
      const resultado = await suscribirAvisos(uid)
      setPermiso(estadoDeLosAvisos())
      if (resultado.ok) {
        setSuscrito(true)
        setAvisos(true)
        await guardarPerfil(uid, { ...perfil, recordatoriosActivos: true })
        // Un aviso de prueba ahí mismo, para que se vea cómo llega.
        new Notification(`${mascota.nombre} ya te puede avisar`, {
          body: 'Así se van a ver los avisos cuando tenga sed.',
          icon: '/icons/icon-192.png',
        })
        setMensaje('Listo. Este teléfono ya recibe los avisos.')
      } else if (resultado.motivo === 'sin-permiso') {
        setMensaje(
          'El navegador tiene bloqueados los avisos para esta app. Hay que permitirlos desde la configuración del navegador.',
        )
      } else if (resultado.motivo === 'sin-soporte') {
        setMensaje(
          'Este navegador no permite avisos. En iPhone hay que agregar la app a la pantalla de inicio primero.',
        )
      } else {
        setMensaje('No se pudo activar. Intenta otra vez.')
      }
    } finally {
      setOcupadoAvisos(false)
    }
  }

  async function borrarLasFotos() {
    await borrarTodasLasFotos()
    setFotos(0)
    setMensaje('Fotos borradas de este teléfono.')
  }

  async function borrarLaCuenta() {
    setGuardando(true)
    try {
      await borrarTodo(uid)
      await borrarTodasLasFotos()
      await salir()
    } catch {
      setMensaje('No se pudo borrar todo. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pt-5 pb-6">
      <h1 className="mb-4 font-[family-name:var(--font-titulo)] text-xl font-bold">Ajustes</h1>

      <div className="mb-5 flex items-center gap-3 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-4">
        {usuario.photoURL ? (
          <img src={usuario.photoURL} alt="" className="h-11 w-11 rounded-full" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-agua)]/20">
            {perfil.nombre.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{perfil.nombre}</p>
          <p className="truncate text-xs text-[var(--color-texto-suave)]">{usuario.email}</p>
        </div>
        <button
          type="button"
          onClick={() => salir()}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--color-borde)] px-3 py-2 text-xs"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>

      <Bloque titulo="Tu mascota">
        <div className="mb-4 flex justify-center">
          <MascotaDibujo
            especie={mascota.especie}
            color={mascota.color}
            nivel="bien"
            hidratacion={72}
            sombrero={mascota.sombrero}
            accesorio={mascota.accesorio}
            tamano={150}
          />
        </div>
        <Campo etiqueta="Cómo se llama">
          <input
            type="text"
            value={nombreMascota}
            onChange={(e) => setNombreMascota(e.target.value)}
            maxLength={18}
            className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none focus:border-[var(--color-agua)]"
          />
        </Campo>
        <p className="mt-4 mb-2 text-xs text-[var(--color-texto-suave)]">Qué es</p>
        <div className="grid grid-cols-3 gap-2">
          {ESPECIES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => alGuardarMascota({ ...mascota, especie: e.id })}
              className={`rounded-2xl border px-3 py-2.5 text-sm transition ${
                mascota.especie === e.id
                  ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/12 font-medium'
                  : 'border-[var(--color-borde)] bg-[var(--color-fondo-2)]'
              }`}
            >
              {e.nombre}
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 text-xs text-[var(--color-texto-suave)]">De qué color</p>
        <div className="flex flex-wrap gap-3">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => alGuardarMascota({ ...mascota, color: c })}
              aria-label={`Color ${c}`}
              className={`h-10 w-10 rounded-full border-2 transition ${
                mascota.color === c ? 'scale-110 border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {(mascota.sombrero || mascota.accesorio) && (
          <button
            type="button"
            onClick={() => alGuardarMascota({ ...mascota, sombrero: null, accesorio: null })}
            className="mt-4 w-full rounded-2xl border border-[var(--color-borde)] py-2.5 text-xs"
          >
            Quitarle lo que tiene puesto
          </button>
        )}
      </Bloque>

      <Bloque titulo="Tu cuerpo">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Peso (kg)">
            <input
              type="number"
              inputMode="decimal"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none focus:border-[var(--color-agua)]"
            />
          </Campo>
          <Campo etiqueta="Altura (cm)">
            <input
              type="number"
              inputMode="decimal"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none focus:border-[var(--color-agua)]"
            />
          </Campo>
        </div>
        {imc && (
          <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
            IMC {imc.imc} · {imc.etiqueta}. {fraseMundial(imc.percentilMundial)}
          </p>
        )}
      </Bloque>

      <Bloque titulo="Cómo es tu día">
        <p className="mb-2 text-xs text-[var(--color-texto-suave)]">Actividad física</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {ACTIVIDADES.map((a) => (
            <Opcion key={a.id} activa={actividad === a.id} onClick={() => setActividad(a.id)}>
              {a.titulo}
            </Opcion>
          ))}
        </div>
        <p className="mb-2 text-xs text-[var(--color-texto-suave)]">Clima donde vives</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {CLIMAS.map((c) => (
            <Opcion key={c.id} activa={clima === c.id} onClick={() => setClima(c.id)}>
              {c.titulo}
            </Opcion>
          ))}
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-[var(--color-fondo-2)] p-3.5">
          <input
            type="checkbox"
            checked={altitudAlta}
            onChange={(e) => setAltitudAlta(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[var(--color-agua)]"
          />
          <span className="text-sm">
            Vivo a más de 2.000 metros de altura
            <span className="block text-xs text-[var(--color-texto-suave)]">
              Bogotá, Tunja, Pasto, Manizales.
            </span>
          </span>
        </label>
        <p className="mt-3 text-xs text-[var(--color-texto-suave)]">
          Al guardar, la meta se vuelve a calcular con esto.
        </p>
      </Bloque>

      <Bloque titulo="Tu meta de agua">
        <p className="mb-3 text-sm">
          Ahora mismo: <strong className="text-[var(--color-agua-clara)]">{perfil.metaMl} ml</strong>{' '}
          al día
          {perfil.metaManualMl ? ' (puesta a mano)' : ' (calculada)'}
        </p>
        <Campo etiqueta="Ponerla a mano (deja vacío para que la calcule sola)">
          <input
            type="number"
            inputMode="numeric"
            value={metaManual}
            onChange={(e) => setMetaManual(e.target.value)}
            placeholder="Ej: 2200"
            className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none focus:border-[var(--color-agua)]"
          />
        </Campo>
        <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
          Entre 500 y 5.000 ml. Por encima de 4.000 al día, sin ejercicio fuerte ni calor
          extremo, ya no es mejor: es riesgo de diluir el sodio de la sangre.
        </p>
      </Bloque>

      {/* Lo que sale del telefono cuando se escanea un empaque. Se dice con
          todas las letras que viajan 13 digitos y nada mas. */}
      <Bloque titulo="El lector de empaques">
        <label className="flex items-start gap-3 rounded-2xl bg-[var(--color-fondo-2)] p-3.5">
          <input
            type="checkbox"
            checked={consultar}
            onChange={(e) => {
              setConsultar(e.target.checked)
              ponerConsulta(e.target.checked)
            }}
            className="mt-0.5 h-5 w-5 accent-[var(--color-agua)]"
          />
          <span className="text-sm">
            Buscar el producto en internet al escanear
            <span className="mt-1 block text-xs leading-relaxed text-[var(--color-texto-suave)]">
              Salen solo los 13 dígitos del código, a un catálogo abierto y gratuito de
              productos. Nunca tu nombre, ni dónde estás, ni ninguna foto. Si lo apagas, el
              lector solo reconoce los empaques que tú mismo ya le enseñaste.
            </span>
          </span>
        </label>
        {aprendidos > 0 && (
          <button
            type="button"
            onClick={() => {
              olvidarCodigos()
              setAprendidos(0)
              setMensaje('Listo, olvidé los empaques.')
            }}
            className="mt-3 w-full rounded-2xl border border-[var(--color-borde)] py-3 text-sm text-[var(--color-texto-suave)]"
          >
            Este teléfono se aprendió {aprendidos}{' '}
            {aprendidos === 1 ? 'empaque' : 'empaques'} · Olvidarlos
          </button>
        )}
      </Bloque>

      {/* El alcohol viene APAGADO de fabrica: quien lo necesita lo prende, y a
          los demas la app nunca les propone una cerveza. Para menores de edad
          la opcion no existe, sin sermon. */}
      {perfil.edad >= 18 && (
        <Bloque titulo="Qué puedo registrar">
          <label className="flex items-start gap-3 rounded-2xl bg-[var(--color-fondo-2)] p-3.5">
            <input
              type="checkbox"
              checked={alcohol}
              onChange={(e) => setAlcohol(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[var(--color-agua)]"
            />
            <span className="text-sm">
              Poder registrar cerveza y trago
              <span className="mt-1 block text-xs leading-relaxed text-[var(--color-texto-suave)]">
                Una cerveza es casi toda agua y no te deshidrata, así que su
                líquido cuenta para tu cuerpo. Nunca cuenta para la meta ni para
                la racha, y la app nunca te va a proponer una.
              </span>
            </span>
          </label>
        </Bloque>
      )}

      <Bloque titulo="Horarios y avisos">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Campo etiqueta="Me levanto">
            <input
              type="time"
              value={despertar}
              onChange={(e) => setDespertar(e.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none"
            />
          </Campo>
          <Campo etiqueta="Me acuesto">
            <input
              type="time"
              value={dormir}
              onChange={(e) => setDormir(e.target.value)}
              className="w-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 outline-none"
            />
          </Campo>
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-fondo-2)] p-3.5">
          <input
            type="checkbox"
            checked={avisos}
            onChange={(e) => setAvisos(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-agua)]"
          />
          <span className="text-sm">Avisarme cuando lleve mucho sin tomar agua</span>
        </label>
        <button
          type="button"
          onClick={activarAvisos}
          disabled={ocupadoAvisos}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm disabled:opacity-60 ${
            suscrito
              ? 'border-[var(--color-logro)]/50 bg-[var(--color-logro)]/10 text-[var(--color-logro)]'
              : 'border-[var(--color-agua)]/50 bg-[var(--color-agua)]/10'
          }`}
        >
          <Bell size={16} />
          {ocupadoAvisos
            ? 'Un momento...'
            : suscrito
              ? 'Este teléfono ya recibe los avisos · tocar para probar'
              : 'Activar los avisos en este teléfono'}
        </button>
        <p className="mt-2 text-xs text-[var(--color-texto-suave)]">
          Con esto la mascota te escribe aunque la app esté cerrada. En iPhone solo
          funciona si primero agregas la app a la pantalla de inicio (compartir → Agregar
          a inicio).
        </p>
      </Bloque>

      <Bloque titulo="Tus fotos y tus datos">
        <div className="mb-3 flex items-start gap-3 rounded-2xl bg-[var(--color-fondo-2)] p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--color-logro)]" />
          <p className="text-xs leading-relaxed text-[var(--color-texto-suave)]">
            Tienes {fotos} {fotos === 1 ? 'foto guardada' : 'fotos guardadas'} en este teléfono.
            Nunca salieron de aquí: no hay copia en ningún servidor.
          </p>
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={borrarLasFotos}
            className="rounded-2xl border border-[var(--color-borde)] py-3 text-sm"
          >
            Borrar las fotos de este teléfono
          </button>
          <button
            type="button"
            onClick={() => borrarChat(uid).then(() => setMensaje('Conversación borrada.'))}
            className="rounded-2xl border border-[var(--color-borde)] py-3 text-sm"
          >
            Borrar la conversación con {mascota.nombre}
          </button>
          {confirmarBorrado ? (
            <div className="rounded-2xl border border-[var(--color-peligro)]/50 bg-[var(--color-peligro)]/10 p-4">
              <p className="mb-3 text-sm text-[var(--color-peligro)]">
                Esto borra tu perfil, tu mascota y todo tu historial de agua. No se puede
                deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmarBorrado(false)}
                  className="flex-1 rounded-xl border border-[var(--color-borde)] py-2.5 text-sm"
                >
                  Mejor no
                </button>
                <button
                  type="button"
                  onClick={borrarLaCuenta}
                  disabled={guardando}
                  className="flex-1 rounded-xl bg-[var(--color-peligro)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  Sí, borrar todo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-peligro)]/40 py-3 text-sm text-[var(--color-peligro)]"
            >
              <Trash2 size={15} />
              Borrar todos mis datos
            </button>
          )}
        </div>
      </Bloque>

      {mensaje && (
        <p className="mb-4 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo-2)] px-4 py-3 text-sm">
          {mensaje}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full rounded-2xl bg-gradient-to-r from-[var(--color-agua-clara)] to-[var(--color-agua)] py-4 font-bold text-[#04121f] disabled:opacity-60"
      >
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>

      <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-texto-suave)]/70">
        Mascota de Agua no da diagnósticos ni reemplaza a un profesional de la salud.
        <br />
        Gimnasio Emocional Mentes Brillantes
      </p>
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-5">
      <h2 className="mb-3 text-sm font-bold">{titulo}</h2>
      {children}
    </section>
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
      className={`rounded-2xl border px-3 py-2.5 text-sm transition ${
        activa
          ? 'border-[var(--color-agua)] bg-[var(--color-agua)]/12 font-medium'
          : 'border-[var(--color-borde)] bg-[var(--color-fondo-2)]'
      }`}
    >
      {children}
    </button>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-[var(--color-texto-suave)]">{etiqueta}</span>
      {children}
    </label>
  )
}
