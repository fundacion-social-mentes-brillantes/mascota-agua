# De dónde sale cada número de la app

Este documento es la fuente de verdad. **Si algún día hay que corregir una
cifra, se corrige aquí y en `src/lib/hidratacion.ts` al mismo tiempo.** No hay
números sueltos en el resto del código.

Consultado el 13 de agosto de 2026.

---

## 1. Cuánta agua al día

### Referencias oficiales

| Fuente | Qué dice |
|---|---|
| **EFSA (2010)** — Dietary Reference Values for water | Ingesta adecuada de agua **total**: **2,0 L/día mujeres**, **2,5 L/día hombres**. Incluye agua de bebida *y* la de los alimentos. Vale para temperatura moderada y actividad moderada. |
| **EFSA — niños** | 1,3 L/día (2-3 años), 1,6 L/día (4-8), 2,1 L niños / 1,9 L niñas (9-13). |
| **EFSA — embarazo y lactancia** | Embarazo: **+300 mL/día**. Lactancia: **+700 mL/día**. |
| **IOM / NASEM (2004)** | ~80% de la ingesta total viene de bebidas y ~20% de los alimentos. |
| **ESPEN** | Al menos **2,0 L de bebidas/día en hombres** y **1,6 L en mujeres**, asumiendo que el 80% de las necesidades llega como bebida. Es la única guía que además considera la edad. |
| **Regla clínica corriente** | **30-35 mL/kg/día** en personas adultas. Algunas guías usan 25-30 mL/kg, o sea que 35 es el extremo generoso del rango. |
| **Mayores de 65** | Se baja a **25-30 mL/kg**, porque la función renal y la sensación de sed disminuyen y hay riesgo de sobrehidratación. |

### Lo que hace la app

```
agua total = peso (kg) × mL_por_kilo(edad)

mL_por_kilo:  50 si es menor de 14      (Holliday-Segar simplificado)
              40 entre 14 y 17
              35 entre 18 y 64
              30 de 65 en adelante

meta de agua BEBIDA = agua total × 0,80        ← el 20% lo pone la comida
                      (nunca por debajo del piso de ESPEN si es adulto:
                       2000 mL hombres / 1600 mL mujeres)

+ extras (todos van directo a la bebida, no a la comida):
    actividad moderada  +350      alta +700      muy alta +1100
    clima caliente seco +500      caliente húmedo +750
    altura > 2.000 m    +250
    embarazo            +300      lactancia +700   (EFSA)

= se redondea a múltiplos de 50 y se acota entre 1.300 y 4.000 mL
```

> **Corrección aplicada el 13-08-2026**: la primera versión descontaba el 25%
> por la comida. EFSA, IOM y ESPEN coinciden en **20%**. Se corrigió a 0,20 y
> se añadió el piso de ESPEN, que antes no estaba y dejaba metas demasiado
> bajas en personas muy delgadas.

### ¿La altura (estatura) cambia la necesidad?

No de forma directa. La evidencia la relaciona con el **peso** y con el gasto
energético, no con la estatura. En la app la estatura se pide **solo** para
calcular el IMC, y así se dice en pantalla. Sería deshonesto meterla en la
fórmula del agua para que parezca más precisa de lo que es.

---

## 2. Los topes de seguridad

| Tope | Valor | Por qué |
|---|---|---|
| Máximo por hora | **800 mL** | El riñón sano elimina entre **0,8 y 1,0 L/hora** (medido: 778-1043 mL/h con la hormona antidiurética al mínimo). Por encima de eso el agua se acumula y empieza a diluir el sodio. |
| Máximo por día | **4.000 mL** | La app no recomienda más sin que lo mire un profesional. La ingesta excesiva de agua libre se vuelve un problema clínico por encima de ~750 mL/h o ~18 L/día. |
| Máximo por toma | **700 mL** | Repartir es mejor que tomar de golpe. |
| Mínimo | **1.300 mL** | Piso absoluto para cualquier edad; en adultos manda el piso de ESPEN (1.600 / 2.000). |

**Hiponatremia**: tomar mucha agua muy rápido diluye el sodio de la sangre. No
es un riesgo teórico —hay casos graves documentados en maratones y en retos de
beber agua—. Por eso la app avisa en vez de felicitar cuando alguien se pasa.

---

## 3. Qué pasa en el cuerpo sin agua

Esto es lo que alimenta las frases de `src/lib/frases.ts`.

| Tiempo | Qué está pasando |
|---|---|
| 0-2 h (bien hidratado) | Osmolalidad plasmática en 285-290 mOsm/kg. El riñón elimina lo que sobra sin esfuerzo. Orina clara. |
| ~2 h | Sube la vasopresina (hormona antidiurética): el riñón empieza a guardar agua. La orina se concentra y se oscurece. |
| ~4 h | Sangre algo más concentrada. Orina más amarilla y con más olor. Aparece el cansancio inespecífico. |
| ~6 h | Con ~1% de pérdida de peso corporal en líquido: **el ánimo se afecta de forma consistente** — más fatiga, más tensión y ansiedad, peor concentración. Boca seca, saliva espesa. Posible dolor de cabeza. |
| 8 h o más | Pasado el **2%** de pérdida de peso, los estudios coinciden en **más fatiga y menos estado de alerta**. Menos volumen de sangre → el corazón late más rápido. |
| Crónico | Sube el riesgo de estreñimiento, infección urinaria y cálculos renales. |

> **Matiz importante y honesto**: los efectos sobre el **ánimo y la fatiga**
> con deshidratación leve están bien replicados. Los efectos sobre el
> **rendimiento cognitivo** por debajo del 2% son **menos consistentes** entre
> estudios. La app dice esto último con cuidado: no afirma que "el rendimiento
> mental cae" como si fuera un hecho cerrado.

### Mitos que la app NO repite

- **"8 vasos al día para todo el mundo"** — no tiene respaldo; la necesidad
  depende del peso, el clima y la actividad.
- **"Si tienes sed ya estás deshidratado"** — la sed llega algo tarde, sí,
  pero no es una alarma de emergencia. La app lo dice como "la sed no es el
  primer aviso", que es lo correcto.
- **"El agua elimina toxinas / adelgaza"** — no. Quien elimina es el riñón, y
  el agua no quema grasa. Por eso esta app **no es de bajar de peso**.

---

## 4. Cómo se reparte en el día

La meta se reparte entre la hora de despertar y **dos horas antes de dormir**,
para no provocar levantadas de madrugada. Los recordatorios salen cada 90
minutos si el día va bien, cada 60 si va justo y cada 45 si ya lleva mucho sin
beber — y **nunca** entre la hora de dormir y la de despertar.

---

## 5. Cuándo la app debe callarse y mandar al médico

Hay condiciones en las que subir los líquidos **hace daño**:

- Enfermedad renal o diálisis
- Insuficiencia cardíaca
- Cirrosis o enfermedad del hígado
- Tratamiento con diuréticos
- Restricción de líquidos indicada por un médico
- SIADH y otras alteraciones del sodio

La app pregunta por todas ellas en el paso "Salud" del arranque. Si se marca
alguna, la meta pasa a ser **solo referencia**, la app deja de empujar y lo
dice en pantalla y en las instrucciones de la mascota.

**Menores de edad**: la cantidad la debería confirmar el pediatra. La app lo
avisa por debajo de los 15 años.

---

## Fuentes

- [EFSA — Scientific Opinion on Dietary Reference Values for water (2010)](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1459)
- [EFSA — Dietary reference values for water (resumen)](https://www.efsa.europa.eu/en/efsajournal/pub/1459)
- [NASEM / IOM — Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate (2004)](https://www.nationalacademies.org/read/10925/chapter/6)
- [Clinical Nutrition ESPEN — sobre fluidoterapia de mantenimiento en adultos](https://www.clinicalnutritionespen.com/article/S2405-4577(24)00167-0/fulltext)
- [Fluid Intake Recommendation Considering the Physiological Adaptations of Adults Over 65 Years (revisión crítica)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7694182/)
- [Hyponatremia — StatPearls, NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK470386/)
- [Peak rates of diuresis in healthy humans during oral fluid overload](https://www.researchgate.net/publication/11624634_Peak_rates_of_diuresis_in_healthy_humans_during_oral_fluid_overload)
- [Mild dehydration impairs cognitive performance and mood of men — British Journal of Nutrition](https://www.cambridge.org/core/journals/british-journal-of-nutrition/article/mild-dehydration-impairs-cognitive-performance-and-mood-of-men/3388AB36B8DF73E844C9AD19271A75BF)
- [Mild Dehydration Affects Mood in Healthy Young Women — The Journal of Nutrition](https://jn.nutrition.org/article/S0022-3166(22)02889-9/fulltext)
- [Do small differences in hydration status affect mood and mental performance? — PubMed](https://pubmed.ncbi.nlm.nih.gov/26290294/)

---

## Segunda vuelta (13-08-2026): la franja, la noche y los topes

Se agregaron a `src/lib/hidratacion.ts`. Si alguna de estas cifras hay que
corregirla, se corrige AQUI y en ese archivo, en ningun otro lado.

### El mínimo vital (la raya de abajo)

No es una meta: es lo que el cuerpo pierde aunque uno se quede quieto.

| Pérdida | Cuánto | De dónde sale |
|---|---|---|
| Insensibles (pulmón y piel) | 0,4–0,5 ml/kg por hora → se usa **0,45**, o sea 10,8 ml/kg al día | Es la cifra clínica corriente; en un adulto de 70 kg da 650–850 ml/día. |
| Orina obligatoria | **500 ml** | El riñón no concentra más allá de ~1200 mOsm/L y hay que sacar unos 600 mOsm de desechos al día. 600 ÷ 1200 = 0,5 L. Ese medio litro sale aunque no se tome nada. |

Total de agua **de bebida** = (10,8 × peso + 500) × 0,8, porque una quinta
parte del agua entra con la comida. Para 75 kg da 1.050 ml.

### El máximo y los dos topes de ritmo

- **4 L al día** es el tope duro de la app. Sin ejercicio fuerte ni calor
  extremo, por encima de ahí el agua empieza a diluir el sodio.
- **800 ml por hora**: el riñón elimina entre 0,7 y 1,0 L/h. Se toma el
  extremo prudente. Beber por encima de ese ritmo varias horas seguidas es
  justo el mecanismo de la intoxicación por agua.
- **700 ml por toma**: el estómago vacía bien volúmenes de 240 a 800 ml (vida
  media de 8 a 18 minutos), pero por encima de unos 7 ml/kg el vaciado ya no
  termina dentro de la hora. Más de un golpe no hidrata más rápido: se queda
  pesando.

### La noche (la pregunta de Sebastián)

Si no tomó nada en todo el día y ya casi se acuesta, **no** hay que recuperar
el déficit. Cada levantada a orinar fragmenta el sueño, y con dos episodios
por noche ya hay cansancio medible al día siguiente.

| Falta para dormir | Máximo seguro |
|---|---|
| Ya pasó la hora | 150 ml |
| Menos de 1 hora | 200 ml |
| 1 a 1,5 horas | 300 ml |
| 1,5 a 2,5 horas | 500 ml |
| Más de 2,5 horas | 700 ml (el tope normal por toma) |

La medicina del sueño lo resume así: un vaso pequeño (150–200 ml) pegado a la
cama no le molesta a casi nadie; entre 200 y 500 ml conviene tener hora y
media de margen; de 500 para arriba hay que dejarlo para el día siguiente.

### Fuentes de esta vuelta

- Merck Manual, *Water and Sodium Balance* — pérdidas insensibles y balance.
- StatPearls, *Fluid Management* — 0,4–0,5 ml/kg/h de insensibles.
- UpToDate, *Maintenance and replacement fluid therapy in adults* — volumen
  urinario obligatorio a partir de la capacidad de concentración.
- EFSA 2010, *Dietary Reference Values for water* — 2,0 L/día mujeres y
  2,5 L/día hombres de agua total.
- Molecular Pharmaceutics 2014, *Quantification of Gastrointestinal Liquid
  Volumes* — vaciado gástrico de 240 a 800 ml.
- Sleep Foundation, *How Drinking Water Before Bed Impacts Sleep* — nocturia y
  fragmentación del sueño.

---

## Tercera vuelta (13-08-2026): las otras bebidas

Sebastián preguntó qué pasa cuando uno no toma agua sino gaseosa, agua con gas
o cerveza. Se investigó a fondo. **De las 12 cifras que se mandaron a
verificación adversarial, seis se cayeron**: los "factores de hidratación" que
circulan por internet y que usan otras apps son en buena parte inventados.

### La decisión

Se separan dos cosas que estaban mezcladas:

- **El líquido** llena a la mascota. Casi todo cuenta, porque es verdad: el
  tinto, la gaseosa y una cerveza **no deshidratan**. Decir "eso no cuenta"
  sería mentir.
- **La meta** es de agua. No porque lo demás haga daño, sino porque es la
  promesa que la persona se hace. Y aquí el agua es gratis y la gaseosa cuesta:
  una meta que se cumple con gaseosa es una meta al revés.

### Los factores

Es **cuánta agua contiene** la bebida (tablas de composición de alimentos), no
"cuánto hidrata". Tres niveles, no veinte: nadie calcula el tamaño de su vaso
con menos de 20% de error, y fingir la diferencia entre 0,88 y 0,90 sería una
mentira nueva con cara de precisión.

| Clase | Factor | Cuenta para la meta |
|---|---|---|
| Agua (natural, con gas, saborizada sin azúcar) | 1,00 | **Sí** |
| Claro sin azúcar ni leche (tinto, té, gaseosa zero) | 1,00 | No |
| Con azúcar, leche o espesa | 0,90 | No |
| Cerveza, hasta 660 ml/día | 0,90 | No |
| Vino y destilados | 0 | No |

### Por qué NO se usa el Beverage Hydration Index

El BHI (Maughan et al. 2016) es el estudio que sostiene el "todo cuenta", y para
eso sirve. Como sistema de puntos, no:

- Sus valores por bebida **no están impresos en el artículo**: hay que leerlos
  de una gráfica.
- **Ninguno es estadísticamente significativo**, salvo la leche y el suero oral.
- Son **15 a 17 hombres jóvenes por bebida**, sanos, en ayunas, ya hidratados,
  bebiendo 1 litro de golpe, seguidos 4 horas. Sin mujeres, sin niños, sin
  adultos mayores, sin enfermos, sin calor y sin ejercicio.
- Lo financió el **European Hydration Institute**, entidad creada con dinero de
  Coca-Cola y cerrada en 2015; el autor principal presidía su comité
  científico. Los datos no son falsos —los productos del financiador empataron
  con el agua, no ganaron— pero obliga a declararlo.

Dos reglas duras que salen de ahí: **ninguna bebida pasa de 1,00** (ni la leche,
aunque el estudio diga que retiene más líquido: en el momento en que una bebida
"vale más que el agua", la app deja de medir el cuerpo y empieza a repartir
puntos) y **ninguna bebida resta** (inventar una deuda es tan deshonesto como
regalar un bono).

### El alcohol

Apagado de fábrica, se prende en Ajustes, no existe para menores de edad. La
cerveza aporta su agua hasta **660 ml al día** (dos porciones, ~20 g de alcohol)
y después cero.

**Ese tope es el LÍMITE DE LA EVIDENCIA, no un umbral publicado.** El estudio
midió UNA cerveza al 4%. Más allá no hay dato, y donde no hay dato la app deja
de sumar: pedirá más agua, no menos.

### La cafeína

Se informa, no descuenta. La cafeína sí aumenta la orina desde unos **250 a 300
mg**, que no está lejos del consumo normal (2 o 3 tazas cargadas). Pero no
existe un factor publicado para convertir eso en menos líquido, así que no se
inventa ningún multiplicador.

Cifras del catálogo, comprobables: café colado ~45 mg/100 ml (una taza de 240 ml
trae unos 95 mg); té negro ~20 mg/100 ml; gaseosa de cola ~11 mg/100 ml (una
lata de 330 ml, entre 32 y 42 mg); energizante ~32 mg/100 ml (una lata de 250 ml,
80 mg).

### La salvaguarda que sostiene todo

**La racha es de REGISTRAR, no de cumplir.** Si hoy solo tomó gaseosa y lo
anotó, la racha sigue viva; solo se pierde la medalla del agua. Si la racha se
rompiera por no cumplir, lo racional sería dejar de registrar los días malos
—que son justo los que la app necesita ver.

### Fuentes de esta vuelta

- Maughan RJ et al. (2016), *A randomized trial to assess the potential of
  different beverages to affect hydration status*, Am J Clin Nutr — el BHI.
- Killer SC, Blannin AK, Jeukendrup AE (2014), *No evidence of dehydration with
  moderate daily coffee intake*, PLoS ONE.
- Zhang Y et al. (2015), meta-análisis sobre cafeína y balance de líquidos.
- EFSA (2010), *Dietary Reference Values for water*.
- IOM/NASEM (2004), *Dietary Reference Intakes for Water, Potassium, Sodium,
  Chloride, and Sulfate*.
- NHS, *Water, drinks and your health*; Harvard T.H. Chan School of Public
  Health, *The Nutrition Source: Water*.
- OMS (2023), directriz sobre edulcorantes no azucarados.
