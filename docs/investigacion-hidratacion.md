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
