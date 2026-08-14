// De un codigo de barras a una bebida.
//
// TRES REGLAS QUE NO SE ROMPEN:
//
// 1. El lector PROPONE, la persona CONFIRMA. Nunca se guarda nada solo.
// 2. Si no se puede leer el tamano, el campo queda VACIO. Esta prohibido
//    rellenar con "las gaseosas suelen ser de 400": inventar un dato con cara
//    de dato es peor que no tenerlo.
// 3. El tamano del ENVASE no es lo que la persona se TOMO. Una botella de 3
//    litros no son tres litros bebidos. Siempre hay que preguntar.
//
// LO QUE SALE DEL TELEFONO: solo los 13 digitos del codigo, y solo si la
// persona dejo encendida la consulta. Nunca su nombre, ni su ubicacion, ni
// una foto. Open Food Facts es una base abierta, sin clave y sin cuenta.

import { BEBIDAS, type Bebida } from './bebidas'

const URL_BASE = 'https://world.openfoodfacts.org/api/v2/product/'
const LLAVE_APRENDIDAS = 'mascota-agua:codigos-aprendidos'
const LLAVE_CONSULTA = 'mascota-agua:consultar-internet'

export interface ProductoLeido {
  codigo: string
  /** Como se llama, para que la persona reconozca lo que escaneo. */
  nombre: string | null
  marca: string | null
  /** Que bebida de NUESTRO catalogo es. null si no se pudo saber. */
  bebida: string | null
  /** Tamano del envase en ml. null si no venia o no era claro. */
  envaseMl: number | null
  /** De donde salio: importa para no presentarlo todo con la misma autoridad. */
  origen: 'aprendido' | 'catalogo' | 'desconocido'
}

// --------------------------------------------------- lo que aprende el telefono

interface Aprendida {
  bebida: string
  ml: number | null
  nombre?: string
}

function leerAprendidas(): Record<string, Aprendida> {
  try {
    return JSON.parse(localStorage.getItem(LLAVE_APRENDIDAS) ?? '{}')
  } catch {
    return {}
  }
}

/** Se guarda EN EL TELEFONO, igual que las fotos de los vasos. */
export function recordarCodigo(codigo: string, bebida: string, ml: number | null, nombre?: string) {
  try {
    const todas = leerAprendidas()
    todas[codigo] = { bebida, ml, ...(nombre ? { nombre } : {}) }
    localStorage.setItem(LLAVE_APRENDIDAS, JSON.stringify(todas))
  } catch {
    /* si el telefono no deja guardar, simplemente no aprende */
  }
}

export function olvidarCodigos() {
  try {
    localStorage.removeItem(LLAVE_APRENDIDAS)
  } catch {
    /* nada que hacer */
  }
}

export function cuantosCodigosAprendidos(): number {
  return Object.keys(leerAprendidas()).length
}

// ------------------------------------------------ el interruptor de la consulta

export function consultaEncendida(): boolean {
  try {
    // Encendida por defecto: sin esto el lector solo sirve de la segunda vez
    // en adelante, y casi nadie llegaria a esa segunda vez.
    return localStorage.getItem(LLAVE_CONSULTA) !== 'no'
  } catch {
    return true
  }
}

export function ponerConsulta(encendida: boolean) {
  try {
    localStorage.setItem(LLAVE_CONSULTA, encendida ? 'si' : 'no')
  } catch {
    /* nada que hacer */
  }
}

// --------------------------------------------- de las categorias a NUESTRA lista

/**
 * A que bebida de nuestro catalogo corresponde. Devuelve null cuando no se
 * puede saber con seguridad, que es una respuesta perfectamente valida: es
 * mejor preguntar que adivinar.
 */
function bebidaSegunCategorias(tags: string[], azucarPor100g: number | null): string | null {
  const t = tags.join(' ')
  const tiene = (...palabras: string[]) => palabras.some((p) => t.includes(p))

  // El orden importa: lo mas especifico primero.
  if (tiene('beers', 'bieres', 'cervezas')) return 'cerveza'
  if (tiene('wines', 'vins', 'spirits', 'liquors', 'vinos')) return 'trago'
  if (tiene('energy-drinks', 'boissons-energisantes')) return 'energizante'
  if (tiene('sports-drinks', 'isotonic')) return 'deportiva'
  if (tiene('coffees', 'cafes')) return 'tinto'
  if (tiene('teas', 'thes', 'infusions')) return 'te'
  if (tiene('sparkling-waters', 'carbonated-waters', 'eaux-gazeuses')) return 'agua-gas'
  if (tiene('flavored-waters', 'eaux-aromatisees')) {
    return azucarPor100g !== null && azucarPor100g < 1 ? 'agua-sabor' : 'jugo'
  }
  if (tiene('waters', 'eaux', 'aguas')) return 'agua'
  if (tiene('sodas', 'carbonated-drinks', 'gaseosas')) {
    // Con el azucar medido se distingue la zero de la normal sin adivinar.
    if (azucarPor100g === null) return null
    return azucarPor100g < 1 ? 'gaseosa-zero' : 'gaseosa'
  }
  if (tiene('juices', 'jus', 'nectars', 'zumos')) return 'jugo'
  if (tiene('milks', 'laits', 'dairy', 'yogurts', 'leches')) return 'leche'
  if (tiene('plant-based-milk', 'boissons-vegetales')) return 'leche'
  return null
}

/**
 * El tamano, solo si es INEQUIVOCO.
 *
 * Se rechazan a proposito los "6 x 250 ml", los rangos y todo lo que no sea un
 * numero con su unidad. Fuera de 50 a 3000 ml tampoco: un "producto" de 20
 * litros no es algo que alguien se tome de un envase.
 */
function tamanoClaro(productQuantity: unknown, unidad: unknown): number | null {
  const n = Number(productQuantity)
  if (!Number.isFinite(n) || n <= 0) return null
  // OFF normaliza a g o ml. Para bebidas, 1 g ~ 1 ml y es lo mejor que hay.
  const u = String(unidad ?? '').toLowerCase()
  if (u && u !== 'ml' && u !== 'g' && u !== 'l' && u !== 'cl') return null
  const ml = u === 'l' ? n * 1000 : u === 'cl' ? n * 10 : n
  if (ml < 50 || ml > 3000) return null
  return Math.round(ml)
}

// ----------------------------------------------------------------- la consulta

/**
 * Busca el codigo. Primero en el telefono, y solo si no esta y la persona lo
 * permitio, en la base abierta.
 */
export async function buscarProducto(codigo: string): Promise<ProductoLeido> {
  const limpio = String(codigo).replace(/\D/g, '')
  const vacio: ProductoLeido = {
    codigo: limpio,
    nombre: null,
    marca: null,
    bebida: null,
    envaseMl: null,
    origen: 'desconocido',
  }
  if (!limpio) return vacio

  // 1. ¿Ya se lo enseñaron a este telefono? Eso manda sobre todo lo demas.
  const aprendida = leerAprendidas()[limpio]
  if (aprendida) {
    return {
      codigo: limpio,
      nombre: aprendida.nombre ?? null,
      marca: null,
      bebida: aprendida.bebida,
      envaseMl: aprendida.ml,
      origen: 'aprendido',
    }
  }

  if (!consultaEncendida()) return vacio

  try {
    const control = new AbortController()
    const reloj = setTimeout(() => control.abort(), 6000)
    const campos = 'product_name,product_name_es,brands,product_quantity,product_quantity_unit,categories_tags,nutriments'
    const respuesta = await fetch(`${URL_BASE}${limpio}?fields=${campos}`, {
      signal: control.signal,
    })
    clearTimeout(reloj)
    if (!respuesta.ok) return vacio

    const datos = await respuesta.json()
    if (datos?.status !== 1 || !datos.product) return vacio
    const p = datos.product

    const azucar = Number(p?.nutriments?.sugars_100g)
    return {
      codigo: limpio,
      nombre: (p.product_name_es || p.product_name || '').trim() || null,
      marca: (p.brands || '').split(',')[0]?.trim() || null,
      bebida: bebidaSegunCategorias(p.categories_tags ?? [], Number.isFinite(azucar) ? azucar : null),
      envaseMl: tamanoClaro(p.product_quantity, p.product_quantity_unit),
      origen: 'catalogo',
    }
  } catch {
    // Sin internet, o se demoro. No es un error de la persona.
    return vacio
  }
}

export function bebidaDe(id: string | null): Bebida | null {
  if (!id) return null
  return BEBIDAS.find((b) => b.id === id) ?? null
}
