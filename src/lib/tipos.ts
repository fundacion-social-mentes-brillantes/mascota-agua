// Todos los datos que maneja la app, en un solo lugar.

export type Sexo = 'mujer' | 'hombre' | 'sin-decir'

export type Actividad = 'poca' | 'moderada' | 'alta' | 'muy-alta'

export type Clima = 'frio' | 'templado' | 'calor' | 'calor-humedo'

export type Etapa = 'ninguna' | 'embarazo' | 'lactancia'

/** Condiciones en las que NO se debe subir el agua sin permiso del medico. */
export type CondicionDelicada =
  | 'rinon'
  | 'corazon'
  | 'higado'
  | 'diuretico'
  | 'restriccion'
  | 'otra'

export interface Perfil {
  nombre: string
  edad: number
  sexo: Sexo
  pesoKg: number
  alturaCm: number
  actividad: Actividad
  clima: Clima
  altitudAlta: boolean
  etapa: Etapa
  condiciones: CondicionDelicada[]
  /** Marcó alguna condición delicada: la app baja el tono y no empuja a beber más. */
  requiereMedico: boolean
  horaDespertar: string // "06:30"
  horaDormir: string // "22:30"
  recordatoriosActivos: boolean
  /** Meta de agua BEBIDA al día, en ml. La calcula src/lib/hidratacion.ts */
  metaMl: number
  /** Meta puesta a mano por la persona; si existe, manda sobre la calculada. */
  metaManualMl?: number
  creado: number
  actualizado: number
}

export type EspecieMascota = 'gota' | 'axolote' | 'pulpo' | 'tortuga' | 'nube'

export interface Mascota {
  nombre: string
  especie: EspecieMascota
  color: string
  sombrero: string | null
  accesorio: string | null
  /** Moneda del juego: se gana tomando agua y registrando con foto. */
  gotas: number
  xp: number
  nivel: number
  /** Última vez que comió, en milisegundos. */
  ultimaComida: number
  comprados: string[]
}

export type Recipiente = 'vaso' | 'pocillo' | 'botella' | 'botellon' | 'termo' | 'otro'

export type EstadoVerificacion = 'sin-foto' | 'con-foto' | 'confirmado' | 'dudoso'

export interface Registro {
  id: string
  /** Mililitros de agua. */
  ml: number
  recipiente: Recipiente
  /** Momento del trago, en milisegundos. */
  hora: number
  /** Día local en formato AAAA-MM-DD, para agrupar sin líos de zona horaria. */
  dia: string
  verificacion: EstadoVerificacion
  /** Lo que dijo el revisor de la foto, si se usó. */
  notaFoto?: string
  /** La foto vive en el teléfono (IndexedDB), nunca se sube a la nube. */
  tieneFotoLocal: boolean
}

export interface ResumenDia {
  dia: string
  totalMl: number
  metaMl: number
  tragos: number
  conFoto: number
}

export interface MensajeChat {
  id: string
  de: 'persona' | 'mascota'
  texto: string
  hora: number
}

/** Lo que la mascota sabe de ti cuando habla. */
export interface EstadoCuerpo {
  /** Horas desde el último trago (Infinity si no hay ninguno hoy). */
  horasSinBeber: number
  totalHoyMl: number
  metaMl: number
  porcentaje: number
  /** De 0 (seco) a 100 (bien hidratado). Es lo que muestra la mascota. */
  hidratacion: number
  /** Lo bebido en los ultimos 60 minutos: sirve para frenar los excesos. */
  mlUltimaHora: number
  nivel: NivelCuerpo
  titulo: string
  /** Qué está pasando de verdad en el cuerpo, con el dato detrás. */
  loQuePasa: string[]
  /** Aviso cuando se está bebiendo demasiado rápido. */
  alertaExceso: string | null
}

export type NivelCuerpo = 'pleno' | 'bien' | 'atento' | 'bajo' | 'critico'
