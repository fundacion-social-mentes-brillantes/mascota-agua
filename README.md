# Mascota de Agua

App para tomar agua, con una mascota que **es tu cuerpo**: se le ve el agua por
dentro y te dice, sin exagerar, lo que de verdad esta pasando cuando llevas
horas sin beber.

No es una app para bajar de peso. El peso solo entra porque el agua que
necesitas depende de el.

---

## Que hace

- **Entrada con Google** (proyecto de Firebase `agua-19c50`, llamado "Agua").
- **Arranque guiado**: nombre, edad, sexo, peso y altura → IMC y donde queda
  frente al mundo → preguntas filtro (actividad, clima, altura, embarazo,
  condiciones de salud) → **meta de agua calculada** con el desglose a la vista.
- **La mascota**: gota, axolote, pulpo, tortuga o nube; nombre y color a gusto.
  Es translucida: el nivel de agua que se le ve adentro es el mismo numero que
  calcula el motor.
- **Registrar cada trago** con el recipiente y los mililitros, y **foto opcional
  del vaso ya vacio**. La foto se queda en el telefono.
- **Linea de tiempo**: el dia hora por hora, cada trago con su foto, y los
  ultimos 30 dias con la racha.
- **Hablar con la mascota** (DeepSeek): responde con los numeros reales del dia.
- **Tienda**: comida, sombreros y accesorios que se pagan con gotas ganadas
  tomando agua.
- **Alarmas** cuando llevas mucho sin beber, nunca en tus horas de sueno.
- Se instala en **Android e iPhone** (es una PWA: "Agregar a pantalla de inicio").

---

## Correrla en el computador

```bash
npm install
npm run dev
```

Queda en http://localhost:5173 (o el puerto que diga la consola).

Otros comandos:

```bash
npm run build     # compila y revisa tipos
npm run lint      # revisa el codigo
npm run reglas    # publica firestore.rules (requiere firebase login)
node scripts/hacer-iconos.mjs   # rehace los iconos si cambia el dibujo
```

---

## Las claves

Copia `.env.example` a `.env.local` y llena los valores.

| Variable | Para que | Secreta |
|---|---|---|
| `VITE_FIREBASE_*` | Identifican la app ante Firebase | No. Viajan al navegador de todos modos; lo que protege los datos son las reglas. |
| `FIREBASE_API_KEY` | La misma clave, sin `VITE_`, para que `/api` compruebe quien llama | No |
| `DEEPSEEK_API_KEY` | El chat con la mascota | **Si.** Va solo en el servidor y en Vercel. Sin prefijo `VITE_` para que Vite nunca la meta en el paquete. |
| `DEEPSEEK_MODEL` | Cual modelo usar (por defecto `deepseek-v4-flash`) | No |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_VISION_DEPLOYMENT` | Revisar la foto del vaso (opcional) | **Si** |

Si falta `DEEPSEEK_API_KEY`, la mascota contesta con sus propias frases.
Si faltan las de Azure, la foto se guarda pero sin revisar. En los dos casos la
app sigue funcionando.

### Por que las rutas de /api piden identificacion

Las dos funciones de `api/` cuestan plata cada vez que alguien las llama. Sin
candado, cualquiera en internet podria descubrir la URL y gastarse el saldo de
la fundacion. Por eso el navegador manda el token de Firebase de la persona
conectada y `api/_quien-llama.js` le pregunta a Google si ese token es valido y
si pertenece a este proyecto. Si no lo es, la ruta responde 401 y no gasta
nada.

---

## Como estan guardados los datos

```
usuarios/{uid}                    el perfil
usuarios/{uid}/estado/mascota     la mascota y sus gotas
usuarios/{uid}/registros/{id}     cada trago
usuarios/{uid}/dias/{AAAA-MM-DD}  el total de cada dia
usuarios/{uid}/chat/{id}          la conversacion
```

Las reglas (`firestore.rules`) dejan a cada persona **solo** dentro de su
propio `uid`. No hay ninguna coleccion publica ni compartida.

**Las fotos NO estan ahi.** Viven en IndexedDB, en el telefono donde se
tomaron, y se pueden borrar todas desde Ajustes.

---

## Donde estan los numeros

Toda la ciencia esta en dos archivos y en la carpeta `docs/`:

- `src/lib/hidratacion.ts` — cuanta agua, como se reparte en el dia, los topes
  de seguridad y como se calcula el estado del cuerpo.
- `src/lib/frases.ts` — lo que dice la mascota, con el dato fisiologico detras.
- `src/lib/imc.ts` — IMC, categorias de la OMS y la comparacion mundial.
- `docs/` — la investigacion con las fuentes.

Si hay que corregir una cifra, se corrige **ahi** y en el documento
correspondiente. No hay numeros sueltos por el resto del codigo.

---

## Publicar

El proyecto esta listo para Vercel: `vercel.json` ya manda todo a `index.html`
menos `/api`, y las dos funciones de `api/` corren solas.

Al publicar hay que hacer dos cosas mas:

1. Cargar las variables de entorno en Vercel (las de la tabla de arriba).
2. En Firebase → Authentication → Configuracion → **Dominios autorizados**,
   agregar el dominio de Vercel. Sin eso, el ingreso con Google falla.

---

## Aviso

Mascota de Agua no da diagnosticos ni reemplaza a un profesional de la salud.
Hay condiciones (rinon, corazon, higado, diureticos, restriccion medica) en las
que subir los liquidos hace dano: la app pregunta por ellas al inicio y, si se
marcan, deja de empujar y lo dice claro.

Gimnasio Emocional Mentes Brillantes
