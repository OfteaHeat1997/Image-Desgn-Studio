# Uwear Accuracy Playbook — cómo llegar a su nivel de exactitud

> Análisis de por qué Uwear.ai produce catálogos tan consistentes/exactos, y cómo
> trasladar esos conceptos a los 3 pipelines de UniStudio (lencería, estáticos, joyería).
>
> **Fecha:** 2026-06-13 · **Fuente:** `UWEAR.md` (referencia oficial de su API) + UI del studio.

---

## 1. El "secreto" NO es el modelo de IA — es la arquitectura de assets reutilizables

La intuición común es "tienen mejor modelo". Falso. Uwear usa los mismos modelos base que
nosotros (SeedDream, Gemini, GPT Image, Qwen). Lo que los hace exactos es que **no generan
desde un prompt suelto cada vez**. Convierten cada pieza del shoot en un **asset estructurado y
reutilizable** que se combina:

| Asset (Uwear) | Qué es | Por qué da exactitud |
|---|---|---|
| **Clothing Item** | La prenda como entidad: foto **frente + espalda** + descripción AI (`description`, `description_back`) + metadata (SKU…) | El producto se describe UNA vez, bien, y se reusa. El modelo nunca "adivina" la prenda. |
| **Avatar** | Identidad de modelo guardada y reusable | La MISMA modelo en todo el catálogo → consistencia entre SKUs y entre vistas. |
| **Art Direction** | Brief creativo estructurado: mood, environment, lighting, color, texture, camera/framing | El "look" es un preset, no un prompt improvisado. Ej. "Basic white photoshoot" dice literal: *preserve fabric texture, stitching, closures; true-to-garment color*. |
| **Location** | Escena/fondo guardado y reusable | Fondos coherentes sin re-describirlos. |
| **Camera presets** | Vistas con nombre (`full_body_front`, `back_shot`…) | Encuadres deterministas, no "a ver qué sale". |
| **QA loop** | `do_qa` + `max_qa_retries` | Auto-revisión y reintento si el resultado no pasa. |
| **Model-per-task** | `model_slug` elegido por trabajo | Qwen Intimate para íntimos, SeedDream para detalle, etc. |
| **Batch + manifest** | 1 job estructurado por SKU compartiendo el brief | Escala sin perder consistencia. |

**Conclusión:** exactitud = **prompt corto + assets estructurados ricos**. Nosotros hoy
hacemos lo contrario en partes: prompts largos improvisados por step, sin assets reutilizables.

---

## 2. Qué tenemos hoy vs Uwear (gap analysis)

| Concepto | Uwear | Lencería | Estáticos | Joyería |
|---|---|---|---|---|
| Prenda estructurada (frente+espalda+desc) | ✅ Clothing Item | 🟡 parcial (`productSpec` de Claude Vision, no formalizado; foto espalda opcional) | n/a (producto, no prenda) | 🟡 (subType + material) |
| Identidad de modelo reusable | ✅ Avatar | 🟡 reuso por seed + picker de modelos guardadas | n/a (sin modelo) | 🟡 model-create por sesión |
| **Art Direction (brief reutilizable)** | ✅ | ❌ **no existe** (prompts ad-hoc por step) | 🟡 matriz de fondo por categoría/marca (¡es un proto-art-direction!) | 🟡 matriz de fondo por subType |
| Camera presets nombrados | ✅ | 🟡 `poseOverride` (auto/frontal/espalda/…) | n/a | 🟡 posición por subType |
| QA + retry automático | ✅ | 🟡 validación en AI Agent, no en el pipeline | ❌ | ❌ |
| Model-per-task | ✅ `model_slug` | ✅ selector de proveedor (seedream/leffa/uwear/…) | n/a | n/a |
| Producto pixel-perfect | (generativo) | ❌ (regenera) | ✅ **composite-first** (mejor que Uwear para envases) | 🟡 upscale + composite |

**Observaciones clave:**
- **Estáticos ya nos gana a Uwear** en fidelidad de producto (composite-first = pixeles reales).
  La "matriz de fondo por categoría/marca" ES un sistema de art-direction primitivo.
- **Lencería es donde más falta** la capa de assets reutilizables (sobre todo Art Directions).

---

## 3. Lo que más mueve la aguja (priorizado, para lencería primero)

1. **Art Directions (briefs reutilizables)** ⭐ mayor impacto/consistencia. Un set de presets
   ("Catálogo blanco", "Editorial suave", "Lifestyle", etc.) con campos estructurados
   (mood/lighting/background/color/texture) que se inyectan al prompt de cada step. Convierte
   prompts improvisados en un look consistente y elegible.
2. **Galería de modelos demo + avatar reusable** — un set curado de modelos para elegir al
   inicio (como el grid demo de Uwear) + fijar UNA identidad para todo el catálogo.
3. **QA loop** — validar el resultado (¿se ve la prenda? ¿color correcto?) y reintentar 1 vez.
4. **Formalizar la prenda como asset** (frente+espalda+`productSpec`) y pasarlo entero a try-on.
5. **Apoyarse en la API de Uwear** para lo que ellos ya resolvieron: `art_direction_id`,
   `avatar_id`, `do_qa` en `tryOnUwear()` — en vez de reconstruir TODO el motor.

---

## 4. Recomendación honesta

No reconstruir Uwear entero (es años de trabajo). Dos caminos combinables:

- **Camino A — "usar lo de ellos":** en `tryOnUwear()` exponer `art_direction_id`, `avatar_id` y
  `do_qa`. Creás tus art directions y avatares EN Uwear una vez y los reusás vía API. Mínimo
  código, máxima exactitud, ya validado.
- **Camino B — "tener lo propio":** construir en la UI de lencería un selector de **Art Directions**
  (presets locales) + **galería de modelos demo**, inyectando el brief a los prompts de los steps
  existentes (model-create, tryon, photoBack…). Más trabajo, pero funciona con cualquier proveedor
  y queda dentro de tu producto.

Para empezar y ver impacto rápido: **Art Directions en lencería** (preset "Catálogo blanco" que
preserva textura/cierre como el de Uwear) es el mejor primer paso.

---

## 5. Roadmap sugerido (incremental, sin romper los 3 pipelines)

1. **Art Directions presets** en lencería (selector + inyección al prompt). Reusar el concepto en
   Estáticos/Joyería después (ya tienen matrices de fondo que encajan).
2. **Galería de modelos demo** + fijar avatar para el catálogo.
3. **QA loop** (validación + 1 retry) compartido como módulo entre los 3 pipelines.
4. **Asset "prenda"** formal (frente+espalda+spec) reutilizado por todos los steps de lencería.

> Regla del repo: estas mejoras van DENTRO de los 3 pipelines existentes. NO crear un 4º pipeline.
> Lo compartido (QA loop, art directions) vive en un módulo y se llama desde cada pipeline.
