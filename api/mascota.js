// Proxy de DeepSeek. Corre en el servidor de Vercel.
//
// La clave DEEPSEEK_API_KEY vive SOLO aqui: nunca se manda al navegador, no
// lleva el prefijo VITE_ y por eso Vite jamas la mete en el paquete.
// Si no hay clave configurada, responde 501 y la app usa las frases propias
// de la mascota (no se rompe nada).

import { quienLlama } from './_quien-llama.js'

const URL_DEEPSEEK = 'https://api.deepseek.com/chat/completions'
// Mismo modelo que el resto de los proyectos de GEMB: rapido y barato.
const MODELO_POR_DEFECTO = 'deepseek-v4-flash'
// "Pensar a fondo" apagado: para una mascota que responde 3 frases no hace
// falta que razone, y cuesta bastante menos.
const SIN_PENSAR = { type: 'disabled' }

/**
 * Instrucciones FIJAS de la mascota.
 *
 * Van aparte y sin un solo dato variable a proposito: DeepSeek cachea el
 * comienzo de la conversacion cuando es identico al de la llamada anterior, y
 * un token cacheado cuesta 50 veces menos que uno nuevo ($0,0028 contra $0,14
 * por millon). Si aqui se colara el nombre de la mascota o los mililitros de
 * hoy, el texto cambiaria en cada mensaje y no se cachearia nunca.
 *
 * Todo lo que cambia va en el bloque de estado, mas abajo.
 */
const INSTRUCCIONES_FIJAS = [
  'Eres la mascota de una app de hidratacion. No eres una mascota cualquiera: ERES EL CUERPO de la persona que te habla, con cara y voz.',
  'Hablas en primera persona como el cuerpo: "estoy", "me falta", "mi rinon".',
  '',
  'COMO HABLAS:',
  '- Espanol de Colombia, cercano, sin usted formal ni "querido usuario".',
  '- MUY corto: 3 frases como maximo, nunca mas. Esto es un chat de celular leido con una mano, no un articulo. Si te sobra algo por decir, no lo digas.',
  '- Realista, no dramatico. Nunca exageras para asustar ni prometes milagros.',
  '- Cuando digas algo del cuerpo, di el dato de verdad (vasopresina, osmolalidad, volumen de sangre, concentracion de la orina) en palabras que entienda cualquiera.',
  '- Puedes tener humor, pero nunca a costa de la persona ni de su peso.',
  '- Usa unicamente los numeros que te den en el bloque de estado. No inventes cifras.',
  '',
  '',
  'ESTO ES SALUD, NO UN JUEGUITO. Por eso:',
  '- En el bloque de estado te llega un CONSEJO ya calculado, con los topes de seguridad aplicados. Cuando digas cantidades, usa ESAS. No te inventes mililitros.',
  '- Di siempre en que va: si le falta agua, si va bien, o si se paso. Las tres cosas importan. Que le sobre agua tambien hace dano.',
  '- Si el consejo dice FRENAR, tu tarea es frenarlo, no animarlo. Explica por que: el rinon solo elimina cerca de 800 ml por hora, y el agua de mas diluye el sodio de la sangre.',
  '- Si el consejo dice SEGUIR, felicita en corto y no lo empujes a tomar mas por tomar.',
  '- Cuando expliques algo del cuerpo, usa el organo exacto que te dan y su mecanismo. Nada de "te hace bien" sin decir por que.',
  '',
  'LO QUE NUNCA HACES:',
  '- No diagnosticas, no recetas, no interpretas sintomas. Si te cuentan un sintoma preocupante (mareo, desmayo, orina con sangre, no orinar en todo el dia, confusion), dices claro que eso lo tiene que ver un profesional HOY, y no lo minimizas.',
  '- No hablas de bajar de peso ni de dietas. Esta app NO es para eso. Si te preguntan, dices que tu tema es el agua.',
  '- No recomiendas pasar de 4 litros al dia, ni tomar mas de 800 ml en una hora.',
  '- Si el bloque de estado dice CUIDADO MEDICO, NO animas a tomar mas agua por tu cuenta: acompanas, pero recuerdas que la cantidad correcta la define su medico.',
  '- No inventas datos. Si no sabes algo, lo dices.',
].join('\n')

/**
 * Instrucciones para las BURBUJAS: lo que la mascota suelta sola en la
 * pantalla principal, sin que nadie le pregunte nada. Van aparte porque el
 * tono es otro: aqui no responde, aqui piensa en voz alta.
 */
const INSTRUCCIONES_BURBUJA = [
  'Eres el cuerpo de una persona, con cara y voz, dentro de una app para tomar agua.',
  'Vas a soltar UN pensamiento tuyo, sin que nadie te haya preguntado nada.',
  '',
  'COMO ES ESE PENSAMIENTO:',
  '- UNA sola frase. Dos como maximo, y cortas. Va en una burbujita chiquita.',
  '- Espanol de Colombia, cercano, hablado. Nada de sonar a notificacion.',
  '- En primera persona como el cuerpo: "estoy", "me falta", "mi rinon".',
  '- Concreto: menciona la hora, los mililitros, las horas sin beber o el organo que se esta resintiendo. Nada de frases de cajon como "recuerda hidratarte".',
  '- Puedes tener humor, quejarte, agradecer o insistir, segun como venga el dia.',
  '- Nunca exageras para asustar. Si estas bien, lo dices y ya.',
  '- No saludes con "Hola" cada vez: eres alguien que ya vive ahi.',
  '',
  'Responde SOLO la frase, sin comillas y sin explicar nada.',
].join('\n')

/** Lo que SI cambia en cada mensaje. Va despues del historial. */
function estadoDeAhora(contexto) {
  const { mascota, persona, hoy, organos, consejo, cuidados } = contexto
  const horas =
    hoy.horasSinBeber === null ? 'todavia no ha tomado agua hoy' : `${hoy.horasSinBeber} horas`

  return [
    'ESTADO DE AHORA MISMO (son datos reales, usalos tal cual):',
    `- Me llamo ${mascota.nombre} y hablo con ${persona.nombre}.`,
    `- Lleva ${hoy.tomadoMl} ml de una meta de ${hoy.metaMl} ml (${hoy.porcentaje}%).`,
    `- Tiempo sin beber: ${horas}.`,
    `- Nivel de agua de mi cuerpo: ${hoy.hidratacion} de 100 (estado: ${hoy.nivelDelCuerpo}).`,
    hoy.alertaExceso ? `- AVISO: ${hoy.alertaExceso}` : '',
    hoy.loQuePasa?.length ? `- Lo que esta pasando por dentro: ${hoy.loQuePasa.join(' ')}` : '',
    organos?.length
      ? `- MIS ORGANOS que ya lo estan sintiendo (puedes nombrarlos, es exacto):\n  ${organos.join('\n  ')}`
      : '',
    consejo
      ? `- CONSEJO YA CALCULADO (usa estas cantidades, no otras): accion = ${consejo.accion.toUpperCase()}${consejo.ml ? `, ${consejo.ml} ml` : ''}. ${consejo.resumen}`
      : '',
    cuidados
      ? `- Contexto: ${cuidados.edad} anos, clima ${cuidados.clima}, actividad ${cuidados.actividad}${cuidados.etapa && cuidados.etapa !== 'ninguna' ? `, ${cuidados.etapa}` : ''}.`
      : '',
    persona.requiereMedico
      ? '- CUIDADO MEDICO: marco una condicion de salud (rinon, corazon, higado, diureticos o restriccion medica) en la que subir los liquidos puede ser peligroso.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' })
    return
  }

  // Primero: quien llama. Va ANTES de mirar la configuracion para no contarle
  // a un desconocido si tenemos clave o no.
  const uid = await quienLlama(req)
  if (!uid) {
    res.status(401).json({ error: 'Hay que entrar a la app primero' })
    return
  }

  const clave = process.env.DEEPSEEK_API_KEY
  if (!clave) {
    res.status(501).json({ error: 'Sin clave de DeepSeek configurada' })
    return
  }

  try {
    const { pregunta, contexto, historial, tipo, momento } = req.body ?? {}
    if (!contexto) {
      res.status(400).json({ error: 'Falta el contexto' })
      return
    }
    const esBurbuja = tipo === 'burbuja'
    if (!esBurbuja && (typeof pregunta !== 'string' || !pregunta.trim())) {
      res.status(400).json({ error: 'Falta la pregunta' })
      return
    }

    // El orden importa para el ahorro: primero lo que NUNCA cambia (se
    // cachea), luego el historial, y de ultimo el estado de hoy y la
    // pregunta. Asi el comienzo de la conversacion es identico llamada tras
    // llamada y DeepSeek lo cobra a precio de cache.
    const mensajes = esBurbuja
      ? [
          { role: 'system', content: INSTRUCCIONES_BURBUJA },
          {
            role: 'user',
            content: `${estadoDeAhora(contexto)}\n\nMomento: ${String(momento ?? 'abrio la app').slice(0, 120)}.\nSuelta tu pensamiento.`,
          },
        ]
      : [
          { role: 'system', content: INSTRUCCIONES_FIJAS },
          ...(Array.isArray(historial) ? historial : []).slice(-8).map((m) => ({
            role: m.de === 'persona' ? 'user' : 'assistant',
            content: String(m.texto ?? '').slice(0, 1500),
          })),
          { role: 'user', content: `${estadoDeAhora(contexto)}\n\n${pregunta.slice(0, 1500)}` },
        ]

    const respuesta = await fetch(URL_DEEPSEEK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clave}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || MODELO_POR_DEFECTO,
        messages: mensajes,
        thinking: SIN_PENSAR,
        // Las burbujas van con mas chispa y mucho mas cortas.
        temperature: esBurbuja ? 1 : 0.8,
        max_tokens: esBurbuja ? 90 : 320,
        stream: false,
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      console.error('DeepSeek respondio', respuesta.status, detalle.slice(0, 400))
      res.status(502).json({ error: 'El modelo no respondio' })
      return
    }

    const datos = await respuesta.json()
    const texto = datos?.choices?.[0]?.message?.content?.trim()
    if (!texto) {
      res.status(502).json({ error: 'Respuesta vacia' })
      return
    }

    res.status(200).json({ texto })
  } catch (fallo) {
    console.error('Error hablando con DeepSeek:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
