// Revisor de la foto del vaso.
//
// Que hace de verdad: mira la foto y dice si ve un recipiente y si se ve
// vacio, medio o lleno. Nada mas. NO puede saber si el agua se la tomo la
// persona; eso no lo resuelve ninguna camara. La foto es un espejo para uno
// mismo, no una prueba para nadie.
//
// Usa el recurso de Azure OpenAI que ya existe (gemb-openai). Si no esta
// configurado, responde 501 y la app guarda la foto sin revisar.

import { quienLlama } from './_quien-llama.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' })
    return
  }

  // Primero: quien llama. Mirar fotos cuesta plata, y ademas no hay por que
  // contarle a un desconocido como esta configurado esto.
  const uid = await quienLlama(req)
  if (!uid) {
    res.status(401).json({ error: 'Hay que entrar a la app primero' })
    return
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const clave = process.env.AZURE_OPENAI_API_KEY
  const despliegue = process.env.AZURE_VISION_DEPLOYMENT
  if (!endpoint || !clave || !despliegue) {
    res.status(501).json({ error: 'Revision por foto no configurada' })
    return
  }

  try {
    const { imagen, recipiente } = req.body ?? {}
    if (typeof imagen !== 'string' || !imagen.startsWith('data:image/')) {
      res.status(400).json({ error: 'Falta la imagen' })
      return
    }
    // Una foto ya comprimida pesa ~80 KB; 1,5 MB en base64 es tope de sobra.
    if (imagen.length > 1_500_000) {
      res.status(413).json({ error: 'La foto pesa demasiado' })
      return
    }

    const version = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${despliegue}/chat/completions?api-version=${version}`

    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': clave },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Miras fotos de vasos, pocillos y botellas para una app de hidratacion. ' +
              'Respondes SOLO con un JSON de esta forma exacta, sin texto alrededor: ' +
              '{"hayRecipiente": true|false, "estado": "lleno"|"medio"|"vacio"|"no-se", "nota": "una frase corta en espanol de Colombia, sin acusar a nadie"}. ' +
              'Si no distingues bien el nivel, usa "no-se". Nunca inventes.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `La persona dice que se tomo el agua en un ${recipiente ?? 'vaso'}. Mira la foto: hay un recipiente? Se ve vacio?`,
              },
              { type: 'image_url', image_url: { url: imagen, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 160,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text()
      console.error('Azure respondio', respuesta.status, detalle.slice(0, 400))
      res.status(502).json({ error: 'El revisor no respondio' })
      return
    }

    const datos = await respuesta.json()
    const crudo = datos?.choices?.[0]?.message?.content ?? '{}'
    let leido
    try {
      leido = JSON.parse(crudo)
    } catch {
      res.status(502).json({ error: 'Respuesta ilegible' })
      return
    }

    const estados = ['lleno', 'medio', 'vacio', 'no-se']
    res.status(200).json({
      hayRecipiente: Boolean(leido.hayRecipiente),
      estado: estados.includes(leido.estado) ? leido.estado : 'no-se',
      nota: typeof leido.nota === 'string' ? leido.nota.slice(0, 200) : '',
    })
  } catch (fallo) {
    console.error('Error revisando la foto:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
