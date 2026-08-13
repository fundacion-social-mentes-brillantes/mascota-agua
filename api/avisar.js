// El que manda los avisos de "tengo sed".
//
// Recorre a las personas suscritas, mira como va su dia y le manda un empujon
// SOLO a quien de verdad le hace falta.
//
// QUIEN LO LLAMA: el plan Hobby de Vercel solo permite UN cron al dia, asi
// que aqui queda uno a las 8 a.m. de Colombia (el saludo de la manana). Para
// que avise varias veces al dia hay que llamar esta misma ruta desde afuera
// cada 30 o 60 minutos:
//
//   GET https://mascota-agua.vercel.app/api/avisar?clave=EL_CRON_SECRET
//
// Con Make (que ya esta pagado y gratis) se arma en dos pasos: un modulo de
// horario + un modulo HTTP con esa direccion. La ruta ya sabe callarse sola
// cuando no hay nada que decir, asi que llamarla de mas no molesta a nadie.
import webpush from 'web-push'
import { anotarAviso, listarAvisos, tokenDelRobot } from './_firestore-servidor.js'

/** Cada cuanto se puede volver a avisar, segun como venga el dia. */
function minutosEntreAvisos(porcentaje, horasSinBeber) {
  if (horasSinBeber >= 5 || porcentaje < 25) return 45
  if (horasSinBeber >= 3) return 60
  return 90
}

function minutosDeHora(hora) {
  const [h, m] = String(hora ?? '')
    .split(':')
    .map((n) => Number.parseInt(n, 10))
  if (Number.isNaN(h)) return null
  return h * 60 + (Number.isNaN(m) ? 0 : m)
}

/** Que hora es para ESA persona, usando el desfase que guardo su telefono. */
function minutosLocales(desfaseMinutos) {
  const desfase = Number.isFinite(desfaseMinutos) ? desfaseMinutos : 300 // Colombia
  const utc = Date.now() / 60000
  return Math.floor((((utc - desfase) % 1440) + 1440) % 1440)
}

/** Lo que dice la mascota. En primera persona, como el cuerpo. */
function mensaje(nombre, porcentaje, faltanMl, horasSinBeber) {
  if (horasSinBeber >= 6) {
    return {
      titulo: `${nombre} está en rojo`,
      cuerpo: `Llevo ${Math.floor(horasSinBeber)} horas sin una gota. Ya estoy racionando. Un vaso, despacio.`,
    }
  }
  if (horasSinBeber >= 4) {
    return {
      titulo: `${nombre} tiene sed`,
      cuerpo: `Van ${Math.floor(horasSinBeber)} horas. Mi orina ya sale oscura, y eso es que estoy guardando agua.`,
    }
  }
  if (porcentaje < 35) {
    return {
      titulo: `${nombre} va flojito`,
      cuerpo: `Vamos en ${porcentaje}% del día y faltan ${faltanMl} ml. Empecemos ya, que después toca correr.`,
    }
  }
  return {
    titulo: 'Tengo sed',
    cuerpo: `Nos faltan ${faltanMl} ml para la meta. Un vaso ahora y seguimos bien.`,
  }
}

export default async function handler(req, res) {
  // Solo el cron entra aqui.
  const secreto = process.env.CRON_SECRET
  const cabecera = req.headers?.authorization || ''
  const permitido = secreto && (cabecera === `Bearer ${secreto}` || req.query?.clave === secreto)
  if (!permitido) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }

  const publica = process.env.VITE_VAPID_PUBLICA
  const privada = process.env.VAPID_PRIVADA
  if (!publica || !privada) {
    res.status(501).json({ error: 'Faltan las llaves de los avisos' })
    return
  }
  webpush.setVapidDetails('mailto:fundacionsocial@gimnasioemocionalmb.com', publica, privada)

  const token = await tokenDelRobot()
  if (!token) {
    res.status(501).json({ error: 'El robot de avisos no pudo entrar' })
    return
  }

  const resumen = { revisados: 0, enviados: 0, dormidos: 0, alDia: 0, sinSuscripcion: 0 }

  try {
    const gente = await listarAvisos(token)
    resumen.revisados = gente.length

    for (const { uid, datos } of gente) {
      if (!datos?.activo) continue
      if (!datos?.endpoint || !datos?.claves?.p256dh) {
        resumen.sinSuscripcion += 1
        continue
      }

      // 1. ¿Está durmiendo?
      const ahora = minutosLocales(datos.desfaseMinutos)
      const despertar = minutosDeHora(datos.horaDespertar) ?? 390
      const dormir = minutosDeHora(datos.horaDormir) ?? 1350
      const durmiendo =
        dormir > despertar
          ? ahora >= dormir || ahora < despertar
          : ahora >= dormir && ahora < despertar
      if (durmiendo) {
        resumen.dormidos += 1
        continue
      }

      // 2. ¿Ya cumplió?
      const tomado = Number(datos.totalHoyMl ?? 0)
      const meta = Number(datos.metaMl ?? 2000)
      if (meta > 0 && tomado >= meta) {
        resumen.alDia += 1
        continue
      }

      // 3. ¿Acaba de tomar? 4. ¿Ya se le avisó hace poco?
      const ultimoTrago = Number(datos.ultimoTrago ?? 0)
      const ultimoAviso = Number(datos.ultimoAviso ?? 0)
      const horasSinBeber = ultimoTrago ? (Date.now() - ultimoTrago) / 3_600_000 : 5
      if (horasSinBeber < 1) continue

      const porcentaje = meta > 0 ? Math.round((tomado * 100) / meta) : 0
      const espera = minutosEntreAvisos(porcentaje, horasSinBeber) * 60_000
      if (Date.now() - ultimoAviso < espera) continue

      const { titulo, cuerpo } = mensaje(
        datos.nombreMascota || 'Tu mascota',
        porcentaje,
        Math.max(0, meta - tomado),
        horasSinBeber,
      )

      try {
        await webpush.sendNotification(
          {
            endpoint: datos.endpoint,
            keys: { p256dh: datos.claves.p256dh, auth: datos.claves.auth },
          },
          JSON.stringify({ titulo, cuerpo, url: '/' }),
          { TTL: 3600 },
        )
        resumen.enviados += 1
        await anotarAviso(token, uid, Date.now())
      } catch (fallo) {
        // 404 o 410 = el telefono se desuscribio. No es un error nuestro.
        const codigo = fallo?.statusCode
        if (codigo !== 404 && codigo !== 410) console.error('Fallo enviando a', uid, codigo)
      }
    }

    res.status(200).json(resumen)
  } catch (fallo) {
    console.error('Error repartiendo avisos:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
