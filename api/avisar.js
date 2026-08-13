// El que manda los avisos de "tengo sed".
//
// Lo llama un cron cada media hora. Recorre a las personas suscritas, mira
// como va su dia y le manda un empujon SOLO a quien de verdad le hace falta.
//
// Reglas que respeta, en orden:
//   1. Nunca entre la hora de dormir y la de despertar.
//   2. Nunca si ya cumplio la meta del dia.
//   3. Nunca si acaba de tomar agua (menos de una hora).
//   4. Nunca dos veces seguidas antes de que pase el intervalo.
// Es decir: si no hay nada util que decir, se queda callado. Una app que
// molesta por molestar termina desinstalada.
import webpush from 'web-push'
import {
  escribirCampos,
  leerDocumento,
  listarUsuarios,
  tokenDeAcceso,
} from './_firestore-servidor.js'

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
  return Math.floor(((utc - desfase) % 1440) + 1440) % 1440
}

function diaLocal(desfaseMinutos) {
  const desfase = Number.isFinite(desfaseMinutos) ? desfaseMinutos : 300
  const fecha = new Date(Date.now() - desfase * 60000)
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getUTCDate()).padStart(2, '0')
  return `${fecha.getUTCFullYear()}-${mes}-${dia}`
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
      cuerpo: `Van ${Math.floor(horasSinBeber)} horas. Mi orina ya salió oscura, y eso es que estoy guardando agua.`,
    }
  }
  if (porcentaje < 35) {
    return {
      titulo: `${nombre} va flojito`,
      cuerpo: `Vamos en ${porcentaje}% del día y todavía faltan ${faltanMl} ml. Empecemos ya, que después toca correr.`,
    }
  }
  return {
    titulo: `Tengo sed`,
    cuerpo: `Nos faltan ${faltanMl} ml para la meta. Un vaso ahora y seguimos bien.`,
  }
}

export default async function handler(req, res) {
  // Solo el cron entra aqui.
  const secreto = process.env.CRON_SECRET
  const cabecera = req.headers?.authorization || ''
  const permitido =
    secreto && (cabecera === `Bearer ${secreto}` || req.query?.clave === secreto)
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
  webpush.setVapidDetails(
    'mailto:fundacionsocial@gimnasioemocionalmb.com',
    publica,
    privada,
  )

  const token = await tokenDeAcceso()
  if (!token) {
    res.status(501).json({ error: 'Falta la cuenta de servicio de Firebase' })
    return
  }

  const resumen = { revisados: 0, enviados: 0, dormidos: 0, alDia: 0, sinSuscripcion: 0 }

  try {
    const usuarios = await listarUsuarios(token)
    resumen.revisados = usuarios.length

    for (const { uid, perfil } of usuarios) {
      if (!perfil?.recordatoriosActivos) continue

      const avisos = await leerDocumento(token, `usuarios/${uid}/estado/avisos`)
      if (!avisos?.endpoint || !avisos?.claves?.p256dh) {
        resumen.sinSuscripcion += 1
        continue
      }

      // 1. ¿Está durmiendo?
      const ahora = minutosLocales(avisos.desfaseMinutos)
      const despertar = minutosDeHora(perfil.horaDespertar) ?? 390
      const dormir = minutosDeHora(perfil.horaDormir) ?? 1350
      const durmiendo =
        dormir > despertar ? ahora >= dormir || ahora < despertar : ahora >= dormir && ahora < despertar
      if (durmiendo) {
        resumen.dormidos += 1
        continue
      }

      // 2. ¿Ya cumplió?
      const hoy = diaLocal(avisos.desfaseMinutos)
      const dia = await leerDocumento(token, `usuarios/${uid}/dias/${hoy}`)
      const tomado = Number(dia?.totalMl ?? 0)
      const meta = Number(perfil.metaMl ?? 2000)
      if (meta > 0 && tomado >= meta) {
        resumen.alDia += 1
        continue
      }

      // 3. ¿Acaba de tomar? 4. ¿Ya se le avisó hace poco?
      const ultimoTrago = Number(avisos.ultimoTragoVisto ?? 0)
      const ultimoAviso = Number(avisos.ultimoAviso ?? 0)
      const horasSinBeber = ultimoTrago ? (Date.now() - ultimoTrago) / 3_600_000 : 5
      if (horasSinBeber < 1) continue

      const porcentaje = meta > 0 ? Math.round((tomado * 100) / meta) : 0
      const espera = minutosEntreAvisos(porcentaje, horasSinBeber) * 60_000
      if (Date.now() - ultimoAviso < espera) continue

      const mascota = await leerDocumento(token, `usuarios/${uid}/estado/mascota`)
      const { titulo, cuerpo } = mensaje(
        mascota?.nombre || 'Tu mascota',
        porcentaje,
        Math.max(0, meta - tomado),
        horasSinBeber,
      )

      try {
        await webpush.sendNotification(
          {
            endpoint: avisos.endpoint,
            keys: { p256dh: avisos.claves.p256dh, auth: avisos.claves.auth },
          },
          JSON.stringify({ titulo, cuerpo, url: '/' }),
          { TTL: 3600 },
        )
        resumen.enviados += 1
        // Se anota para no volver a molestar antes de tiempo.
        await escribirCampos(token, `usuarios/${uid}/estado/avisos`, {
          ultimoAviso: Date.now(),
        })
      } catch (fallo) {
        // 404 o 410 = el telefono se desuscribio. No es un error nuestro.
        const codigo = fallo?.statusCode
        if (codigo !== 404 && codigo !== 410) {
          console.error('Fallo enviando a', uid, codigo)
        }
      }
    }

    res.status(200).json(resumen)
  } catch (fallo) {
    console.error('Error repartiendo avisos:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
