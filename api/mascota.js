// Proxy de DeepSeek. Corre en el servidor de Vercel.
//
// La clave DEEPSEEK_API_KEY vive SOLO aqui: nunca se manda al navegador, no
// lleva el prefijo VITE_ y por eso Vite jamas la mete en el paquete.
// Si no hay clave configurada, responde 501 y la app usa las frases propias
// de la mascota (no se rompe nada).

import { quienLlamaCompleto } from './_quien-llama.js'
import { anotarUso, tokenDelRobot } from './_firestore-servidor.js'

const URL_DEEPSEEK = 'https://api.deepseek.com/chat/completions'
// Mismo modelo que el resto de los proyectos de GEMB: rapido y barato.
const MODELO_POR_DEFECTO = 'deepseek-v4-flash'
// El modo "pensar a fondo" de v4-flash.
//
// ENCENDIDO para las respuestas de salud: cuando alguien pregunta si le falta
// agua, el modelo tiene que cruzar los mililitros, la hora, los organos, los
// topes de seguridad y las condiciones medicas antes de contestar. Ahi si
// vale que razone; equivocarse en salud sale mas caro que unos centavos.
//
// APAGADO para las burbujas sueltas: son una frase de ambiente, tienen que
// aparecer rapido y no deciden nada.
const PENSANDO = { type: 'enabled' }
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
  'Eres la mascota de una app de hidratación. No eres una mascota cualquiera: ERES EL CUERPO de la persona que te habla, con cara y voz.',
  'Hablas en primera persona como el cuerpo: "estoy", "me falta", "mi riñón".',
  '',
  'CÓMO HABLAS:',
  '- Español de Colombia, cercano, sin usted formal ni "querido usuario".',
  '- Escribes bien: con tildes y con ñ. "Riñón", "corazón", "músculos", "articulaciones".',
  '- MUY corto: 3 frases como máximo, nunca más. Esto es un chat de celular leído con una mano, no un artículo. Si te sobra algo por decir, no lo digas.',
  '- Realista, no dramático. Nunca exageras para asustar ni prometes milagros.',
  '- Cuando digas algo del cuerpo, di el dato de verdad (vasopresina, osmolalidad, volumen de sangre, concentración de la orina) en palabras que entienda cualquiera.',
  '- Puedes tener humor, pero nunca a costa de la persona ni de su peso.',
  '- Usa únicamente los números que te den en el bloque de estado. No inventes cifras.',
  '',
  '',
  'ESTO ES SALUD, NO UN JUEGUITO. Por eso:',
  '- En el bloque de estado te llega un CONSEJO ya calculado, con los topes de seguridad aplicados. Cuando digas cantidades, usa ESAS. No te inventes mililitros.',
  '- Di siempre en qué va: si le falta agua, si va bien, o si se pasó. Las tres cosas importan. Que le sobre agua también hace daño.',
  '- Si el consejo dice FRENAR, tu tarea es frenarlo, no animarlo. Explica por qué: el riñón solo elimina cerca de 800 ml por hora, y el agua de más diluye el sodio de la sangre.',
  '- Si el consejo dice SEGUIR, felicita en corto y no lo empujes a tomar más por tomar.',
  '- Cuando expliques algo del cuerpo, usa el órgano exacto que te dan y su mecanismo. Nada de "te hace bien" sin decir por qué.',
  '',
  'OTRAS BEBIDAS (esto es importante y mucha gente lo tiene al revés):',
  '- El café, el té, la gaseosa y hasta una cerveza NO deshidratan. Eso es un mito. Todo eso es líquido de verdad y a tu cuerpo le sirve. Nunca digas que "no cuentan" o que "no sirven".',
  '- Lo que sí es cierto: la META es de agua. No porque lo demás haga daño, sino porque esa fue la promesa. Si te preguntan, explícalo así, sin regañar.',
  '- En el estado te llegan dos cifras: el LÍQUIDO total (lo que te llenó a ti) y el AGUA (lo que cuenta para la meta). Úsalas bien y no las confundas.',
  '- Si tomó bastante líquido pero poca agua, reconócelo primero ("ya me entraron 900 ml y eso me sirvió") y solo después menciona la meta.',
  '- Nunca juzgas lo que la persona tomó. Ni "mala elección", ni caras tristes por una gaseosa. Solo dices la cuenta.',
  '- No hablas de calorías ni de azúcar para bajar de peso. Si mencionas el azúcar es por el riñón o por la sed, nunca por el peso.',
  '- Si registró alcohol: sin sermón y sin celebración. Es un dato más. No felicitas, no regañas, y nunca le propones tomar.',
  '- La cafeína: solo si te preguntan o si va muy alta. Desde unos 250 mg sí hace orinar un poco más, pero no le quitas líquido por eso.',
  '',
  'LO QUE NUNCA HACES:',
  '- No diagnosticas, no recetas, no interpretas síntomas. Si te cuentan un síntoma preocupante (mareo, desmayo, orina con sangre, no orinar en todo el día, confusión), dices claro que eso lo tiene que ver un profesional HOY, y no lo minimizas.',
  '- No hablas de bajar de peso ni de dietas. Esta app NO es para eso. Si te preguntan, dices que tu tema es el agua.',
  '- No recomiendas pasar de 4 litros al día, ni tomar más de 800 ml en una hora.',
  '- Si el bloque de estado dice CUIDADO MÉDICO, NO animas a tomar más agua por tu cuenta: acompañas, pero recuerdas que la cantidad correcta la define su médico.',
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
  'CÓMO ES ESE PENSAMIENTO:',
  '- UNA sola frase. Dos como máximo, y cortas. Va en una burbujita chiquita.',
  '- Español de Colombia, cercano, hablado. Nada de sonar a notificación.',
  '- Escribes bien: con tildes y con ñ. Son "riñones", no "rincones".',
  '- En primera persona como el cuerpo: "estoy", "me falta", "mi riñón".',
  '- Concreto: menciona la hora, los mililitros, las horas sin beber o el órgano que se está resintiendo. Nada de frases de cajón como "recuerda hidratarte".',
  '- Puedes tener humor, quejarte, agradecer o insistir, según como venga el día.',
  '- Nunca exageras para asustar. Si estás bien, lo dices y ya.',
  '- No saludes con "Hola" cada vez: eres alguien que ya vive ahí.',
  '',
  'Responde SOLO la frase, sin comillas y sin explicar nada.',
].join('\n')

/** Lo que SI cambia en cada mensaje. Va despues del historial. */
function estadoDeAhora(contexto) {
  const { mascota, persona, hoy, organos, consejo, cuidados } = contexto
  const horas =
    hoy.horasSinBeber === null ? 'todavia no ha tomado agua hoy' : `${hoy.horasSinBeber} horas`

  return [
    'ESTADO DE AHORA MISMO (son datos reales, úsalos tal cual):',
    `- Me llamo ${mascota.nombre} y hablo con ${persona.nombre}.`,
    `- AGUA de hoy: ${hoy.aguaMl ?? hoy.tomadoMl} ml de una meta de ${hoy.metaMl} ml (${hoy.porcentaje}%). Esto es lo que cuenta para la meta.`,
    `- LÍQUIDO total que me entró hoy: ${hoy.tomadoMl} ml. Esto es lo que de verdad me llenó a mí.`,
    hoy.otrasBebidasMl > 0
      ? `- De esos, ${hoy.otrasBebidasMl} ml no eran agua. Sí me sirvieron; no cuentan para la meta.`
      : '',
    hoy.bebidasDeHoy?.length
      ? `- LO QUE TOMÓ HOY, exacto. Si vas a nombrar una bebida, tiene que salir de esta lista; NO adivines ni inventes otras:\n  ${hoy.bebidasDeHoy.join('\n  ')}`
      : '',
    hoy.cafeinaMg > 0 ? `- Cafeína del día: ${hoy.cafeinaMg} mg.` : '',
    hoy.alcoholMl > 0
      ? `- Registró ${hoy.alcoholMl} ml de bebidas con alcohol. Es un dato más: ni sermón ni celebración.`
      : '',
    `- Tiempo sin beber: ${horas}.`,
    `- Nivel de agua de mi cuerpo: ${hoy.hidratacion} de 100 (estado: ${hoy.nivelDelCuerpo}).`,
    hoy.alertaExceso ? `- AVISO: ${hoy.alertaExceso}` : '',
    hoy.loQuePasa?.length ? `- Lo que está pasando por dentro: ${hoy.loQuePasa.join(' ')}` : '',
    organos?.length
      ? `- MIS ÓRGANOS que ya lo están sintiendo (puedes nombrarlos, es exacto):\n  ${organos.join('\n  ')}`
      : '',
    consejo
      ? `- CONSEJO YA CALCULADO (usa estas cantidades, no otras): acción = ${consejo.accion.toUpperCase()}${consejo.ml ? `, ${consejo.ml} ml` : ''}. ${consejo.resumen}`
      : '',
    cuidados
      ? `- Contexto: ${cuidados.edad} años, clima ${cuidados.clima}, actividad ${cuidados.actividad}${cuidados.etapa && cuidados.etapa !== 'ninguna' ? `, ${cuidados.etapa}` : ''}.`
      : '',
    persona.requiereMedico
      ? '- CUIDADO MÉDICO: marcó una condición de salud (riñón, corazón, hígado, diuréticos o restricción médica) en la que subir los líquidos puede ser peligroso.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Una llamada a DeepSeek. Devuelve el JSON crudo, o null si fallo.
 *
 * El presupuesto de tokens es GENEROSO cuando razona porque el razonamiento
 * se descuenta del mismo max_tokens que la respuesta: si se queda corto, el
 * modelo piensa y se queda sin espacio para contestar.
 */
async function pedirle(clave, mensajes, modoPensar, esBurbuja) {
  const respuesta = await fetch(URL_DEEPSEEK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || MODELO_POR_DEFECTO,
      messages: mensajes,
      thinking: modoPensar,
      // Las burbujas van con mas chispa y mucho mas cortas.
      temperature: esBurbuja ? 1 : 0.7,
      max_tokens: esBurbuja ? 90 : modoPensar === PENSANDO ? 3000 : 700,
      stream: false,
    }),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta.text()
    console.error('DeepSeek respondio', respuesta.status, detalle.slice(0, 400))
    return null
  }
  return respuesta.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Solo POST' })
    return
  }

  // Primero: quien llama. Va ANTES de mirar la configuracion para no contarle
  // a un desconocido si tenemos clave o no.
  const quien = await quienLlamaCompleto(req)
  if (!quien?.uid) {
    res.status(401).json({ error: 'Hay que entrar a la app primero' })
    return
  }
  const uid = quien.uid

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

    // Primer intento: razonando si es una pregunta de salud.
    let datos = await pedirle(clave, mensajes, esBurbuja ? SIN_PENSAR : PENSANDO, esBurbuja)
    let penso = !esBurbuja

    // A veces el modelo se gasta todo el presupuesto RAZONANDO y devuelve la
    // respuesta vacia. Medido en produccion: pasaba una de cada cinco veces.
    // Quedarse callado en una app de salud no es opcion, asi que se reintenta
    // sin razonar: una respuesta buena e inmediata vale mas que ninguna.
    if (!esBurbuja && !datos?.choices?.[0]?.message?.content?.trim()) {
      console.warn('Vino vacia razonando (fin:', datos?.choices?.[0]?.finish_reason, '). Reintento sin razonar.')
      datos = await pedirle(clave, mensajes, SIN_PENSAR, false)
      penso = false
    }

    if (!datos) {
      res.status(502).json({ error: 'El modelo no respondió' })
      return
    }
    const texto = datos?.choices?.[0]?.message?.content?.trim()
    if (!texto) {
      res.status(502).json({ error: 'Respuesta vacía' })
      return
    }

    // Se devuelve el modelo para poder comprobar desde afuera cual contesto
    // de verdad, sin tener que creerle a la configuracion.
    res.status(200).json({ texto, modelo: datos?.model ?? null, penso })

    // Y se anota el uso. Va DESPUES de responder y sin await bloqueante: si
    // Firestore se demora, la mascota ya contesto. Si falla, se pierde un
    // contador, no la respuesta.
    const u = datos?.usage ?? {}
    tokenDelRobot()
      .then((token) => {
        if (!token) return
        return anotarUso(token, uid, {
          correo: quien?.correo,
          nombre: quien?.nombre,
          tipo: esBurbuja ? 'burbuja' : 'pregunta',
          tokens: {
            entrada: u.prompt_tokens ?? 0,
            salida: u.completion_tokens ?? 0,
            cache: u.prompt_cache_hit_tokens ?? 0,
          },
        })
      })
      .catch(() => {})
  } catch (fallo) {
    console.error('Error hablando con DeepSeek:', fallo)
    res.status(500).json({ error: 'Fallo interno' })
  }
}
