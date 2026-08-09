# Pipeline Lencería — Informe de causas raíz

Fecha: 2026-08-09
Alcance: solo lencería. No se tocó joyería ni static-product. No se hicieron commits.

**Cómo leer este informe.** Cada afirmación está marcada:

- **[CÓDIGO]** = verificado leyendo el archivo, con `file:line`.
- **[DOC]** = verificado contra documentación/API externa (fal, FASHN, paper de Leffa).
- **[HIPÓTESIS]** = razonamiento no verificado; hay que probarlo.

Contexto dado por la usuaria y NO re-derivado aquí: Paso 1 funciona con Photoroom
sandbox; Paso 2 funciona con Uwear; Paso 3 funciona con `auto`; Paso 4 pierde los
tirantes; Uwear no rota; SeedDream está descartado; nada inventado.

---

## 1. Tabla maestra: paso → síntoma → causa raíz → arreglo → confianza

| # | Paso | Síntoma | Causa raíz | Arreglo propuesto | Confianza |
|---|---|---|---|---|---|
| 1 | **Paso 4 Espalda** | El racerback desaparece; sale bandeau | **A Leffa no le llega la espalda: le llega un ghost FRONTAL regenerado.** `page.tsx:2943-2955` aísla la foto de espalda con `isolateMethod:"auto"`; `bg-remove/route.ts:928-933` en `auto` corre Photoroom ghost PRIMERO, y ese prompt dice literal `'STRAIGHT FRONT VIEW ONLY'` y `'do NOT render the back'` (`bg-remove/route.ts:804,811-812`). O sea: el paso convierte la foto trasera en un frente dibujado y después lo warpea sobre una espalda. **[CÓDIGO]** | Aislar la espalda con `isolateMethod:"grounded-sam"` (píxeles reales, nunca redibuja) o con `"photoroom-sandbox"` sólo si se añade un prompt de vista trasera. Nunca `"auto"` para una vista que no es frontal. | **Alta** |
| 2 | **Paso 4 Espalda** | Idem | **Leffa estructuralmente no puede.** Su máscara es el `AutoMasker` de CatVTON (SCHP LIP/ATR + DensePose). El **pelo es región protegida**, y en una modelo de espaldas el pelo cubre justo la zona del cruce de tirantes → esa zona se copia del original y jamás puede recibir un tirante. Además VITON-HD y DressCode son datasets **sólo frontales**. El endpoint de fal **no expone** `mask`, `vt_repaint`, `preprocess_garment` ni `vt_model_type`: no hay perilla que tocar. **[DOC]** | No seguir puliendo Leffa para la espalda. Migrar el Paso 4 a `fal-ai/fashn/tryon/v1.6` con `segmentation_free:true` (maskless, pixel-space — elimina la causa) y `moderation_level:"permissive"`. Alternativa con texto: `fal-ai/flux-pro/v1/vto` (tiene `prompt` obligatorio → se le puede describir el racerback). | **Alta** (diagnóstico) / **Media** (que FASHN lo resuelva: su soporte de back-pose está en marketing, no en la doc de referencia) |
| 3 | **Paso 4 Espalda** | Idem, y también afecta al Paso 3 y a Leffa en Paso 2 | **La ruta asíncrona no aplana la prenda a fondo blanco.** `tryon/route.ts:192-199` sí hace `flattenToWhite` antes de Leffa/Kolors, con el comentario de que un PNG transparente ancla peor. `tryon/async/route.ts:140-147` **no lo hace**: manda el aislado transparente tal cual. Los dos caminos usan el MISMO modelo con entradas distintas. **[CÓDIGO]** | Copiar el `flattenToWhite` (con el mismo gate `LINGERIE_FLATTEN`) a `tryon/async/route.ts` antes de `submitFal`. Cambio de 6 líneas. | **Alta** (la divergencia es real) / **Media** (que sea la causa del strap loss) |
| 4 | **Paso 4 Espalda** | Idem | **Leffa corre con todos los parámetros en default.** `tryon/async/route.ts:143-147` sólo manda `human_image_url`, `garment_image_url`, `garment_type`. No manda `num_inference_steps` (default 50), `guidance_scale` (default 2.5), `seed`, ni `output_format`. Con `seed` libre el resultado no es reproducible entre corridas, así que "probé y salió peor" no es concluyente. **[CÓDIGO + DOC]** | Fijar `seed` y `output_format:'png'` para poder comparar A/B de verdad. Subir `guidance_scale` no va a devolver tirantes (el problema es la máscara), pero fijar el seed es prerequisito para cualquier experimento. | **Alta** |
| 5 | **Paso 4 Espalda** | Idem | **El recorte 3:4 del avatar deja la entrada fuera de distribución.** `tryon/async/route.ts:105-108` recorta una ventana vertical del 6% al 46% de alto. VITON-HD entrena con la persona completa a 768×1024. **[HIPÓTESIS]** | Probar sin recorte (avatar entero) una vez que #1 y #3 estén arreglados, para aislar variables. | **Baja** |
| 6 | **Paso 2 Frontal** | "Uwear conserva el cierre porque recibe la ficha" — pero en claros se sigue perdiendo | **`garmentDescription` LLEGA a `tryOnUwear` y SE TIRA.** `tryon/route.ts:249` declara el parámetro, `tryon/route.ts:271-278` llama a `createUwearClothingItem` **sin** `description`, y el prompt (`tryon/route.ts:283-291`) tampoco lo interpola. El comentario `tryon/route.ts:267-270` dice que es a propósito. Mientras tanto `page.tsx:3230-3243` justifica hacer Uwear el default **precisamente** porque "SÍ recibe garmentDescription". El cliente lo soporta: `uwear.ts:155-156,180-181` mandan `description` y `description_back`. **[CÓDIGO]** | Pasar `description: garmentDescription` a `createUwearClothingItem`. Y armar un `descriptionBack` desde `spec.garment.backClosure + strapStyle` para mandarlo junto a la foto trasera. Es el arreglo de mayor impacto y menor esfuerzo del informe. | **Alta** |
| 7 | **Paso 2 Frontal** | Con el default "Recomendado (Uwear)" Uwear no recibe la foto de espalda | **`smartTryOn` pasa `undefined` como `garmentBackUrl`**: `tryon/route.ts:465`. Y del lado del cliente, `page.tsx:3277` sólo manda `garmentBackUrl` cuando `providerOverride === "uwear"` **elegido a mano** — con el default (`"auto"`) nunca se manda. Resultado: la opción etiquetada "Recomendado" es la que menos datos recibe. **[CÓDIGO]** | Propagar `garmentBackUrl` en `smartTryOn` y mandarlo desde la página siempre que el proveedor resuelto pueda ser Uwear (o simplemente siempre — los demás lo ignoran). | **Alta** |
| 8 | **Paso 1 Aislar** | La foto de espalda etiquetada no influye en el recorte, pese al comentario que dice que sí | **`backImageUrl` está declarado en el tipo del body pero NUNCA se desestructura.** `bg-remove/route.ts:601` desestructura 10 campos y `backImageUrl` no está entre ellos; el tipo lo declara en la línea 609 con el comentario "Antes se IGNORABA acá". Sigue ignorado. `page.tsx:2695` lo manda. **[CÓDIGO]** | O se usa (pasarlo al prompt del ghost como contexto de construcción) o se borra del tipo y del envío. Dejarlo declarado y muerto es lo que hace creer que el dato viaja. | **Alta** |
| 9 | **Paso 1 Aislar** | La usuaria cree que ve un recorte real; en verdad ve un ghost generado | **El aviso "se generó con IA, revisalo" no se dispara con Photoroom.** `page.tsx:2737` lo muestra sólo si `json.data.regenerated === true`, y `regenerated` se pone en `true` únicamente en el camino SeedDream (`bg-remove/route.ts:741`). El camino Photoroom (`bg-remove/route.ts:852-853`) es **igual de generativo** (reconstruye el interior, re-ilumina) y deja `regenerated=false`. Peor: `bg-remove/route.ts:847-850` corre el guardia de fidelidad y, si falla, **sólo lo loguea** — la imagen se entrega sin avisar. **[CÓDIGO]** | Marcar `regenerated=true` también en Photoroom, y propagar el resultado del guardia (`faithful:false`) al cliente para que la tarjeta lo muestre. | **Alta** |
| 10 | **Paso 5 Detalle** | Devuelve un `data:` URL gigante | `macro-crop/route.ts:70` devuelve `result.dataUrl` (base64), y `page.tsx:3191` lo usa como `resultUrl`. Ese base64 termina en `stepResults`, en la galería y en `localStorage` (`page.tsx:4760-4784`). **[CÓDIGO]** | Subir el recorte a fal storage (`uploadToFalStorage`) y devolver una URL, como hacen las demás rutas. | **Media** |
| 11 | **Pasos 6/7 Videos** | El "Video de la Modelo" puede salir sin el producto | `page.tsx:4368-4372`: la cascada de entrada termina en `newSharedModel`, que es la **modelo IA desnuda / con los briefs beige genéricos de `model-create`**, sin la prenda. El comentario de al lado sólo promete "nunca cae a la foto original", y eso sí se cumple — pero caer a la modelo sin producto produce un video de catálogo de un producto que no aparece. **[CÓDIGO]** | Quitar `newSharedModel` de la cascada y saltar el paso con mensaje claro si no hay ninguna foto con la prenda puesta. | **Alta** |
| 12 | **Paso 6 Video 360** | El producto puede salir deformado / recortado | `page.tsx:3380` pide `aspectRatio:"1:1"`, pero el aislado de Photoroom sale en `PORTRAIT_HD_4_3` (`photoroom.ts:121`). Se le pide a wan-2.2 que meta un retrato 4:3 en un cuadrado. **[CÓDIGO + HIPÓTESIS]** | Usar `3:4` en el video de producto, o encuadrar el aislado a 1:1 con padding blanco antes de mandarlo. | **Media** |
| 13 | **photoFullBody** | El panty inventado / proporciones fijas | `page.tsx:2810` hardcodea `narrow hips`, `bare legs` y el color del panty sale de `pantyColorPhrase(garmentColor)`, donde `garmentColor` viene de `detectColor(filename)` (`page.tsx:495`) — **el nombre del archivo**, no de `spec.color` que Claude Vision ya extrajo. **[CÓDIGO]** | Usar `job.productSpec.color` como fuente primaria y el filename sólo como respaldo. Y pasar `garmentDescription` al prompt de outpaint (flux-fill-pro es puro texto: es el paso que MÁS se beneficia de la ficha y hoy no la recibe). | **Alta** |
| 14 | **Transversal** | El presupuesto mostrado no coincide con lo cobrado | La ruta `/api/tryon` devuelve `cost` **dentro de `data`** (`tryon/route.ts:665-674`), pero la página lee `json.cost` (`page.tsx:3297, 3107, 3191, 3002`) → siempre `undefined` → siempre el fallback. Un try-on Uwear real de **$0.20** se registra como **$0.02**. `estimateCost` (`page.tsx:930-942`) además sigue con los números viejos: `tryon:0.02`, `photoBack:0.075` (modelo + tryon, cuando el paso ya no crea modelo). **[CÓDIGO]** | Leer `json.data.cost`. Actualizar `estimateCost` y los strings de `STEP_DEFS:664,673`. | **Alta** |
| 15 | **Transversal** | Timeouts opacos en Espalda/Lateral | **`/api/tryon/async` no está en `vercel.json`** → hereda el default de **60s**, y no exporta `maxDuration`. Su POST hace: listar avatares de Uwear + descargar la imagen + `sharp` + subir a fal + `ensureFalAccessibleUrl` ×2 + `submitFal`. El GET descarga el resultado + `sharp.trim` + re-sube. Justo la ruta creada para esquivar el límite de 300s corre con el límite más bajo del repo. **[CÓDIGO]** | Agregar `"src/app/api/tryon/async/route.ts": { "maxDuration": 120 }` a `vercel.json`. | **Alta** |

---

## 2. Patrones sistémicos

### 2.1 Sustitución silenciosa de proveedor (el patrón que más daño hizo)

Ya está reconocido en los comentarios del repo, pero **sigue vivo en cuatro lugares**:

- `unistudio/src/app/api/bg-remove/route.ts:928-933` — `auto` encadena Photoroom → grounded_sam → rembg. Es intencional para el Paso 1, pero **`page.tsx:2952` lo usa para aislar la foto de espalda**, donde el primer eslabón (ghost frontal) es justo lo que arruina el resultado. Un default pensado para un contexto aplicado a otro.
- `unistudio/src/app/api/tryon/route.ts:604-611` — si `provider === "kolors"` y no hay `forceProvider`, se reescribe a `"auto"` sin avisar.
- `unistudio/src/app/api/tryon/route.ts:463-484` — cascada Uwear → SeedDream → Kolors con `console.warn` como único rastro. El badge muestra el proveedor real, pero el mensaje de error de Uwear **se pierde**: el `catch` de la línea 467 sólo loguea, así que la usuaria nunca ve *por qué* Uwear falló.
- `unistudio/src/app/api/bg-remove/route.ts:847-850` — el guardia de fidelidad de Photoroom corre, falla, y **se entrega igual con un `console.warn`**. Decisión deliberada y documentada, pero el resultado neto es que el usuario no se entera.

### 2.2 Errores tragados (catch que devuelve boolean o descarta el mensaje)

- `unistudio/src/app/api/bg-remove/route.ts:764-878` — `tryPhotoroom` devuelve `boolean`. El mensaje real se rescató en `photoroomError` (línea 875), bien; pero `tryGhost` (721-751) y `tryGroundedSam` (698-711) siguen devolviendo boolean, y `tryGhost` **no guarda el error en ninguna variable** — se pierde por completo.
- `unistudio/src/lib/api/uwear.ts:455-466` — `getUwearAvatarAsset` tiene `catch { return null }`. Si la API de Uwear cambia otra vez o la key falla, el Paso 4 no sabrá distinguir "no hay avatar" de "la API respondió 401". El caller (`tryon/async/route.ts:122-124`) sólo loguea un warning y sigue con `modelImage` vacío.
- `unistudio/src/app/pipelines/lingerie/page.tsx:2963-2965` — el fallo al aislar la espalda se traga con `console.warn` y sigue con la foto sin aislar. Sin toast: la usuaria no se entera de que el paso corrió en modo degradado.
- `unistudio/src/app/pipelines/lingerie/page.tsx:3193-3196` — el fallo del macro-crop en Paso 5 se traga; se entrega el plano medio de Uwear como si fuera la foto de detalle.
- `unistudio/src/app/pipelines/lingerie/page.tsx:4249` — `catch { }` vacío en el reintento del análisis.

### 2.3 Estados contradictorios

- **"Saltado" con resultado y costo.** `page.tsx:4582`, `4595`, `4673`, `4683` hacen `updateStep(..., { status: "skipped" })` **sin limpiar `resultUrl` ni `cost_actual`**, que ya fueron seteados por el `updateStep` exitoso de la línea 4513. El paso queda gris con el cartel "Saltado" y la imagen abajo, cobrada. Peor: `stepResults[stepDef.id]` ya se pobló (`page.tsx:4554`), así que ese resultado **se guarda igual en la galería**.
- **Fallback a foto real marcado como "done".** `page.tsx:4626-4646`: cuando Espalda o Cuerpo Completo fallan, se usa la **foto original de la usuaria** como `resultUrl` con `status:"done"` y `cost_actual:0`. Hay un toast, pero el paso queda visualmente igual que uno exitoso y esa foto entra a la galería como resultado del pipeline. Es exactamente el material con copyright de Leonisa que el resto del código se esfuerza en no propagar (`page.tsx:3269-3274`, `3375`, `3447`).
- **El Paso 4 nunca puede correr con otro proveedor, pero el código pretende que sí.** `page.tsx:2901-2975` es un bloque `{ ... return ... }` que **siempre retorna**. Todo lo que sigue —`page.tsx:2977-3003`, la llamada a `/api/tryon` con `providerOverride`, `fashnMode`, `garmentDescription` y `scenePrompt`— es **código muerto inalcanzable**. La UI es coherente (`FIXED_PROVIDER_STEPS = ["photoBack"]`, `page.tsx:1528`), pero el comentario de esa constante dice "La Lateral y la Espalda no llevan selector" cuando la Lateral **sí lo lleva** (está en `MODEL_PHOTO_STEPS`, `page.tsx:1523`).
- **Código muerto adicional:** `page.tsx:2851-2866` calcula `newPose` y `newBackground` y los descarta con `void`. `page.tsx:272` declara `"combo"` en `IsolateMethod`, pero no está en `ISOLATE_METHOD_OPTIONS` (`page.tsx:274-281`) ni en la unión que acepta `bg-remove/route.ts:615` — si llegara, caería al `else` de la línea 928 y correría `auto`.

### 2.4 Selectores que no afectan la petición

- **Proveedor en "Foto Cuerpo Completo".** `photoFullBody` está en `MODEL_PHOTO_STEPS` (`page.tsx:1523`) → se renderiza el `<select>` de proveedor (`page.tsx:1781-1800`). Pero `runStep` para `photoFullBody` (`page.tsx:2798-2829`) es puro outpaint con flux-fill-pro y **no lee `providerOverride`**.
- **Pose, en todos lados.** El selector de pose se renderiza para los 4 pasos de `MODEL_PHOTO_STEPS` (`page.tsx:1804-1834`), pero `poseOverride` sólo se lee en `page.tsx:2852-2854` — dentro de `photoBack`, y el valor resultante se descarta con `void newPose` en la línea 2865. **Es inerte en los cuatro pasos.**
- **Efecto colateral caro:** `page.tsx:4323-4335` decide saltar "Crear Modelo IA" evaluando `providerNeedsModelImage(st.providerOverride)` sobre todos los `MODEL_PHOTO_STEPS`. Como `photoFullBody` está habilitado por default y su `providerOverride` es `undefined` (→ `"auto"` → "necesita modelo"), **el paso "Crear Modelo IA" nunca se salta**, aunque la usuaria haya elegido Uwear en todo. Se pagan $0.055 y ~40s por foto para una modelo que se descarta. Lo mismo aplica a `photoSide` en `"auto"`, que va por el avatar y tampoco necesita la modelo.
- **Modo FASHN.** `fashnMode` se propaga hasta la ruta (`page.tsx:3288`), pero FASHN **ya no está en `TRYON_PROVIDER_OPTIONS`** (`page.tsx:257-266`): el selector no puede llegar nunca a un camino FASHN.
- **El método del Paso 1 no sobrevive a un reload.** `page.tsx:3556-3572` rehidrata `providerOverride`, `poseOverride` y `actionOverride` desde localStorage pero **omite `isolateMethodOverride`**. Al recargar, la elección vuelve al default `"photoroom"` (`page.tsx:1738`, `2707`) — que es el modo **de pago**, no el sandbox gratis. Además el comentario de `page.tsx:2705-2706` dice "Default 'combo'" cuando el código dice `"photoroom"`.

### 2.5 Valores hardcodeados que deberían venir de la ficha

| Dónde | Qué está hardcodeado | Qué debería usar |
|---|---|---|
| `page.tsx:2762-2764` | Encuadre de la modelo decidido por `productType === "bra"` | `spec.garment.*` (una faja o un bodysuit necesitan encuadre distinto) |
| `page.tsx:2781` | `background` de `model-create` fijo en blanco, **ignorando `artDir`** | `artDir.scenePrompt` — hoy la Art Direction llega al try-on (`page.tsx:3292`) pero no a la modelo, así que modelo y escena se contradicen |
| `page.tsx:2810` | `narrow hips`, `bare legs`, panty por `detectColor(filename)` | `spec.color`, `job.suggestedBodyType` |
| `page.tsx:3340-3346` | `garmentNoun` derivado de `productType` | `spec.garment.type` |
| `page.tsx:3381` | Prompt del video 360: `"this lingerie garment"` | `garmentDescription` (wan-2.2 acepta prompt) |
| `page.tsx:3436` | Prompt del video de modelo: `"wearing lingerie"` | `garmentDescription` (Kling 2.6 acepta prompt y `negative_prompt`) |
| `tryon/route.ts:321` | `avatarId` default `21663` | Debería ser un selector en la UI: es "la modelo del catálogo" y hoy sólo se cambia con una env var |

---

## 3. Qué pasos NO reciben `garmentDescription` aunque su proveedor sí la acepte

Este es el patrón que la usuaria identificó como el más dañino, y **sigue presente**.

| Paso | Proveedor | ¿Acepta texto? | ¿Recibe la ficha? | Evidencia |
|---|---|---|---|---|
| 2 Frontal (Uwear) | Uwear | **Sí** (`description`, `description_back`, y el prompt) | **NO — se recibe y se descarta** | `tryon/route.ts:249` la recibe; `271-278` y `283-291` no la usan. Cliente listo en `uwear.ts:155-156,180-181` |
| 3 Lateral (`auto`) | Leffa | No | N/A (correcto) | `tryon/async/route.ts:143-147` |
| 3 Lateral (manual) | Uwear/SeedDream | Sí | Sí, se manda… y Uwear la tira | `page.tsx:3101` |
| **4 Espalda** | Leffa | **No** | **Imposible** | `tryon/async/route.ts:143-147`. Es el paso que **más** necesita la ficha (el `backClosure` y el `strapStyle` viven ahí) y corre por el único proveedor que no la puede leer. Contradicción de diseño, no bug. |
| 5 Detalle | Uwear | Sí | Se manda (`page.tsx:3166`) y Uwear la tira | igual que #2 |
| **photoFullBody** | flux-fill-pro | **Sí, es puro texto** | **NO** | `page.tsx:2810-2823` — el prompt de outpaint no menciona la prenda |
| texturePreserve | flux-fill-pro | Sí | **Parcial** — sólo `materialHint` | `page.tsx:3337-3346`; se pierde cierre, tirantes, banda |
| Paso 1 Aislar (Photoroom) | Photoroom | Sí | **Sí** ✓ | `bg-remove/route.ts:818` — el único que la usa bien |
| Paso 1 Aislar (ghost SeedDream) | SeedDream | Sí | **Sí** ✓ | `bg-remove/route.ts:727` |
| productVideo / modelVideo / heroVideo | wan-2.2 / Kling 2.6 | Sí | **NO** | `page.tsx:3381`, `3436`, `3398-3402` |

**Conclusión:** de los 6 pasos cuyo proveedor acepta texto, **4 no reciben la ficha** y **1 la recibe y la tira**. El único que la usa correctamente es el Paso 1.

---

## 4. Pasos 6 y 7 — de dónde toman su entrada

| Paso | Entrada resuelta en | Cadena | Bug latente |
|---|---|---|---|
| `productVideo` | `page.tsx:4452-4459` | `stepResults.isolate` o **skip** | Correcto: nunca cae a la foto original. Pero `aspectRatio:"1:1"` (`page.tsx:3380`) contra un aislado 4:3 (`photoroom.ts:121`) → deformación/recorte. |
| `photoFullBody` | `page.tsx:4390-4420` | `texturePreserve` → `tryon` → (re-lectura del estado del job) → skip | Sólido: tiene el fallback de leer el estado real cuando el mapa local está vacío. Pero no recibe la ficha (ver §3) y hardcodea la anatomía (`page.tsx:2810`). |
| `modelVideo` | `page.tsx:4358-4380` | `photoFullBody` → `texturePreserve` → `tryon` → **`newSharedModel`** | **El último eslabón es la modelo IA SIN el producto.** Genera un "video de catálogo" de un producto que no aparece. Ver tabla #11. |
| `heroVideo` | `page.tsx:4358-4380` | misma cadena | Mismo bug. Además está deshabilitado por default (`STEP_DEFS:688`), lo que enmascara el problema. |

Otro detalle: ni `modelVideo` ni `heroVideo` mandan `falImageUrl` (bien, es la foto con copyright), pero **ninguno de los dos** pasa `garmentDescription` al prompt, y Kling 2.6 sí lo aceptaría.

---

## 5. Qué probar primero (ordenado por impacto / esfuerzo)

### Nivel 0 — arreglos de una línea, impacto alto, riesgo cero

1. **Pasar `description` a Uwear.** `tryon/route.ts:271-278`: agregar `description: garmentDescription` y `descriptionBack` armado desde `spec.garment.backClosure`/`strapStyle`. Es la premisa entera sobre la que se eligió Uwear como default, y hoy no se cumple. **Esfuerzo: 5 min. Impacto: afecta Pasos 2, 3-manual y 5.**
2. **Cambiar `isolateMethod:"auto"` → `"grounded-sam"` en el aislado de la espalda.** `page.tsx:2952`. Hoy la "espalda aislada" es un ghost frontal regenerado. **Esfuerzo: 1 línea. Impacto: es la causa raíz #1 del Paso 4.**
3. **Registrar `/api/tryon/async` en `vercel.json` con `maxDuration: 120`.** Hoy corre a 60s. **Esfuerzo: 3 líneas.**
4. **Leer `json.data.cost` en vez de `json.cost`.** `page.tsx:3297, 3107, 3191`. Hoy todo try-on se contabiliza a $0.02. **Esfuerzo: 3 líneas.**
5. **Persistir `isolateMethodOverride` en la rehidratación.** `page.tsx:3556-3572`. Hoy cada reload vuelve al modo de pago. **Esfuerzo: 1 línea.**

### Nivel 1 — experimentos que hay que correr para decidir

6. **Aplanar a blanco en la ruta async** (`tryon/async/route.ts:140`) **y fijar `seed`.** Sin seed fijo ningún A/B del Paso 4 es concluyente. Correr entonces: mismo producto, mismo seed, con y sin flatten. **Esfuerzo: 15 min.**
7. **Probar `fal-ai/fashn/tryon/v1.6` para el Paso 4**, con `segmentation_free:true`, `category:"tops"`, `mode:"quality"`, `garment_photo_type:"flat-lay"`, `moderation_level:"permissive"`, contra el asset `full_body_back` del avatar. Es maskless y pixel-space: elimina estructuralmente la causa del strap loss. **Ojo:** el cliente actual (`fashn.ts:71-82`) sólo manda 4 campos — hay que extender `FashnRunInput`. También conviene re-testear si FASHN sigue bloqueando lencería: el default de `moderation_level` es `permissive` y el código nunca lo setea, así que la creencia "FASHN bloquea lencería" (`tryon/route.ts:455-457`, `page.tsx:258-261`) puede ser un residuo de una prueba vieja. **Esfuerzo: medio día. Impacto: es el candidato real para cerrar el Paso 4.**
8. **Plan B con texto: `fal-ai/flux-pro/v1/vto`.** Tiene `prompt` obligatorio → se le puede describir el racerback con la ficha de Claude Vision. Cumple "nada inventado" en el mismo grado que Leffa (warp guiado), y a diferencia de Leffa **sí lee la ficha**. Límites: `human_image_url` máx 2MP, `garment_image_url` máx 1MP.
9. **Descartar explícitamente**: IDM-VTON y CatVTON comparten el linaje VITON-HD/máscara → mismo fallo esperado en vista trasera (CatVTON además es licencia research-only, no usable comercialmente). MV-VTON y VTON-360 sí atacan multi-vista pero **no están hosteados en fal**.

### Nivel 2 — deuda que va a volver a morder

10. **Borrar el código muerto del Paso 4** (`page.tsx:2977-3003`, `2851-2866`) y el `"combo"` huérfano (`page.tsx:272`). Mientras estén, cualquiera que lea el archivo va a creer que el Paso 4 respeta el selector.
11. **Limpiar `resultUrl`/`cost_actual` al marcar `skipped`** (`page.tsx:4582, 4595, 4673, 4683`) y **no marcar `done` al caer a la foto real** (`page.tsx:4626-4646`) — usar un estado propio tipo `fallback` que no entre a la galería. Es riesgo de copyright, no sólo de UX.
12. **Sacar `photoFullBody` de `MODEL_PHOTO_STEPS`** o hacer que `providerNeedsModelImage` mire sólo pasos que de verdad visten la modelo. Hoy eso hace que "Crear Modelo IA" nunca se salte: $0.055 + 40s por foto, tirados.
13. **Quitar el selector de pose** (inerte en los 4 pasos) o cablearlo de verdad.
14. **Propagar la ficha a los pasos de texto que hoy no la reciben**: `photoFullBody`, `texturePreserve`, `productVideo`, `modelVideo`, `heroVideo`.
15. **Marcar `regenerated=true` en el camino Photoroom** y propagar el veredicto del guardia de fidelidad al cliente (`bg-remove/route.ts:847-853`).

---

## 6. Lo que NO es la causa (para no volver a intentarlo)

- **No es el prompt.** El Paso 4 no manda ningún texto a Leffa: `tryon/async/route.ts:143-147` sólo manda dos URLs y `garment_type`. Cualquier trabajo de prompt-engineering para la espalda es, literalmente, código que nadie lee.
- **No es el recorte de bandas blancas** (`tryon/async/route.ts:199-216`). Eso es cosmético, corre *después* de que los tirantes ya se perdieron.
- **No es `garment_type`.** `upper_body` es el valor correcto según el enum de fal (`upper_body` | `lower_body` | `dresses`).
- **No se arregla subiendo `guidance_scale` ni `num_inference_steps`.** El problema es qué región puede pintar el modelo, no con cuánta fuerza pinta.
- **No hay un parámetro oculto de Leffa en fal.** El endpoint expone 9 campos y ninguno toca la máscara. `ref_acceleration`, `vt_repaint`, `preprocess_garment` y `vt_model_type` existen en el repo original (`franciszzj/Leffa/app.py`) pero **no** en fal.
