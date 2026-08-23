# Documentación de UniStudio

Esta documentación está organizada con **[Diátaxis](https://diataxis.fr/)**, que separa la documentación en cuatro tipos según **qué necesita el lector en ese momento**. Un documento que intenta hacer las cuatro cosas a la vez no hace bien ninguna.

| | **Orientado a la práctica** | **Orientado al conocimiento** |
|---|---|---|
| **Para aprender** | **Tutorial** — te lleva de la mano la primera vez | **Explanation** — te da el porqué y el contexto |
| **Para trabajar** | **How-to** — resuelve una tarea concreta | **Reference** — describe qué existe, sin más |

La pregunta que resuelve cada cuadrante:

- **Tutorial** — *"soy nueva, ¿por dónde empiezo?"*
- **How-to** — *"necesito hacer X, ¿cómo?"*
- **Reference** — *"¿cuál era el nombre exacto / el coste / el parámetro?"*
- **Explanation** — *"¿por qué está hecho así y no de otra forma?"*

---

## Tutorial — empezar de cero

| Documento | Qué te da |
|---|---|
| [`../README.md`](../README.md) | Qué es UniStudio y cómo levantarlo en 5 comandos |
| [`../unistudio/README.md`](../unistudio/README.md) | Setup de desarrollo, variables de entorno, build |
| [`guia-completa.md`](guia-completa.md) | Recorrido completo del proyecto en español ⚠️ |

⚠️ `guia-completa.md` mezcla los cuatro tipos a la vez (tutorial + referencia + explicación) y no se actualiza desde el **2026-04-20**. Está pendiente de dividir.

## How-to — resolver una tarea

| Documento | Cuándo lo abres |
|---|---|
| [`pipelines/README.md`](pipelines/README.md) | Elegir pipeline y entender las reglas que los gobiernan |
| [`pipelines/lingerie.md`](pipelines/lingerie.md) | Procesar bras, panties, shapewear, bodysuits, fajas |
| [`pipelines/static-product.md`](pipelines/static-product.md) | Procesar perfumes, cremas, bloqueador, maquillaje |
| [`pipelines/jewelry.md`](pipelines/jewelry.md) | Procesar aretes, cadenas, anillos, pulseras, sets |
| [`pipelines/jewelry-brand.md`](pipelines/jewelry-brand.md) | Aplicar identidad de marca al pipeline de joyería |
| [`research/uwear-accuracy-playbook.md`](research/uwear-accuracy-playbook.md) | Exprimir la fidelidad de Uwear paso a paso |

## Reference — consultar un dato

| Documento | Qué contiene |
|---|---|
| [`providers.md`](providers.md) | **Qué proveedor corre cada paso, cuánto cuesta, qué se probó y qué se descartó.** El más consultado |
| [`reference/api-routes.md`](reference/api-routes.md) | Las 51 rutas API: método, timeout y función |
| [`reference/data-model.md`](reference/data-model.md) | 7 modelos de Prisma, 7 stores de Zustand, capas de almacenamiento |
| [`reference/video-audio.md`](reference/video-audio.md) | 7 proveedores de video, 5 de avatar, 2 de voz |
| [`modules/README.md`](modules/README.md) | Índice de los 18 módulos ⚠️ |
| [`inventory.md`](inventory.md) | Catálogo de Unistyles: 486 productos, 9 categorías |
| [`design-system.md`](design-system.md) | Tokens de diseño, color, tipografía |

⚠️ `modules/README.md` no se actualiza desde el **2026-04-20** y contradice a `providers.md` en el proveedor de try-on (dice SeedDream primario; el default real es Uwear desde el 2026-08-08). **`providers.md` es la fuente de verdad.**

## Explanation — entender el porqué

| Documento | Qué explica |
|---|---|
| [`decisions/`](decisions/) | **11 ADR**: las decisiones de arquitectura con su evidencia medida |
| [`architecture.md`](architecture.md) | Arquitectura en arc42 + C4: objetivos, restricciones, riesgos, deuda |
| [`process/README.md`](process/README.md) | **Double Diamond + DOT Framework**: cómo se investigó y qué se descartó |
| [`pipelines/lingerie-root-cause.md`](pipelines/lingerie-root-cause.md) | Las causas raíz del pipeline de lencería |
| [`UX_UI_GUIDE.md`](UX_UI_GUIDE.md) | Criterios de UX/UI de la aplicación |

---

## Por dónde empezar según quién seas

| Si eres… | Lee en este orden |
|---|---|
| **Nueva en el proyecto** | [README](../README.md) → [`architecture.md`](architecture.md) §1-5 → [`decisions/0004`](decisions/0004-segmentacion-sobre-generacion.md) |
| **Vas a cambiar un proveedor** | [`providers.md`](providers.md) → el [ADR](decisions/) correspondiente → §7 de providers ("lo que NO hay que volver a probar") |
| **Vas a tocar un pipeline** | [`pipelines/README.md`](pipelines/README.md) → el how-to del pipeline → [`architecture.md`](architecture.md) §5.3 |
| **Estás evaluando el proyecto** | [`process/README.md`](process/README.md) → [`decisions/`](decisions/) → [`architecture.md`](architecture.md) §11 (riesgos) |
| **Algo está roto en producción** | `GET /api/health` → [`providers.md`](providers.md) §5 → [`architecture.md`](architecture.md) §11 |

---

## Reglas de mantenimiento

Estas reglas son las que impiden que la documentación se pudra. Todas se cumplen **en el mismo commit** que el cambio de código.

1. **Un cambio de proveedor actualiza `providers.md` y su ADR** — no en un commit posterior.
2. **Un ADR aceptado no se edita ni se borra.** Si la decisión cambia, se escribe uno nuevo que lo reemplaza. El historial es el valor.
3. **Una afirmación sin fecha ni medición no entra.** `providers.md` etiqueta cada afirmación como PROBADO / DESCARTADO / SIN VERIFICAR / HIPÓTESIS.
4. **Lo que falló se escribe con el porqué.** Un proveedor descartado sin explicación se vuelve a probar dentro de tres meses.
5. **Un documento nuevo declara su tipo Diátaxis** en la primera línea, y respeta ese tipo. Si necesita ser dos cosas, son dos documentos.

---

## Fuera del repositorio

Research en curso, notas personales, preparación de entrevistas, datos crudos y código muerto viven fuera de GitHub, en:

```
C:\Users\maria\Documents\UniStudio-Workspace\
```

Ahí están `interview-prep/`, `research/`, `planning/`, `inventory-data/`, `guides-html/`, `generated-output/` y `archive-dead-code/`, cada una con su propio README.

## Documentos con estado dudoso

Honestidad sobre lo que está a medias, en vez de dejarlo pasar:

| Documento | Problema |
|---|---|
| [`pipelines/jewelry-pendientes.md`](pipelines/jewelry-pendientes.md) | Es una lista de tareas, no documentación. Debería vivir en el gestor de tareas |
| [`prompt-investigacion-ux-tipografia.md`](prompt-investigacion-ux-tipografia.md) | Es un prompt de investigación, no documentación del producto |
| [`guia-completa.md`](guia-completa.md) | Mezcla los cuatro tipos Diátaxis. Desactualizado desde 2026-04-20 |
| [`modules/README.md`](modules/README.md) | Contradice a `providers.md` en el proveedor de try-on |
| [`UX_UI_GUIDE.md`](UX_UI_GUIDE.md) | Se solapa con `design-system.md`. Sin actualizar desde 2026-04-20 |
