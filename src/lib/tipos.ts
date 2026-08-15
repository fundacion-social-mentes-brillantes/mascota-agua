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
  /** Enciende la categoría de cerveza y trago al registrar. Viene APAGADA de
   *  fábrica: quien la necesita la prende, y a los demás la app nunca les
   *  propone alcohol. No existe si el perfil es menor de edad. */
  registrarAlcohol?: boolean
  /** Meta de agua BEBIDA al día, en ml. La calcula src/lib/hidratacion.ts */
  metaMl: number
  /** Meta puesta a mano por la persona; si existe, manda sobre la calculada. */
  metaManualMl?: number
  /** Con qué versión de la fórmula se calculó la meta. Si se queda vieja, la
   *  app la recalcula sola: ver VERSION_META en hidratacion.ts */
  versionMeta?: number
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
  /**
   * Los mililitros de LÍQUIDO que de verdad entraron al cuerpo, ya con el
   * factor de la bebida aplicado. Es lo que llena a la mascota.
   * Los registros viejos (antes de que hubiera bebidas) eran todos agua, así
   * que su `ml` ya es el líquido efectivo y sigue siendo válido.
   */
  ml: number
  /** Lo que cabía en el vaso, antes del factor. Sirve para poder mostrar
   *  "gaseosa de 350 ml → 315 ml de líquido" sin recalcular nada. */
  mlBruto?: number
  /** Cuál bebida era. Si falta, era agua. */
  bebida?: string
  /** Con qué versión del catálogo se calculó, para no reescribir el historial
   *  si algún día se corrige un factor. */
  versionCatalogo?: number
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
  /** Líquido total del día (todas las bebidas, ya con su factor). */
  totalMl: number
  /** Solo el agua. Es lo que decide si se cumplió la meta. */
  aguaMl?: number
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
  /**
   * TODO el líquido del día, ya con el factor de cada bebida. Es lo que llena
   * a la mascota y lo que ven los órganos, porque el cuerpo no pregunta de
   * dónde vino el agua.
   */
  totalHoyMl: number
  /**
   * Solo el agua. Es lo que decide la meta y la racha: el cuerpo lo agradece
   * todo, pero la promesa era de agua.
   */
  aguaHoyMl: number
  /** Líquido que entró con algo distinto al agua (tinto, gaseosa, jugo…). */
  otrasBebidasMl: number
  /** Cafeína acumulada hoy, en mg. Se informa; no descuenta nada. */
  cafeinaHoyMg: number
  /** Cerveza y trago del día, en ml de bebida (no de alcohol puro). */
  alcoholHoyMl: number
  metaMl: number
  /** De la META, o sea del agua. Es el número de la medalla. */
  porcentaje: number
  /** Del líquido total contra la meta. Es lo que se le ve al cuerpo. */
  porcentajeLiquido: number
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
