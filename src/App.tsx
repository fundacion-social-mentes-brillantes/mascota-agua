import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { HeartPulse, Home, LineChart, Settings, ShieldCheck, ShoppingBag } from 'lucide-react'
import { firebaseConfigurado, obtenerAuth, type User } from './lib/firebase'
import {
  diaDe,
  escucharMascota,
  escucharPerfil,
  escucharRegistrosDelDia,
  guardarMascota,
  guardarPerfil,
  leerHistorico,
  leerRegistrosRecientes,
} from './lib/almacen'
import { calcularEstadoCuerpo, calcularMeta, VERSION_META } from './lib/hidratacion'
import { describirCuerpo } from './lib/frases'
import type { Mascota, Perfil, Registro, ResumenDia } from './lib/tipos'
import Entrar from './pantallas/Entrar'
import Bienvenida from './pantallas/Bienvenida'
import Casa from './pantallas/Casa'
import Linea from './pantallas/Linea'
import Cuerpo from './pantallas/Cuerpo'
import Tienda from './pantallas/Tienda'
import Ajustes from './pantallas/Ajustes'
import Admin from './pantallas/Admin'
import RegistrarAgua from './componentes/RegistrarAgua'
import Cargando from './componentes/Cargando'
import { useRecordatorios } from './lib/recordatorios'
import { sincronizarAvisos } from './lib/push'
import { loDeSiempre } from './lib/sugerencias'

type Seccion = 'casa' | 'linea' | 'cuerpo' | 'tienda' | 'ajustes' | 'panel'

/** El correo de la Fundacion ve una pestana mas. El candado de verdad no es
 *  esta pestana sino /api/admin, que comprueba el correo contra Google: aqui
 *  solo se decide si se DIBUJA o no. */
const CORREO_ADMIN = 'fundacionsocial@gimnasioemocionalmb.com'

const PESTANAS: { id: Seccion; texto: string; Icono: typeof Home }[] = [
  { id: 'casa', texto: 'Mascota', Icono: Home },
  { id: 'linea', texto: 'Mi agua', Icono: LineChart },
  { id: 'cuerpo', texto: 'Mi cuerpo', Icono: HeartPulse },
  { id: 'tienda', texto: 'Tienda', Icono: ShoppingBag },
  { id: 'ajustes', texto: 'Ajustes', Icono: Settings },
]

const PESTANA_PANEL = { id: 'panel' as const, texto: 'Panel', Icono: ShieldCheck }

export default function App() {
  const [usuario, setUsuario] = useState<User | null>(null)
  // Si falta la configuracion no hay nada que revisar: arranca en false.
  const [revisandoSesion, setRevisandoSesion] = useState(firebaseConfigurado)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [mascota, setMascota] = useState<Mascota | null>(null)
  /** De quien son el perfil y la mascota que ya llegaron. Asi se sabe si
   *  estan listos sin tener que apagar una bandera dentro del efecto, y sobre
   *  todo: no se le muestra el cuestionario de bienvenida a alguien que ya lo
   *  hizo solo porque su mascota todavia venia en camino. */
  const [perfilCargadoDe, setPerfilCargadoDe] = useState<string | null>(null)
  const [mascotaCargadaDe, setMascotaCargadaDe] = useState<string | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [seccion, setSeccion] = useState<Seccion>('casa')
  const [registrando, setRegistrando] = useState(false)
  const [dia, setDia] = useState(() => diaDe())
  // Se usa para volver a calcular el estado del cuerpo cada minuto sin
  // depender de que la persona toque algo.
  const [, setLatido] = useState(0)

  // Entrada por redireccion (celulares que bloquean la ventana emergente).
  useEffect(() => {
    if (!firebaseConfigurado) return
    getRedirectResult(obtenerAuth()).catch(() => {
      /* si no habia redireccion pendiente, no pasa nada */
    })
  }, [])

  useEffect(() => {
    if (!firebaseConfigurado) return
    return onAuthStateChanged(obtenerAuth(), (quien) => {
      setUsuario(quien)
      setRevisandoSesion(false)
      if (!quien) {
        setPerfil(null)
        setMascota(null)
        setPerfilCargadoDe(null)
        setMascotaCargadaDe(null)
        setRegistros([])
      }
    })
  }, [])

  useEffect(() => {
    if (!usuario) return
    const soltarPerfil = escucharPerfil(usuario.uid, (nuevo) => {
      setPerfil(nuevo)
      setPerfilCargadoDe(usuario.uid)
    })
    const soltarMascota = escucharMascota(usuario.uid, (nueva) => {
      setMascota(nueva)
      setMascotaCargadaDe(usuario.uid)
    })
    return () => {
      soltarPerfil()
      soltarMascota()
    }
  }, [usuario])

  useEffect(() => {
    if (!usuario) return
    return escucharRegistrosDelDia(usuario.uid, dia, setRegistros)
  }, [usuario, dia])

  // El reloj de la app: refresca el estado y cambia de día a la medianoche.
  useEffect(() => {
    const reloj = window.setInterval(() => {
      setLatido((n) => n + 1)
      const hoy = diaDe()
      setDia((anterior) => (anterior === hoy ? anterior : hoy))
    }, 60_000)
    return () => window.clearInterval(reloj)
  }, [])

  const estado = useMemo(() => {
    if (!perfil) return null
    const base = calcularEstadoCuerpo(perfil, registros)
    return { ...base, loQuePasa: describirCuerpo(base) }
  }, [perfil, registros])

  // Si la FORMULA de la meta cambio desde que esta persona se registro, se
  // recalcula sola. Sin esto, a quien ya tenia cuenta le quedaria para siempre
  // la meta vieja -- y cuando se corrige un numero de salud, eso importa.
  // No se toca si la puso a mano: esa decision es suya.
  useEffect(() => {
    if (!usuario || !perfil) return
    if (perfil.metaManualMl) return
    if (perfil.versionMeta === VERSION_META) return
    const nueva = calcularMeta(perfil).metaMl
    void guardarPerfil(usuario.uid, {
      ...perfil,
      metaMl: nueva,
      versionMeta: VERSION_META,
    }).catch(() => {})
  }, [usuario, perfil])

  // Lo que esta persona repite, para los botones de un toque. Se lee una vez
  // al entrar y cuando cambia el dia: no hace falta mas.
  const [recientes, setRecientes] = useState<Registro[]>([])
  useEffect(() => {
    if (!usuario) return
    let vivo = true
    leerRegistrosRecientes(usuario.uid, 14)
      .then((lista) => {
        if (vivo) setRecientes(lista)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [usuario, dia])

  const sugerencias = useMemo(() => loDeSiempre(recientes), [recientes])

  // El historial sirve para que la mascota se acuerde de ayer y de la racha.
  const [historico, setHistorico] = useState<ResumenDia[]>([])
  useEffect(() => {
    if (!usuario) return
    let vivo = true
    leerHistorico(usuario.uid, 30)
      .then((dias) => {
        if (vivo) setHistorico(dias)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [usuario, dia])

  // Le deja al servidor lo justo para saber si mandar un "tengo sed".
  useEffect(() => {
    if (!usuario || !perfil || !mascota || !estado) return
    const ultimo = registros.reduce((mayor, r) => Math.max(mayor, r.hora), 0)
    sincronizarAvisos(usuario.uid, {
      activo: perfil.recordatoriosActivos,
      horaDespertar: perfil.horaDespertar,
      horaDormir: perfil.horaDormir,
      metaMl: perfil.metaMl,
      pesoKg: perfil.pesoKg,
      totalHoyMl: estado.totalHoyMl,
      aguaHoyMl: estado.aguaHoyMl,
      dia,
      ultimoTrago: ultimo || null,
      nombreMascota: mascota.nombre,
    })
  }, [usuario, perfil, mascota, estado, registros, dia])

  // LA RACHA ES DE REGISTRAR, NO DE CUMPLIR. Es la pieza que hace que ser
  // honesto no cueste nada: si hoy solo tomo gaseosa y lo anoto, la racha
  // sigue viva. La medalla del agua si se pierde, y con eso basta. Si la
  // racha se rompiera por no cumplir, lo racional seria dejar de registrar
  // los dias malos -- que son justo los que la app necesita ver.
  const { ayer, racha } = useMemo(() => {
    const hoy = diaDe()
    const anteriores = historico.filter((d) => d.dia !== hoy)
    let seguidos = 0
    for (const d of anteriores) {
      if (d.tragos > 0) seguidos += 1
      else break
    }
    return { ayer: anteriores[0] ?? null, racha: seguidos }
  }, [historico])

  useRecordatorios(perfil, estado, mascota?.nombre ?? 'Tu mascota')

  const todoListo = perfilCargadoDe === usuario?.uid && mascotaCargadaDe === usuario?.uid
  const esAdmin = (usuario?.email ?? '').toLowerCase() === CORREO_ADMIN

  const alGuardarMascota = useCallback(
    async (nueva: Mascota) => {
      if (!usuario) return
      await guardarMascota(usuario.uid, nueva)
    },
    [usuario],
  )

  // Al cambiar de pestana, la pantalla nueva empieza arriba.
  const contenido = useRef<HTMLElement>(null)
  useEffect(() => {
    contenido.current?.scrollTo({ top: 0 })
  }, [seccion])

  // Evita que dos toques seguidos abran dos veces el registro.
  const abriendo = useRef(false)
  const abrirRegistro = useCallback(() => {
    if (abriendo.current) return
    abriendo.current = true
    setRegistrando(true)
    window.setTimeout(() => {
      abriendo.current = false
    }, 400)
  }, [])

  if (!firebaseConfigurado) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center">
        <div className="max-w-sm rounded-3xl border border-[var(--color-borde)] bg-[var(--color-tarjeta)] p-6">
          <h1 className="mb-2 text-xl font-bold">Falta la configuración</h1>
          <p className="text-sm text-[var(--color-texto-suave)]">
            El archivo <code>.env.local</code> no tiene los datos de Firebase. Copia{' '}
            <code>.env.example</code>, pega los valores del proyecto y vuelve a arrancar.
          </p>
        </div>
      </div>
    )
  }

  if (revisandoSesion) return <Cargando texto="Buscando tu sesión" />
  if (!usuario) return <Entrar />
  if (!todoListo) return <Cargando texto="Trayendo tu mascota" />
  if (!perfil || !mascota) {
    return <Bienvenida usuario={usuario} perfilPrevio={perfil} mascotaPrevia={mascota} />
  }
  if (!estado) return <Cargando texto="Calculando" />

  return (
    // h-full (no min-h-full): asi el que se desplaza es <main> y no la
    // ventana entera, que es lo que deja la barra de abajo siempre fija.
    <div className="flex h-full flex-col bg-[var(--color-fondo)]">
      <main ref={contenido} className="sin-barra zona-segura-arriba flex-1 overflow-y-auto pb-24">
        {seccion === 'casa' && (
          <Casa
            perfil={perfil}
            mascota={mascota}
            estado={estado}
            registros={registros}
            ayer={ayer}
            racha={racha}
            uid={usuario.uid}
            sugerencias={sugerencias}
            alRegistrar={abrirRegistro}
          />
        )}
        {seccion === 'linea' && (
          <Linea uid={usuario.uid} perfil={perfil} registros={registros} estado={estado} />
        )}
        {seccion === 'cuerpo' && <Cuerpo perfil={perfil} estado={estado} />}
        {seccion === 'tienda' && (
          <Tienda mascota={mascota} alGuardar={alGuardarMascota} />
        )}
        {seccion === 'panel' && <Admin />}
        {seccion === 'ajustes' && (
          <Ajustes
            uid={usuario.uid}
            usuario={usuario}
            perfil={perfil}
            mascota={mascota}
            alGuardarMascota={alGuardarMascota}
          />
        )}
      </main>

      <nav className="zona-segura-abajo fixed inset-x-0 bottom-0 border-t border-[var(--color-borde)] bg-[var(--color-fondo-2)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
          {(esAdmin ? [...PESTANAS, PESTANA_PANEL] : PESTANAS).map(({ id, texto, Icono }) => {
            const activa = seccion === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSeccion(id)}
                aria-current={activa ? 'page' : undefined}
                className={`flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] transition ${
                  activa
                    ? 'bg-[var(--color-agua)]/15 text-[var(--color-agua-clara)]'
                    : 'text-[var(--color-texto-suave)]'
                }`}
              >
                <Icono size={20} strokeWidth={activa ? 2.4 : 1.8} />
                {texto}
              </button>
            )
          })}
        </div>
      </nav>

      {registrando && (
        <RegistrarAgua
          uid={usuario.uid}
          perfil={perfil}
          mascota={mascota}
          registros={registros}
          alCerrar={() => setRegistrando(false)}
        />
      )}
    </div>
  )
}
