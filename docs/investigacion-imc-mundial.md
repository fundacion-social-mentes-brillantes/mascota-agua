# IMC y comparación mundial

Consultado el 13 de agosto de 2026. Fuente de verdad para `src/lib/imc.ts`.

**Recordatorio de diseño**: esta app **no es para bajar de peso**. El IMC está
aquí por dos razones y ninguna es el espejo:

1. El peso entra en el cálculo del agua.
2. Sebastián pidió explícitamente saber "cómo estoy a nivel mundial".

Por eso los textos de `FRASES` en `imc.ts` no felicitan ni regañan a nadie, y
la app repite en pantalla que el IMC "es apenas una foto de lejos".

---

## 1. Puntos de corte de la OMS (personas adultas)

| IMC | Categoría |
|---|---|
| < 18,5 | Bajo peso |
| 18,5 – 24,9 | Peso normal |
| 25,0 – 29,9 | Sobrepeso |
| 30,0 – 34,9 | Obesidad grado 1 |
| 35,0 – 39,9 | Obesidad grado 2 |
| ≥ 40,0 | Obesidad grado 3 |

### Limitaciones que la app reconoce en pantalla

- **No distingue músculo de grasa.** Alguien musculoso sale "sobrepeso".
- **No sirve igual antes de los 20 años**: ahí se usan percentiles por edad y
  sexo, no esta tabla. La app lo advierte por debajo de 20.
- **Después de los 65** los rangos pierden precisión. La app también lo dice.
- En población asiática varias entidades usan cortes más bajos (23 para
  sobrepeso, 27,5 para obesidad). La app usa los cortes generales de la OMS.

---

## 2. Los datos mundiales

NCD Risk Factor Collaboration (NCD-RisC), *Worldwide trends in underweight and
obesity from 1990 to 2022*, The Lancet, marzo de 2024. Es la fuente más
completa que existe: 3.663 estudios poblacionales, 222 millones de personas,
200 países.

Cifras de 2022 en personas adultas:

| Indicador | Valor |
|---|---|
| Obesidad en mujeres | **18,5%** |
| Obesidad en hombres | **14,0%** |
| Sobrepeso global (todas las edades adultas) | **28,0%** |
| Obesidad global | **16,06%** |
| Sobrepeso + obesidad (IMC ≥ 25) | **≈ 44%** |
| Personas con obesidad en el mundo | más de mil millones (880 M adultos) |

---

## 3. Cómo se calcula el percentil que ve la persona

NCD-RisC publica **prevalencias**, no la curva completa de la distribución.
Así que la app la **estima** modelando el IMC como una distribución
log-normal, y ajustando los parámetros hasta que reproduzca las prevalencias
reales de arriba.

Parámetros que quedaron en `src/lib/imc.ts`:

```
mujer:  media 25,2   desviación 5,8
hombre: media 24,9   desviación 4,7
```

### Comprobación contra los datos reales

| | Modelo | Real (NCD-RisC 2022) |
|---|---|---|
| Mujeres, IMC ≥ 30 | 18,9% | 18,5% ✅ |
| Hombres, IMC ≥ 30 | 13,8% | 14,0% ✅ |
| Mujeres, IMC ≥ 25 | 46,9% | ~44% ✅ |
| Hombres, IMC ≥ 25 | 45,4% | ~44% ✅ |
| Mujeres, IMC < 18,5 | 10,6% | ~5% ⚠️ |
| Hombres, IMC < 18,5 | 6,8% | ~6% ✅ |

**Limitación honesta**: una log-normal no puede ajustar bien las dos colas a
la vez. El modelo **sobrestima la cola baja en mujeres** (dice 10,6% donde lo
real ronda 5%). En la práctica esto significa que a una mujer con IMC muy bajo
la app le dará un percentil algo más alto del que le corresponde. La zona
central —donde está la enorme mayoría de la gente— sí queda bien ajustada, y
en pantalla el texto dice "cerca del X%", no una cifra exacta.

---

## 4. Cómo se comunica (y cómo NO)

La app usa lenguaje neutro, sin juicio y sin llamados a la acción sobre el
peso. Ejemplos de la diferencia:

| Mal | Como quedó en la app |
|---|---|
| "Estás en sobrepeso, deberías bajar de peso" | "Tu índice está por encima del rango de referencia de la OMS. El IMC no distingue músculo de grasa, así que es apenas una foto de lejos." |
| "¡Felicitaciones, peso ideal!" | "Tu índice está dentro del rango de referencia de la OMS." |
| "Obesidad grado 2 — riesgo alto" | "Tu índice está en el rango que la OMS llama obesidad grado 2. Aquí sí tiene sentido que un profesional lo mire contigo." |
| "Eres más gordo que el 80% del mundo" | "Cerca del 80% de los adultos del mundo tiene un índice más bajo que el tuyo." |

Además, debajo del resultado la app aclara siempre: *"Esta app no es para
bajar de peso. El peso entra solo porque el agua que necesitas depende de él."*

---

## 5. ¿La estatura debería entrar en el cálculo del agua?

**No.** La evidencia relaciona la necesidad de líquidos con el **peso** y el
gasto energético (existen fórmulas por superficie corporal —Du Bois,
Mosteller— y la regla de 1 mL por kcal), pero la regla clínica de uso común y
mejor respaldada es la de **mL por kg de peso**. Meter la estatura en la
fórmula del agua daría una falsa sensación de precisión.

Por eso en esta app la estatura se pide **solo** para el IMC.

---

## Fuentes

- [NCD-RisC — Worldwide trends in underweight and obesity from 1990 to 2022 (The Lancet, 2024)](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(23)02750-2/fulltext)
- [NCD-RisC — el mismo estudio en PubMed](https://pubmed.ncbi.nlm.nih.gov/38432237/)
- [The Lancet / EurekAlert — más de mil millones de personas viven con obesidad](https://www.eurekalert.org/news-releases/1035924)
- [NCD-RisC — publicaciones](https://www.ncdrisc.org/publications.html)
- [World Obesity Federation — prevalencia de obesidad](https://www.worldobesity.org/about/about-obesity/prevalence-of-obesity)
- [American College of Cardiology — resumen del estudio](https://www.acc.org/Latest-in-Cardiology/Journal-Scans/2024/03/12/17/28/worldwide-trends-in-underweight)
