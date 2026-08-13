// Conexion con el proyecto "Agua" de Firebase (agua-19c50).
//
// Estas claves NO son secretas: identifican la app y viajan al navegador de
// todas formas. Lo que protege los datos son las reglas de firestore.rules,
// donde cada persona solo alcanza su propio arbol de documentos.
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from 'firebase/firestore'

const configuracion = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Falta configurar el archivo .env.local: lo avisamos en pantalla, no en blanco. */
export const firebaseConfigurado = Boolean(configuracion.apiKey && configuracion.projectId)

let app: FirebaseApp | null = null
let authInterno: Auth | null = null
let dbInterno: Firestore | null = null

function arrancar(): FirebaseApp {
  if (!app) app = initializeApp(configuracion)
  return app
}

export function obtenerAuth(): Auth {
  if (!authInterno) {
    authInterno = getAuth(arrancar())
    authInterno.languageCode = 'es'
    // La sesion queda guardada en el telefono: no hay que entrar cada vez.
    void setPersistence(authInterno, browserLocalPersistence)
  }
  return authInterno
}

export function obtenerDb(): Firestore {
  if (!dbInterno) {
    try {
      // Cache en el telefono: la app abre con los datos de ayer aunque no
      // haya senal, y los cambios se suben cuando vuelve la conexion.
      dbInterno = initializeFirestore(arrancar(), {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
      })
    } catch {
      // Si el navegador no deja usar cache persistente (modo incognito,
      // varias pestanas), seguimos sin cache en vez de romper la app.
      dbInterno = getFirestore(arrancar())
    }
  }
  return dbInterno
}

const proveedorGoogle = new GoogleAuthProvider()
proveedorGoogle.setCustomParameters({ prompt: 'select_account' })

/**
 * Entrar con Google. En celular la ventana emergente suele bloquearse, asi
 * que si falla se cae al metodo de redireccion, que si funciona ahi.
 */
export async function entrarConGoogle(): Promise<void> {
  const auth = obtenerAuth()
  try {
    await signInWithPopup(auth, proveedorGoogle)
  } catch (error) {
    const codigo = (error as { code?: string })?.code ?? ''
    const bloqueada =
      codigo === 'auth/popup-blocked' ||
      codigo === 'auth/popup-closed-by-user' ||
      codigo === 'auth/cancelled-popup-request' ||
      codigo === 'auth/operation-not-supported-in-this-environment'
    if (!bloqueada) throw error
    if (codigo === 'auth/popup-closed-by-user') return // la persona cerro a proposito
    await signInWithRedirect(auth, proveedorGoogle)
  }
}

export async function salir(): Promise<void> {
  await signOut(obtenerAuth())
}

/**
 * Credencial de la persona conectada, para mandarsela a /api.
 * Sin esto cualquiera desde fuera podria llamar a nuestras rutas y gastarse
 * el saldo de DeepSeek de la fundacion.
 */
export async function obtenerToken(): Promise<string | null> {
  try {
    return (await obtenerAuth().currentUser?.getIdToken()) ?? null
  } catch {
    return null
  }
}

export type { User }
