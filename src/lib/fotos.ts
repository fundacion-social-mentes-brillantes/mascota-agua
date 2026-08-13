// Las fotos de los vasos se quedan EN EL TELEFONO.
//
// Decision a proposito: son fotos de tu casa, tu cocina y tus manos. No hay
// ninguna razon para subirlas a un servidor. Aqui viven en IndexedDB, atadas
// al id del registro, y se pueden borrar todas de un boton en Ajustes.

const BASE = 'mascota-agua-fotos'
const ALMACEN = 'fotos'
const VERSION = 1

let promesaBd: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (promesaBd) return promesaBd
  promesaBd = new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE, VERSION)
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result
      if (!bd.objectStoreNames.contains(ALMACEN)) bd.createObjectStore(ALMACEN)
    }
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(solicitud.error)
  })
  return promesaBd
}

async function conAlmacen<T>(
  modo: IDBTransactionMode,
  accion: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const bd = await abrir()
  return new Promise<T>((resolver, rechazar) => {
    const transaccion = bd.transaction(ALMACEN, modo)
    const solicitud = accion(transaccion.objectStore(ALMACEN))
    solicitud.onsuccess = () => resolver(solicitud.result)
    solicitud.onerror = () => rechazar(solicitud.error)
  })
}

export async function guardarFoto(idRegistro: string, dataUrl: string): Promise<void> {
  try {
    await conAlmacen('readwrite', (almacen) => almacen.put(dataUrl, idRegistro))
  } catch {
    // Si el telefono no deja guardar (sin espacio, modo privado), el registro
    // sigue valiendo: simplemente se queda sin la foto de respaldo.
  }
}

export async function leerFoto(idRegistro: string): Promise<string | null> {
  try {
    const valor = await conAlmacen<string | undefined>('readonly', (almacen) =>
      almacen.get(idRegistro),
    )
    return valor ?? null
  } catch {
    return null
  }
}

export async function borrarFoto(idRegistro: string): Promise<void> {
  try {
    await conAlmacen('readwrite', (almacen) => almacen.delete(idRegistro))
  } catch {
    /* nada que hacer */
  }
}

export async function borrarTodasLasFotos(): Promise<void> {
  try {
    await conAlmacen('readwrite', (almacen) => almacen.clear())
  } catch {
    /* nada que hacer */
  }
}

export async function contarFotos(): Promise<number> {
  try {
    return await conAlmacen<number>('readonly', (almacen) => almacen.count())
  } catch {
    return 0
  }
}

/**
 * Achica la foto antes de guardarla. Una foto de celular pesa 3-5 MB y aqui
 * solo hace falta ver si el vaso esta lleno o vacio: con 720 px de lado largo
 * y JPEG al 72% sobra, y baja a ~80 KB.
 */
export function comprimirImagen(archivo: File | Blob, ladoMaximo = 720): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(new Error('No se pudo leer la foto'))
    lector.onload = () => {
      const imagen = new Image()
      imagen.onerror = () => rechazar(new Error('No se pudo abrir la foto'))
      imagen.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height))
        const ancho = Math.round(imagen.width * escala)
        const alto = Math.round(imagen.height * escala)
        const lienzo = document.createElement('canvas')
        lienzo.width = ancho
        lienzo.height = alto
        const pincel = lienzo.getContext('2d')
        if (!pincel) {
          rechazar(new Error('Este navegador no deja procesar imagenes'))
          return
        }
        pincel.drawImage(imagen, 0, 0, ancho, alto)
        resolver(lienzo.toDataURL('image/jpeg', 0.72))
      }
      imagen.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}
