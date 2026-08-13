// La voz de la mascota (Azure Speech).
//
// Devuelve MP3 directamente para que el navegador lo reproduzca sin
// conversiones. La clave vive SOLO aqui, y como cada frase cuesta plata, la
// ruta exige el token de Firebase igual que las demas.

import { quienLlama } from './_quien-llama.js'

/** Voces que se ofrecen. La primera es la que viene por defecto. */
const VOCES = new Set([
  'es-CO-SalomeNeural',
  'es-CO-GonzaloNeural',
  'es-MX-DaliaNeural',
  'es-MX-JorgeNeural',
  'es-MX-Ximena:DragonHDLatestNeural',
  'es-MX-Tristan:DragonHDLatestNeural',
])

const VOZ_POR_DEFECTO = 'es-CO-SalomeNeural'

/** Tope de caracteres por frase: evita que un texto largo dispare el costo. */
const TOPE_LETRAS = 420

function aSsml(texto, voz, animo) {
  const idioma = /^([a-z]{2}-[A-Z]{2})/i.exec(voz)?.[1] ?? 'es-CO'
  const limpio = texto
    .slice(0, TOPE_LETRAS)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // La mascota no habla igual cuando esta bien que cuando esta en rojo.
  const tono =
    animo === 'critico'
      ? { rate: '-8%', pitch: '-6%' }
      : animo === 'bajo'
        ? { rate: '-4%', pitch: '-3%' }
        : animo === 'pleno'
          ? { rate: '+6%', pitch: '+8%' }
          : { rate: '+2%', pitch: '+3%' }

  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${idioma}">` +
    `<voice name="${voz}">` +
    `<prosody rate="${tono.rate}" pitch="${tono.pitch}">${limpio}</prosody>` +
    `</voice></speak>`
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' })
    return
  }

  const uid = await quienLlama(req)
  if (!uid) {
    res.status(401).json({ error: 'Hay que entrar a la app primero' })
    return
  }

  const clave = process.env.AZURE_SPEECH_KEY
  const region = (process.env.AZURE_SPEECH_REGION || 'eastus').trim()
  if (!clave) {
    res.status(501).json({ error: 'La voz no esta configurada' })
    return
  }

  try {
    const { texto, voz, animo } = req.body ?? {}
    if (typeof texto !== 'string' || !texto.trim()) {
      res.status(400).json({ error: 'Falta el texto' })
      return
    }
    const vozElegida = VOCES.has(voz) ? voz : VOZ_POR_DEFECTO

    const respuesta = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': clave,
          'Content-Type': 'application/ssml+xml; charset=utf-8',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'mascota-agua',
        },
        body: aSsml(texto, vozElegida, animo),
      },
    )

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      console.error('Azure Speech respondio', respuesta.status, detalle.slice(0, 200))
      res.status(502).json({ error: 'La voz no respondio' })
      return
    }

    const audio = Buffer.from(await respuesta.arrayBuffer())
    if (audio.length < 800) {
      res.status(502).json({ error: 'La voz vino vacia' })
      return
    }

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, max-age=600')
    res.status(200).send(audio)
  } catch (fallo) {
    console.error('Error generando la voz:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
