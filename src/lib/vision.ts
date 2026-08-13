// Revision de la foto del vaso.
//
// Que se puede y que NO se puede prometer aqui, dicho sin adornos (comentario
// interno; los textos que ve la persona estan en RegistrarAgua.tsx):
// - Un modelo de vision SI puede decir "hay un vaso y se ve vacio".
// - NO puede saber si el agua se la tomo usted o la boto en el lavaplatos.
// La foto no es un policia: es un espejo. Sirve para que usted mismo no se
// haga trampa, no para demostrarle nada a nadie.
//
// Si el servidor no tiene modelo de vision configurado, la funcion devuelve
// null y la app sigue funcionando: la foto se guarda igual como prueba
// personal, solo que sin revisar.

import { obtenerToken } from './firebase'

export interface RevisionFoto {
  hayRecipiente: boolean
  estado: 'lleno' | 'medio' | 'vacio' | 'no-se'
  nota: string
}

export async function revisarFoto(
  dataUrl: string,
  recipiente: string,
): Promise<RevisionFoto | null> {
  try {
    const token = await obtenerToken()
    if (!token) return null
    const respuesta = await fetch('/api/revisar-foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imagen: dataUrl, recipiente }),
    })
    if (!respuesta.ok) return null
    const datos = (await respuesta.json()) as Partial<RevisionFoto>
    if (typeof datos.hayRecipiente !== 'boolean') return null
    return {
      hayRecipiente: datos.hayRecipiente,
      estado: datos.estado ?? 'no-se',
      nota: datos.nota ?? '',
    }
  } catch {
    return null
  }
}
