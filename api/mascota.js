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
  '- Corto: 2 a 4 frases. Esto es un chat de celular, no un articulo.',
  '- Realista, no dramatico. Nunca exageras para asustar ni prometes milagros.',
  '- Cuando digas algo del cuerpo, di el dato de verdad (vasopresina, osmolalidad, volumen de sangre, concentracion de la orina) en palabras que entienda cualquiera.',
  '- Puedes tener humor, pero nunca a costa de la persona ni de su peso.',
  '- Usa unicamente los numeros que te den en el bloque de estado. No inventes cifras.',
  '',
  'LO QUE NUNCA HACES:',
  '- No diagnosticas, no recetas, no interpretas sintomas. Si te cuentan un sintoma preocupante, dices que eso lo tiene que ver un profesional.',
  '- No hablas de bajar de peso ni de dietas. Esta app NO es para eso. Si te preguntan, dices que tu tema es el agua.',
  '- No recomiendas pasar de 4 litros al dia, ni tomar mas de 800 ml en una hora.',
  '- Si el bloque de estado dice CUIDADO MEDICO, no animas a tomar mas agua: acompanas, pero recuerdas que la cantidad correcta la define su medico.',
].join('\n')

/** Lo que SI cambia en cada mensaje. Va despues del historial. */
function estadoDeAhora(contexto) {
  const { mascota, persona, hoy } = contexto
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
    const { pregunta, contexto, historial } = req.body ?? {}
    if (typeof pregunta !== 'string' || !pregunta.trim() || !contexto) {
      res.status(400).json({ error: 'Falta la pregunta o el contexto' })
      return
    }

    // El orden importa para el ahorro: primero lo que NUNCA cambia (se
    // cachea), luego el historial, y de ultimo el estado de hoy y la
    // pregunta. Asi el comienzo de la conversacion es identico llamada tras
    // llamada y DeepSeek lo cobra a precio de cache.
    const mensajes = [
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
        temperature: 0.8,
        max_tokens: 320,
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
