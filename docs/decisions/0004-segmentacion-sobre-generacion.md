# ADR-0004 — Segmentación por encima de generación para preservar la identidad del producto

- **Estado:** Aceptado
- **Fecha:** 2026-06-13
- **Decide:** Paula Salazar
- **Afecta a:** los tres pipelines. Es la decisión estructural del proyecto.

## Contexto

El requisito de negocio no negociable de UniStudio es: **la foto final tiene que mostrar el producto que el cliente va a recibir.** Una foto de catálogo que muestra un bra distinto al que llega en la caja no es una foto bonita, es una devolución y una queja.

Durante los primeros meses se asumió lo contrario a lo que resultó ser cierto: que la infidelidad del resultado era un problema de *calidad* — mejor foto de entrada, mejor prompt, mejor proveedor — y que se arreglaría cambiando de modelo generativo.

El 2026-06-13 se probaron **SeedDream, Kolors y FASHN en modo alta calidad** sobre el mismo producto: un bra sin aro, con tirantes anchos y cierre frontal (REF 189307 / 212624). Fotos de entrada buenas.

**Los tres fallaron igual.** Los tres "normalizaron" la prenda a un push-up genérico con aro y tirantes finos.

## Decisión

Se adopta como principio de arquitectura:

> **Un modelo generativo no preserva un producto atípico. Lo reemplaza por el promedio de su dataset de entrenamiento.**

De ahí, la jerarquía obligatoria para cualquier paso que toque el producto:

| Prioridad | Técnica | Qué hace con los píxeles | Cuándo se usa |
|---|---|---|---|
| **1** | **Segmentación** (BiRefNet, Grounded SAM) | Recorta los píxeles **reales** del producto | Siempre que baste |
| **2** | **Warp** (Leffa, FASHN) | **Deforma** la prenda real sobre un cuerpo | Try-on donde la segmentación no llega |
| **3** | **Composición determinista** (Sharp, ffmpeg) | Pega el píxel original sobre un fondo generado | Estáticos, macro, kits sociales |
| **4** | **Generación** (SeedDream, Kolors, Flux) | **Dibuja un producto nuevo** | Último recurso, y siempre anclado por [ADR-0009](0009-claude-vision-anclaje-fidelidad.md) |

Corolarios operativos:

- **Un fallback nunca puede bajar de nivel en silencio.** Si el paso 1 cae de segmentación a generación, el resultado debe marcarse `regenerated = true` y avisar al usuario.
- **Cambiar un generativo por otro generativo no arregla la fidelidad.** Está prohibido gastar tiempo en esa ruta sin evidencia nueva.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Mejorar el prompt** | Se probó. El prompt cambia el estilo, no la capacidad del modelo de reproducir una prenda que no está en su distribución. |
| **Mejorar la foto de entrada** | Se probó. Las fotos de la prueba del 2026-06-13 eran buenas. El fallo no era de entrada. |
| **Fine-tuning sobre el catálogo de Unistyles** | 486 productos es un dataset diminuto, y el coste y el tiempo de entrenamiento superan el presupuesto completo del proyecto. |
| **Aceptar la infidelidad** como coste de la automatización | Rompe el requisito de negocio. Descartado sin discusión. |

## Consecuencias

**Positivas**

- Explica de golpe una familia entera de bugs que parecían independientes ("el bra cambia", "el frasco cambia", "la joya cambia de material").
- Da un criterio *a priori* para elegir proveedor, en vez de probar a ciegas.
- El pipeline de Estáticos gana una garantía fuerte y verificable: **el producto nunca pasa por un modelo generativo**; se compositea el píxel original sobre el fondo generado, así que etiqueta, vidrio y color quedan idénticos.

**Negativas / costo asumido**

- **La segmentación no puede hacerlo todo.** Un try-on necesita sí o sí deformar o generar. Ahí la fidelidad se compra con dinero y con anclaje textual, no con arquitectura.
- Se renuncia a resultados más "bonitos" que un generativo produciría, a cambio de que sean **el producto real**.
- Obliga a mantener un `identity-check` post-proceso (`/api/identity-check`) que compara entrada y salida — trabajo extra que un enfoque generativo puro no necesitaría.

## Evidencia

- **2026-06-13** — SeedDream, Kolors y FASHN sobre bra REF 189307/212624: los tres normalizan a push-up genérico. Registrado en `docs/providers.md` §3.3, ronda 1.
- **Regresión repetida dos veces**, que confirma el principio: el ghost de SeedDream se quitó del cascade el 2026-05-18 (`f1e4a59`) por inventarse el bra, se re-agregó el 2026-06-10 (`595c2df`) porque "volvió a funcionar", y se quitó otra vez el 2026-06-13. *"Volvió a funcionar"* significaba **dejó de dar error**, no *dejó de inventar*.
- **Lección transferible:** cuando un fallback "arregla" un paso que fallaba, hay que comprobar si lo arregló **inventando**.
