// El reloj. Cada 30 minutos le da un toque a la app para que reparta los
// avisos de "tengo sed".
//
// Aqui NO hay logica de hidratacion a proposito: quien decide a quien avisar
// es la app, que es la que tiene los datos. Esto es solo el despertador. Asi,
// si manana cambia la regla de los avisos, no hay que volver a publicar nada
// en Azure.
//
// Existe porque el plan gratis de Vercel solo deja UN cron al dia, y un aviso
// diario no sirve para tomar agua. Cada 30 minutos son 48 toques al dia, muy
// por debajo del millon gratis que da Azure al mes.

const { app } = require('@azure/functions')

app.timer('avisar', {
  // segundo minuto hora dia mes dia-semana
  schedule: '0 */30 * * * *',
  // Si la app estuvo apagada y se perdio un turno, lo recupera al prender.
  useMonitor: true,
  handler: async (temporizador, contexto) => {
    const url = process.env.URL_AVISAR
    const clave = process.env.CRON_SECRET

    if (!url || !clave) {
      contexto.error('Faltan URL_AVISAR o CRON_SECRET en la configuracion.')
      return
    }

    try {
      const respuesta = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${clave}` },
      })
      const texto = await respuesta.text()

      if (!respuesta.ok) {
        contexto.error(`La app respondio ${respuesta.status}: ${texto.slice(0, 200)}`)
        return
      }
      // Queda en el registro de Azure: cuantos reviso y a cuantos les aviso.
      contexto.log(`Listo. ${texto.slice(0, 200)}`)
    } catch (fallo) {
      contexto.error('No se pudo hablar con la app:', fallo.message)
    }
  },
})
