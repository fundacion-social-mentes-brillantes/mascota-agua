import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth'
import { HeartPulse, Home, LineChart, Settings, ShoppingBag } from 'lucide-react'
import { firebaseConfigurado, obtenerAuth, type User } from './lib/firebase'
import {
  diaDe,
  escucharMascota,
  escucharPerfil,
  escucharRegistrosDelDia,
  guardarMascota,
  leerHistorico,
} from './lib/almacen'
import { calcularEstadoCuerpo } from './lib/hidratacion'
import { describirCuerpo } from './lib/frases'
import type { Mascota, Perfil, Registro, ResumenDia } from './lib/tipos'
import Entrar from './pantallas/Entrar'
import Bienvenida from './pantallas/Bienvenida'
import Casa from './pantallas/Casa'
import Linea from './pantallas/Linea'
import Cuerpo from './pantallas/Cuerpo'
import Tienda from './pantallas/Tienda'
import Ajustes from './pantallas/Ajustes'
import RegistrarAgua from './componentes/RegistrarAgua'
import Cargando from './componentes/Cargando'
import { useRecordatorios } from './lib/recordatorios'
import { sincronizarAvisos } from './lib/push'

type Seccion = 'casa' | 'linea' | 'cuerpo' | 'tienda' | 'ajustes'

const PESTANAS: { id: Seccion; texto: string; Icono: typeof Home }[] = [
  { id: 'casa', texto: 'Mascota', Icono: Home },
  { id: 'linea', texto: 'Mi agua', Icono: LineChart },
  { id: 'cuerpo', texto: 'Mi cuerpo', Icono: HeartPulse },
  { id: 'tienda', texto: 'Tienda', Icono: ShoppingBag },
  { id: 'ajustes', texto: 'Ajustes', Icono: Settings },
]

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
      totalHoyMl: estado.totalHoyMl,
      dia,
      ultimoTrago: ultimo || null,
      nombreMascota: mascota.nombre,
    })
  }, [usuario, perfil, mascota, estado, registros, dia])

  const { ayer, racha } = useMemo(() => {
    const hoy = diaDe()
    const anteriores = historico.filter((d) => d.dia !== hoy)
    let seguidos = 0
    for (const d of anteriores) {
      if (d.metaMl > 0 && d.totalMl >= d.metaMl) seguidos += 1
      else break
    }
    return { ayer: anteriores[0] ?? null, racha: seguidos }
  }, [historico])

  useRecordatorios(perfil, estado, mascota?.nombre ?? 'Tu mascota')

  const todoListo = perfilCargadoDe === usuario?.uid && mascotaCargadaDe === usuario?.uid

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
          {PESTANAS.map(({ id, texto, Icono }) => {
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
          estado={estado}
          alCerrar={() => setRegistrando(false)}
        />
      )}
    </div>
  )
}
