# ADR-0009 — Todo proveedor que acepte texto recibe la ficha de producto generada por Claude Vision

- **Estado:** Aceptado
- **Fecha:** 2026-08-08
- **Decide:** Paula Salazar
- **Afecta a:** `/api/product-features`, `/api/analyze-image`, los tres pipelines

## Contexto

[ADR-0004](0004-segmentacion-sobre-generacion.md) establece que un modelo generativo reemplaza el producto por el promedio de su dataset. Pero hay pasos — el try-on, sobre todo — donde no se puede evitar el generativo.

En esos pasos la pregunta pasa a ser: **¿cómo se le impide al modelo que promedie?**

La respuesta habitual es prompt engineering escrito a mano. Se comparó eso contra una descripción **generada automáticamente por Claude Vision** a partir de la propia foto del producto.

## Decisión

Antes de cualquier paso generativo, se analiza la foto con **Claude Vision** (`/api/product-features`) y se produce una ficha estructurada del producto. Esa ficha se pasa a **todos** los proveedores que acepten texto.

**Regla transversal:**

> Todo proveedor que acepte texto **debe** recibir el `garmentDescription` de Claude Vision.
> Es la palanca de fidelidad más barata que existe.

En la interfaz esto se muestra al usuario como los chips verdes **"Lo que la IA ve en tu foto"** (`frasco piramidal · vidrio transparente · tapa rosca · marca legible`), que sirven de confirmación visible de que el análisis corrió.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| **Descripción escrita a mano** por el usuario | Peor resultado medido. Una persona escribe *"bra beige con cierre delante"*; Claude Vision escribe *"cierre frontal: múltiples ganchos centrales verticales"* — y el modelo generativo necesita ese nivel de detalle. Además no escala a 486 productos. |
| **Sin descripción**, solo imagen | El try-on **se inventa una cremallera** donde hay ganchos. Sin anclaje, el modelo rellena con lo más probable de su dataset. |
| **Plantilla por categoría** (una descripción fija por tipo de producto) | Describe la categoría, no el producto. No captura lo que hace único a *este* bra, que es justo lo que un generativo pierde. |

## Consecuencias

**Positivas**

- **Mejor resultado que la descripción manual**, medido. Con el anclaje salen los ganchos reales y hasta el panel de malla lateral.
- Es barato: una llamada a Claude por foto, cacheada.
- Escala a los 486 productos sin trabajo humano.
- Da un artefacto **visible y auditable** al usuario (los chips verdes), que convierte un paso invisible en una comprobación.

**Negativas / costo asumido**

- Añade una dependencia de `ANTHROPIC_API_KEY` en el camino crítico de fidelidad. Si falta, los pasos generativos degradan en calidad de forma silenciosa.
- Añade latencia antes del paso caro.
- **El cableado se rompe sin hacer ruido.** La ficha puede estar generada y no llegar al proveedor: no da error, solo empeora el resultado. Ya pasó una vez (ver Evidencia). Requiere comprobación explícita, no confianza.

## Evidencia

- **2026-08-08** — hallazgo registrado en `docs/providers.md` §3.5:
  > El `garmentDescription` que genera Claude Vision automáticamente (`cierre frontal: múltiples ganchos centrales verticales`) da **mejor resultado que una descripción escrita a mano**. Sin ese anclaje el try-on inventa una cremallera; con él salen los ganchos reales y hasta el panel de malla lateral. **No toques ese camino.**
- **2026-08-10** (`982e82c`) — *fix(lingerie): Uwear ahora SÍ recibe la ficha de Claude Vision.* Confirma el modo de fallo: la ficha existía, el proveedor no la recibía, y nada fallaba visiblemente — solo bajaba la fidelidad.
- **2026-08-10** (`4e10f0a`) — *fix(static-product): mata los frascos fantasma — quitar palabras "bottle/product".* El contenido del prompt importa tanto como su presencia: nombrar el objeto genérico hacía que el modelo dibujara uno de más.
