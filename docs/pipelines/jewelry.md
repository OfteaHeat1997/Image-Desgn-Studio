# Pipeline Joyería

> Para: Unistyles (Curaçao) — **82 productos** (aretes, cadenas, anillos, pulseras, topos, candongas, sets)

**Última actualización:** 2026-08-09
**Estado:** Funcional. Reescrito para arreglar dos bugs que lo dejaban sin producir nada, y rediseñado con la UX por pasos del pipeline de lencería.
**Ruta API:** No tiene ruta propia — la página orquesta módulos desde el cliente.
**Página UI:** `/pipelines/jewelry`
**Config y prompts:** `unistudio/src/lib/pipelines/jewelry.ts`

---

## Qué produce

Cinco entregables por pieza, de una sola foto de celular:

| # | Salida | Para qué sirve | Obligatorio |
|---|---|---|---|
| 1 | **Foto de catálogo** (packshot fondo blanco + sombra de contacto) | Publicar en Mercado Libre, Shopify, ficha de producto | Sí |
| 2 | **Escena de lujo** (terciopelo, mármol, seda, luz cálida) | Instagram, web, campañas | Sí |
| 3 | **Detalle macro** (zoom al eslabón, la piedra, el broche) | Prueba del acabado; la foto que el cliente amplía antes de pagar | Sí |
| 4 | **En modelo** (la pieza puesta sobre una modelo IA) | Contexto de uso y escala | Opcional |
| 5 | **Video** (cámara girando sobre la escena de lujo) | Reels, Stories | Opcional |

El recorte transparente y el paso de nitidez son intermedios: alimentan a los cinco de arriba y no se guardan en la galería.

---

## Los dos bugs que estaban rompiendo todo

### 1. El upscale calculaba el presupuesto de píxeles al revés

`/api/upscale` limitaba la imagen de **entrada** a 2M píxeles. Real-ESRGAN no revienta por la entrada sino por el tensor de **salida**: 2M × escala 2 = 8M píxeles, y el modelo intenta reservar ~5.7 GiB de una sola vez en las GPU compartidas de Replicate (14.6 GiB). Resultado en producción:

```
Failed to run model "nightmareai/real-esrgan:f121d640…"
Prediction failed: CUDA out of memory.
```

Y como el paso hacía *hard fail*, una sola caída de GPU dejaba a la usuaria sin packshot, sin estante, sin detalle, sin modelo y sin video.

**Arreglo:**
- El presupuesto ahora es sobre la **salida** (`MAX_OUTPUT_PIXELS = 4_000_000`); la entrada se deriva de la escala (escala 2 → 1M px).
- Hasta 3 reintentos, cada uno con el presupuesto a la mitad.
- Si Real-ESRGAN se agota → caída automática a **Clarity** (otro backend, aguanta cuadros mayores).
- Si todo falla y el llamador pasó `softFail: true`, la ruta devuelve **200 con la imagen original** y `data.skipped = true`. El pipeline de joyería lo usa siempre.

### 2. `/api/jewelry-tryon` rechazaba 3 de los 7 sub-tipos

`VALID_TYPES` no incluía `studs`, `hoops` ni `set`, así que **topos, candongas y sets fallaban siempre el paso "En modelo" con HTTP 400**. Collar y anillo pasaban, por eso el bug estaba oculto. Se agregaron los 3 sub-tipos a `VALID_TYPES`, a `PLACEMENT_PROMPTS`, a `EXHIBIDOR_BG_PROMPTS` y a `JEWELRY_COSTS` en `src/lib/processing/jewelry.ts`.

---

## Flujo técnico

```
FOTO ORIGINAL
      │
      ├─ /api/upload ──────────────► URL pública
      └─ /api/product-features ────► ficha Vision (material, acabado, piedras)
                                     nunca bloquea: si falla, se usa la plantilla del sub-tipo
      │
      ▼
[1] /api/bg-remove ..................... recorte transparente        $0.01
      ▼
[2] /api/upscale (softFail: true) ...... 2x resolución               $0.02
      │                                  si falla → sigue con la original
      ▼
      ├──[3] /api/bg-generate ......... packshot fondo blanco        $0.05
      ├──[4] /api/bg-generate ......... escena de lujo               $0.05
      ├──[5] /api/macro-crop .......... detalle macro (sharp, sin IA)   $0
      └──[6] /api/model-create
             + /api/jewelry-tryon ..... en modelo (opcional)         $0.10
      ▼
[7] /api/video (wan-2.2-fast) .......... video sobre [4] (opcional)  $0.05
```

Los pasos 3–6 corren en secuencia pero son **independientes entre sí**: cada uno decide si tiene con qué correr mirando el resultado de los anteriores. Ninguno aborta la cadena.

**Chequeo de identidad.** Después del packshot, la escena de lujo y el on-model, se dispara `/api/identity-check` en segundo plano. Si detecta que la joya cambió (oro → plata, otra piedra), pinta un aviso ámbar en la tarjeta. No bloquea el resultado.

---

## Por qué el detalle macro NO usa IA

Es la decisión de diseño más importante del pipeline. Una foto de detalle existe para **probarle al comprador** que el broche, los eslabones y el engaste son de verdad así. Un macro generado por IA inventa ese detalle — que es el peor modo de falla posible en joyería, porque es justo la foto que el cliente amplía antes de pagar.

`/api/macro-crop` (módulo nuevo, `src/lib/processing/macro-crop.ts`) recorta **píxeles reales** del PNG ya aislado, con `sharp`:

1. `trim()` quita el margen transparente.
2. Se lee el canal alpha en una grilla de 64×64.
3. Una **imagen integral** encuentra la ventana con más masa opaca — el dije de un collar, no un tramo fino de cadena.
4. Los empates se rompen hacia la ventana más cercana al centro de masa. Sin esto, una pieza más chica que la ventana quedaba tirada en la esquina del encuadre.
5. `extract()` + `lanczos3` + `sharpen()` y compuesto sobre un fondo sobrio.

Costo: $0. Alucinación: cero.

---

## Sub-tipos y prompts

| subType | Escena de lujo | Modelo IA muestra | Zoom del macro |
|---|---|---|---|
| `earrings` | Terciopelo negro, luz cálida lateral | Orejas visibles, pelo recogido | 2.6× |
| `studs` | Terciopelo con macro de facetas | Close-up de lóbulo | 3.4× (pieza diminuta) |
| `hoops` | Terciopelo, luz siguiendo la curva | Oreja y mandíbula | 2.4× |
| `necklace` | **Ghost neckline** — ver abajo | Clavícula y escote | 2.2× |
| `ring` | Cojín de seda crema | Mano en pose, dedo anular | 3.0× |
| `bracelet` | Rampa acrílica sobre nogal | Muñeca relajada | 2.8× |
| `set` | Mármol Carrara, piezas coordinadas | Torso con orejas y escote | 2.0× |

### Ghost neckline (collares)

La referencia de fotografía de joyería para collares **no** es un busto de cuero: es la pieza colgando de un cuello invisible, con la caída que le da la gravedad. Un collar fotografiado plano se ve muerto en la ficha; colgado se lee el largo real y cómo cae el dije, que es exactamente lo que la compradora quiere saber. El `estantePrompt` de `necklace` pide explícitamente el efecto ghost mannequin sin busto ni persona.

### El guard `PRESERVE`

Todos los prompts de escena pasan por `withJewelryPreserve()`, que agrega:

> *preserve the EXACT jewelry piece from the input image — same shape, same metal color, same gems, same engravings, same proportions. Only modify the background/scene around it.*

Sin esto, un prompt que describe el ambiente puede disparar que Kontext reinterprete la joya y un collar dorado salga plateado.

---

## Costos por pieza

| Configuración | Costo |
|---|---|
| Solo las 3 fotos obligatorias (catálogo + lujo + detalle) | **$0.13** |
| Con foto en modelo | **$0.23** |
| Con foto en modelo y video | **$0.28** |

El detalle macro es gratis. El paso de nitidez cuesta $0.05 en vez de $0.02 si tiene que usar el respaldo Clarity, y $0 si se salta.

---

## UX

La página replica el patrón del pipeline de lencería: fase de configuración → fase de pipeline con una tarjeta vertical por paso. Cada tarjeta trae ícono, número, badge de estado, costo, botón "i" con documentación desplegable (qué hace / proveedor / tiempo / costo / qué puede fallar / qué podés hacer), comparador antes-después deslizable, vista grande al pasar el mouse (hover-intent de 180 ms) y **Aceptar / Rehacer / Saltar** por paso.

Las primitivas de UI viven en `unistudio/src/components/pipeline/primitives.tsx`, parametrizadas por props en vez de leer el i18n de lencería. **Pendiente:** migrar lencería a esas primitivas — hoy tiene sus propias copias inline, y ese archivo es zona activa de otra terminal (ver `COORDINATION.md`).

Todo el texto sale de `unistudio/src/lib/i18n/pipelines/jewelry.ts`, ES y EN con el mismo shape.

---

## Troubleshooting

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `CUDA out of memory` en el paso de nitidez | La GPU compartida de Replicate se saturó | Ya no frena nada: el paso queda en "Saltado" con aviso ámbar y el resto corre igual |
| "En modelo" da HTTP 400 | Sub-tipo no soportado | Ya arreglado para los 7. Si vuelve a pasar, revisá que `VALID_TYPES` en `/api/jewelry-tryon` siga sincronizado con `JewelrySubType` |
| La joya cambia de color en la escena de lujo | Kontext reinterpretó la pieza (pasa con fotos de bajo contraste) | El aviso ámbar del chequeo de identidad lo señala. Rehacé el paso — varía entre intentos |
| El detalle macro apunta al lugar equivocado | El paso 1 dejó fondo pegado a la pieza | Rehacé el paso 1; el macro se recalcula solo |
| El video falla | La escena de lujo no salió | Aceptá primero el paso 4; el video se arma sobre esa foto |
| El recorte se come parte de la cadena | Fondo cargado o poca luz | Foto sobre fondo liso y contrastante |

---

## Módulos que orquesta

| Módulo | Ruta | Uso |
|---|---|---|
| `upload` | `/api/upload` | Pre-upload |
| `product-features` | `/api/product-features` | Ficha Vision de ESTA pieza |
| `bg-remove` | `/api/bg-remove` | Aislar la pieza |
| `upscale` | `/api/upscale` | 2x con `softFail` y respaldo Clarity |
| `bg-generate` | `/api/bg-generate` | Packshot y escena de lujo |
| `macro-crop` | `/api/macro-crop` | Detalle macro con píxeles reales |
| `model-create` | `/api/model-create` | Modelo IA por parte del cuerpo |
| `jewelry-tryon` | `/api/jewelry-tryon` | Colocación sobre la modelo |
| `identity-check` | `/api/identity-check` | Aviso si la joya cambió |
| `video` | `/api/video` | wan-2.2-fast sobre la escena de lujo |

---

## Experimento pendiente

La investigación de 2026 apunta a que **Seedream 4.5** gana en "hero shot" de metal y materiales, que es exactamente joyería, mientras que **Flux Kontext** sigue siendo el mejor preservando un producto real en una edición. Hoy usamos Kontext para las dos escenas porque preservar la pieza pesa más que el brillo. Vale medir Seedream para la escena de lujo (donde la fidelidad importa un poco menos que el impacto) — **no cambiado en este ciclo**, para no mover dos variables a la vez.
