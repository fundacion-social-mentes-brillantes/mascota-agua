// El reloj. Cada 30 minutos le da un toque a la app para que reparta los
// avisos de "tengo sed".
//
// Aqui NO hay logica de hidratacion a proposito: quien decide a quien avisar
// es la app, que es la que tiene los datos. Esto es solo el despertador. Asi,
// si manana cambia la regla de los avisos, no hay que volver a publicar nada
// en Azure.

module.exports = async function (context) {
  const url = process.env.URL_AVISAR
  const clave = process.env.CRON_SECRET

  if (!url || !clave) {
    context.log.error('Faltan URL_AVISAR o CRON_SECRET en la configuracion.')
    return
  }

  try {
    const respuesta = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${clave}` },
    })
    const texto = await respuesta.text()

    if (!respuesta.ok) {
      context.log.error(`La app respondio ${respuesta.status}: ${texto.slice(0, 200)}`)
      return
    }
    // Queda en el registro de Azure: cuantos reviso y a cuantos les aviso.
    context.log(`Listo. ${texto.slice(0, 200)}`)
  } catch (fallo) {
    context.log.error('No se pudo hablar con la app:', fallo.message)
  }
}
