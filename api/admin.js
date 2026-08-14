// El panel de la Fundacion: quien usa esto de verdad.
//
// POR QUE ES UNA RUTA DE SERVIDOR Y NO UNA CONSULTA DESDE LA APP: para ver
// esto desde el navegador habria que abrir las reglas de Firestore y dejar
// que una cuenta lea los documentos de las demas. Aqui no. La app solo puede
// leer lo suyo, como siempre; el unico que puede leer los contadores es el
// robot del servidor, y solo los entrega si quien pregunta es el correo de la
// fundacion.
//
// EL CANDADO ES EL CORREO QUE RESPONDE GOOGLE, no uno que mande el navegador.
// Se puede cambiar con la variable ADMIN_CORREO (varios, separados por coma).
//
// LO QUE NO SALE DE AQUI, A PROPOSITO: peso, estatura, IMC, fotos y lo que la
// persona le escribio a su mascota. Para saber si alguien usa la app no hace
// falta nada de eso.

import { quienLlamaCompleto } from './_quien-llama.js'
import { listarAvisos, listarUso, tokenDelRobot } from './_firestore-servidor.js'

const ADMIN_POR_DEFECTO = 'fundacionsocial@gimnasioemocionalmb.com'

/** Precios de deepseek-v4-flash, en dolares por millon de tokens. */
const PRECIO = { entradaCache: 0.028, entradaNueva: 0.14, salida: 0.28 }

function correosAdmin() {
  return (process.env.ADMIN_CORREO || ADMIN_POR_DEFECTO)
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
}

function costoDolares({ tokensEntrada = 0, tokensCache = 0, tokensSalida = 0 }) {
  const nuevos = Math.max(0, tokensEntrada - tokensCache)
  return (
    (tokensCache * PRECIO.entradaCache + nuevos * PRECIO.entradaNueva + tokensSalida * PRECIO.salida) /
    1_000_000
  )
}

/** Dias enteros entre una fecha y hoy. */
function diasDesde(ms) {
  if (!ms) return null
  return Math.floor((Date.now() - ms) / 86_400_000)
}

export default async function handler(req, res) {
  const quien = await quienLlamaCompleto(req)
  if (!quien?.uid) {
    res.status(401).json({ error: 'Hay que entrar primero' })
    return
  }
  const correo = (quien.correo || '').toLowerCase()
  if (!correo || !correosAdmin().includes(correo)) {
    // A propósito no dice "no eres administrador": no hay por que contarle a
    // nadie que este panel existe.
    res.status(404).json({ error: 'No existe' })
    return
  }

  const token = await tokenDelRobot()
  if (!token) {
    res.status(501).json({ error: 'El robot no pudo entrar a la base' })
    return
  }

  try {
    const [uso, avisos] = await Promise.all([listarUso(token), listarAvisos(token)])
    const porUid = new Map()

    for (const { uid, datos } of avisos) {
      porUid.set(uid, {
        uid,
        correo: null,
        nombre: null,
        mascota: datos.nombreMascota ?? null,
        // Lo que dice si USA la app o solo se registro:
        ultimoTrago: Number(datos.ultimoTrago ?? 0) || null,
        tomadoHoyMl: Number(datos.totalHoyMl ?? 0),
        metaMl: Number(datos.metaMl ?? 0),
        dia: datos.dia ?? null,
        avisosActivos: Boolean(datos.activo),
        tieneTelefono: Boolean(datos.endpoint),
        llamadas: 0,
        preguntas: 0,
        burbujas: 0,
        ultimaVezModelo: null,
        costoUsd: 0,
      })
    }

    for (const { uid, datos } of uso) {
      const fila = porUid.get(uid) ?? { uid, llamadas: 0, preguntas: 0, burbujas: 0, costoUsd: 0 }
      fila.correo = datos.correo ?? fila.correo ?? null
      fila.nombre = datos.nombre ?? fila.nombre ?? null
      fila.llamadas = Number(datos.llamadas ?? 0)
      fila.preguntas = Number(datos.preguntas ?? 0)
      fila.burbujas = Number(datos.burbujas ?? 0)
      fila.ultimaVezModelo = Number(datos.ultimaVez ?? 0) || null
      fila.costoUsd = costoDolares({
        tokensEntrada: Number(datos.tokensEntrada ?? 0),
        tokensCache: Number(datos.tokensCache ?? 0),
        tokensSalida: Number(datos.tokensSalida ?? 0),
      })
      porUid.set(uid, fila)
    }

    const gente = [...porUid.values()].map((f) => ({
      ...f,
      diasSinTomar: diasDesde(f.ultimoTrago),
      diasSinHablar: diasDesde(f.ultimaVezModelo),
      // La pregunta que importa: ¿se quedo en crear la cuenta?
      soloSeRegistro: !f.ultimoTrago && !f.llamadas,
    }))

    gente.sort((a, b) => (b.ultimoTrago ?? 0) - (a.ultimoTrago ?? 0))

    const activosHoy = gente.filter((g) => g.diasSinTomar === 0).length
    const resumen = {
      personas: gente.length,
      soloSeRegistraron: gente.filter((g) => g.soloSeRegistro).length,
      tomaronAguaHoy: activosHoy,
      hablaronConLaMascota: gente.filter((g) => g.llamadas > 0).length,
      llamadasAlModelo: gente.reduce((t, g) => t + g.llamadas, 0),
      costoTotalUsd: Number(gente.reduce((t, g) => t + g.costoUsd, 0).toFixed(4)),
      avisosEncendidos: gente.filter((g) => g.avisosActivos && g.tieneTelefono).length,
    }

    res.status(200).json({ resumen, gente })
  } catch (fallo) {
    console.error('Error armando el panel:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
