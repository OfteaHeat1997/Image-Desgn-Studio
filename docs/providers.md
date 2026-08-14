# UniStudio — Proveedores de IA

> **Para qué sirve este doc:** responder en un solo lugar *"¿qué proveedor uso en cada paso, cuánto cuesta, y por qué ese y no otro?"*. Todo lo de aquí sale de pruebas reales registradas en `CHANGELOG.md` y del código. Nada está supuesto.

**Última actualización:** 2026-08-14

---

## Cómo leer este doc

Cada afirmación lleva una etiqueta. Si no tiene etiqueta, no está verificado:

| Etiqueta | Significa |
|---|---|
| ✅ **PROBADO** | Se corrió contra una foto real del inventario y funcionó. Hay fecha y resultado |
| ❌ **DESCARTADO** | Se probó y falló. **No volver a intentarlo** sin leer por qué falló |
| ⚠️ **SIN VERIFICAR** | Está en el código pero nadie lo midió end-to-end |
| 💡 **HIPÓTESIS** | Idea razonable, sin probar |

---

## 1. Resumen — qué corre hoy en cada paso

### Pipeline Lencería

| Paso | Proveedor real hoy | Costo | Estado |
|---|---|---|---|
| 1. Aislar producto | Photoroom ghost (`auto`) → Grounded SAM → rembg | $0.10 / $0.01 / $0 | ✅ funciona, pero **avisa mal** (ver §5.1) |
| 2. Foto frontal (try-on) | **Uwear** (default) → SeedDream → Kolors | ~$0.20 / $0.03 / $0.02 | ✅ |
| 3. Foto lateral | **Leffa** (`fal-ai/leffa/virtual-tryon`) | $0.04 | ✅ |
| 4. Foto espalda | **FASHN v1.6** maskless (`segmentation_free: true`) | $0.075 | ⚠️ da resultado, con defecto conocido (ver §5.2) |
| 5. Detalle macro | Uwear + `macro-crop` (Sharp, sin IA) | ~$0.20 + $0 | ✅ |
| Cuerpo completo | flux-fill-pro (outpaint) → **SeedDream** si NSFW | $0.05 | ✅ |
| Textura (post try-on) | flux-fill-pro (inpaint) | $0.04 | ⚠️ |
| Video 360° producto | **wan-2.2-fast** | $0.05 | ✅ |
| Video modelo | **Kling 2.6** | $0.35 | ✅ |

**Costo verificado end-to-end** (2026-08-08, bra `011473`): **~$0.15 solo fotos, ~$0.55 con los dos videos.**

### Pipeline Estáticos

| Paso | Proveedor | Costo |
|---|---|---|
| Aislar | `bg-remove` | $0.01 |
| Fondo blanco | **Sharp** (no IA) | $0 |
| Fondo adaptativo + vertical | Flux (modo fast) + composite Sharp | $0.003 c/u |
| Alternativa todo-en-uno | **Photoroom Plus** (recorte + fondo + sombra en 1 llamada) | $0.10 |

**Garantía del pipeline:** el producto **nunca** pasa por un modelo generativo. Se compositea el pixel original sobre el fondo generado. Etiqueta, vidrio y color quedan idénticos.

### Pipeline Joyería

| Paso | Proveedor | Costo |
|---|---|---|
| 1. Limpiar foto (borrar texto) | Flux Kontext Pro (`photo-clean`) | $0.04 |
| 2. Aislar | **BiRefNet** ✅ ganador medido | ~$0.01 |
| 3. Upscale | Real-ESRGAN → Clarity (`softFail`) | $0.02 |
| 4-5. Packshot + escena de lujo | `bg-generate` (Flux) | $0.05 c/u |
| 6. Detalle macro | Sharp | $0 |
| 7. En modelo | model-create + jewelry-tryon (Kontext) | $0.10 |
| 8. Video | wan-2.2-fast | $0.05 |
| 9. Kit Instagram | Sharp + **ffmpeg** | $0 |

---

## 2. Las cuentas que tienes (y qué env var las activa)

| Proveedor | Env var | Cliente | Qué te da |
|---|---|---|---|
| **fal.ai** | `FAL_KEY` | `src/lib/api/fal.ts` | SeedDream, Kolors, Leffa, FASHN, wan, Kling, BiRefNet + **el storage de todas las imágenes intermedias** |
| **Replicate** | `REPLICATE_API_TOKEN` | `src/lib/api/replicate.ts` | Flux (Kontext/Fill/Schnell), rembg, Grounded SAM, Real-ESRGAN, Clarity |
| **Photoroom** | `PHOTOROOM_API_KEY` | `src/lib/api/photoroom.ts` | Ghost mannequin, recorte+fondo+sombra, Virtual Model |
| **Uwear.ai** | `UWEAR_API_KEY` | `src/lib/api/uwear.ts` | Try-on de lencería (permite íntimos), flat-lay, avatares |
| **FASHN** | `FASHN_API_KEY` | `src/lib/api/fashn.ts` | Try-on v1.6 (también accesible vía fal) |
| **Anthropic** | `ANTHROPIC_API_KEY` | — | Claude Vision (ficha de producto) + Haiku (decidir fondos) |
| **WithoutBG** | `WITHOUTBG_API_KEY` | `src/lib/api/withoutbg.ts` | Quitar fondo — ❌ en la práctica cae a rembg |
| **Vercel Blob** | auto | `src/lib/api/blob.ts` | Almacenamiento durable de resultados |

> ⚠️ **Trampa que ya te costó una sesión entera:** si la cuenta de **fal.ai se queda sin saldo**, *todos* los pasos salen en rojo — porque fal no es solo un modelo, es también el storage. No es un bug de código. Se recarga en `fal.ai/dashboard/billing`.

> ⚠️ **Trampa de env vars:** `vercel env pull` deja un `\n` al final de la key. **Todos** los clientes hacen `.trim()`. No lo quites nunca.

---

## 3. Registro de pruebas — qué se midió y qué salió

### 3.1 Aislar producto / quitar fondo — benchmark medido (Joyería, 2026-08-09)

Corrido sobre la **misma foto** de un rosario:

| Proveedor | Tiempo | Resultado | Veredicto |
|---|---|---|---|
| **BiRefNet** | **1.8 s** | Rosario completo, crucifijo y medalla con textura | 🏆 **✅ GANADOR — es el proveedor del paso** |
| Grounded SAM | 78.9 s | Blanquea el crucifijo | ❌ |
| Bria RMBG 2.0 | 4.0 s | No aísla | ❌ |
| rembg | 8.4 s | No aísla | ❌ |
| WithoutBG | — | Cae a rembg | ❌ |
| remove.bg | — | HTTP 400 | ❌ |

> **Lección transferible:** Bria gana el benchmark *general* de la industria (90% vs 85%), pero perdió aquí. **La calidad del borde depende del tipo de imagen, no del promedio.** Mide con TU foto, no con el ranking de un blog.

### 3.2 Photoroom — probado a fondo (2026-08-08)

| Función | Resultado |
|---|---|
| **Ghost Mannequin** (`/v2/edit` + `ghostMannequin.mode=ai.auto`) | ✅ **PROBADO — funciona.** Devuelve el producto flotando 3D sobre blanco. Es el único paso que recibe bien la ficha de Claude Vision |
| **Recorte + fondo + sombra** (estáticos) | ✅ Una sola llamada de $0.10 reemplaza 2-3 pasos de Sharp/Flux |
| **Virtual Model** | ❌ **DESCARTADO CON PRUEBA — NO VOLVER A INTENTARLO** |
| **Video** | ❌ No existe. Confirmado en su documentación |

**Detalle del descarte de Virtual Model** — se probaron 4 variables antes de decidir si pagar Plus:

| Variable | Valores probados | Resultado |
|---|---|---|
| Color del producto | negro, beige | **500** en los dos |
| Pose | standing, random | **500** en las dos |
| Presets | `ava`+`studio`, `avery`+`street` (los del ejemplo **oficial**) | **500** en los dos |
| Modo | sandbox y cuota real | **500** en los dos |

Error siempre igual y genérico: `500 {"error":{"message":"An error occurred during Virtual Model processing"}}`. **Test de control:** ghost-mannequin en el MISMO sandbox devolvió imagen OK → el sandbox no era el problema.

> 💡 **Única hipótesis viva:** la API documenta `virtualModel.additionalProductImages[]` (ángulos extra del producto) y `virtualModel.prompt`, que la prueba **no** incluyó. Pero como falló incluso con los presets del ejemplo oficial, la explicación más probable es que la *feature* estaba caída o bloqueada para esta cuenta, no que faltara un parámetro. **Prioridad baja.** Si algún día se reintenta: sandbox primero, y máximo 3 llamadas.

**Conclusión: Photoroom cubre el Paso 1 y los estáticos. Nada más.**

### 3.3 Try-on de lencería — la historia completa

Esta es la decisión más difícil del proyecto y ya tienes 4 rondas de evidencia:

**Ronda 1 — el hallazgo estructural (2026-06-13):**

> **Ningún motor generativo clona un bra de soporte atípico.** Se probaron SeedDream, Kolors y FASHN "alta calidad" sobre un bra sin aro, tirantes anchos y cierre frontal (REF 189307/212624). **Ninguno** lo preserva: todos lo "normalizan" a un push-up genérico con aro y tirantes finos. **No es la calidad de la foto** — las de entrada eran buenas. Es el enfoque generativo.

**Implicación que te ahorra dinero:** cambiar de un API generativo a **otro** generativo no arregla la fidelidad. Los únicos caminos 100% fieles son:
1. **Segmentación** (recorte pixel-real de la prenda sola)
2. **Face-swap** sobre tu foto real on-model (producto, pose y luz intactos; solo cambia la cara)

**Ronda 2 — comparativa de proveedores:**

| Proveedor | Permite lencería | Enfoque | Costo | Veredicto |
|---|---|---|---|---|
| **Uwear.ai** | ✅ **Sí, explícitamente** | Generativo dedicado a moda (Qwen Intimate / SeedDream 4.5) | ~$0.20 | ✅ **Elegido como default.** Único que acepta **foto de frente Y de espalda** del mismo producto |
| **SeedDream v4 edit** | ✅ Sí (`enable_safety_checker: false`) | Editor multi-imagen | $0.03 | ✅ Backup. Edita en vez de sintetizar → preserva mejor que Kolors |
| **Leffa** | ✅ Sí | **Warp** (deforma la prenda real, no la re-dibuja) | $0.04 | ✅ Sirve para lateral. ❌ **Imposible para la espalda** (ver abajo) |
| **FASHN v1.6** | ✅ Sí — `moderation_level: "permissive"` **es el default** y permite ropa interior y swimwear | Warp maskless | $0.075 | ⚠️ En uso para la espalda |
| **Kolors** | ⚠️ Sí pero re-pinta genérico | Generativo | $0.02 | ❌ Solo último recurso |
| **Camclo3D** | ❓ No publica | — | — | ❌ Descartado: sin API documentada |

> 🔴 **Corrección de una creencia vieja del repo:** durante meses el código asumió que *"FASHN bloquea lencería"*. **Es falso hoy** — `moderation_level: "permissive"` es el valor por defecto y admite ropa interior. La creencia venía de una prueba antigua. Verificado en la doc de FASHN, 2026-08.

**Ronda 3 — por qué Leffa NUNCA va a poder con la espalda (2026-08-09):**

No es un parámetro mal puesto, es estructural:
- La máscara de Leffa es el `AutoMasker` de CatVTON, que trata **el pelo como región protegida**
- En una modelo de espaldas, el pelo cae **justo sobre el cruce de tirantes**
- Esa zona se copia del original → **nunca puede recibir tela**
- Encima, VITON-HD y DressCode (sus datasets) son **solo frontales**
- El endpoint de fal **no expone** `mask`, `vt_repaint` ni `vt_model_type`: **no hay perilla que girar**

**Ronda 4 — FASHN maskless para la espalda (2026-08-10):**

| Configuración | Resultado |
|---|---|
| `segmentation_free: true` | ✅ Devuelve imagen, pero deja una **mancha blanca** |
| `segmentation_free: false` | ❌ **El paso dejó de devolver nada** → revertido |

> **La mancha blanca NO es una alucinación de la IA.** Es el **top blanco del avatar** de Uwear, que viene vestido. Con `segmentation_free: true` FASHN hace lo que promete: viste *encima* sin quitar la ropa existente. Como tu foto de espalda suele ser un 3/4 girado y el avatar está de espaldas rectas, la silueta no calza y asoma el top del avatar por un costado.
>
> **El arreglo correcto NO pasa por esa bandera** → hay que **recortar el cutout al bounding box de la prenda** antes del warp.

### 3.4 Aislar producto en lencería — la regresión que ya pasó dos veces

| Fecha | Qué pasó |
|---|---|
| 2026-05-18 (`f1e4a59`) | Se **quitó** el ghost de SeedDream del cascade porque **inventaba el bra** |
| 2026-06-10 (`595c2df`) | Se **re-agregó** ("volvió a funcionar" = dejó de morir, pero inventando la prenda otra vez) |
| 2026-06-13 | Se **volvió a quitar** |

> **Regla que sale de aquí:** *segmentación* recorta los píxeles reales de TU prenda. *Regeneración* dibuja un producto nuevo que **no es el tuyo**. Cuando un fallback "arregla" un paso que fallaba, revisa si lo arregló **inventando**.

### 3.5 Hallazgo de oro sobre fidelidad (2026-08-08)

> El `garmentDescription` que genera **Claude Vision automáticamente** (`cierre frontal: múltiples ganchos centrales verticales`) da **MEJOR resultado que una descripción escrita a mano**. Sin ese anclaje el try-on inventa una cremallera; con él salen los ganchos reales y hasta el panel de malla lateral.
>
> **No toques ese camino.**

---

## 4. Precios verificados (2026-08-14)

### Photoroom

| Plan | Suscripción | Por llamada | Incluye |
|---|---|---|---|
| **Basic** | €20/mes | **$0.02/img** | **Solo** Remove Background. ❌ NO incluye ghost mannequin |
| **Plus** | €100/mes | **$0.10 plana** | Image Editing API: ghost mannequin, Virtual Model, flat lay, fondos IA, sombras IA, relighting… |
| Enterprise | Anual | Volumen | Mínimo 200.000 img/año |

**Dos cosas que importan:**
1. **$0.10 es por LLAMADA, no por operación.** Recorte + fondo + sombra en una sola llamada = $0.10 total. Por eso conviene para estáticos.
2. **Sandbox: 1.000 llamadas/mes GRATIS** (máx 100/día) con marca de agua. Misma key con prefijo `sandbox_`. **Es la forma de iterar sin gastar.**

> 🔴 **Corrección a un comentario del código:** `photoroom.ts` dice *"el plan de la usuaria es una prueba de 10 imágenes/mes"*. Las **10 llamadas gratis de producción son solo del Remove Background API**, no del Image Editing API donde vive ghost mannequin. Sin plan Plus, ghost mannequin en producción **no existe** — solo sandbox con marca de agua. **No hay rollover:** lo no usado se pierde cada mes.

### Costo por operación (los demás)

| Operación | Proveedor | Costo |
|---|---|---|
| Try-on | Kolors | $0.02 |
| Try-on | SeedDream v4 edit | $0.03 |
| Try-on | Leffa | $0.04 |
| Try-on | **FASHN v1.6** | **$0.075** |
| Try-on | **Uwear** | **~$0.20** ($0.10/crédito, pay-as-you-go, sin suscripción) |
| Crear modelo IA | SeedDream | $0.055 |
| Aislar | Grounded SAM | $0.01 |
| Aislar | BiRefNet | ~$0.01 |
| Fondo (estáticos, fast) | Flux | $0.003 |
| Fondo (joyería) | Flux | $0.05 |
| Upscale | Real-ESRGAN / Clarity | $0.02 |
| Video 360° | wan-2.2-fast | $0.05 |
| Video modelo | Kling 2.6 | $0.35 |
| Macro crop, kit social, fondo blanco | Sharp / ffmpeg | **$0** |

> 💡 **Uwear regala 100 créditos** al crear cuenta.

---

## 5. Problemas abiertos de proveedor

### 5.1 El Paso 1 no avisa cuando genera en vez de recortar

Photoroom **reconstruye el interior y re-ilumina** — es tan generativo como SeedDream. Pero el aviso *"se generó con IA, revísalo"* solo se dispara con `regenerated === true`, que solo se marca en el camino SeedDream. **El camino Photoroom entrega sin avisar.** Peor: el guardia de fidelidad corre, falla, y **solo lo loguea**.

**Arreglo:** marcar `regenerated = true` también en Photoroom y propagar el veredicto del guardia al cliente.

### 5.2 El badge de proveedor miente en el Paso 4

`tryon/async/route.ts:208` devuelve `provider: 'leffa'` **hardcodeado**, incluso cuando el motor que corrió fue FASHN. Es exactamente el patrón de *sustitución silenciosa de proveedor* que el resto del proyecto combate.

**Arreglo:** `provider: useFashn ? 'fashn' : 'leffa'`.

### 5.3 Errores de proveedor que se tragan

Cuando Uwear falla, el `catch` solo hace `console.warn` → cae a SeedDream y **nunca ves por qué falló Uwear**. Igual en `getUwearAvatarAsset` (`catch { return null }`): no distingue "no hay avatar" de "la API respondió 401".

---

## 6. Reglas de decisión — qué elegir cuando

| Si necesitas… | Usa | Nunca uses |
|---|---|---|
| Recorte **100% fiel** al producto real | BiRefNet o Grounded SAM (segmentación) | Cualquier modelo generativo como fallback silencioso |
| Producto flotando 3D (ghost mannequin) | Photoroom (sandbox para iterar) | SeedDream ghost — inventa la prenda |
| Try-on de **lencería** | Uwear (default) → SeedDream (backup) | Kolors solo — re-pinta genérico |
| Try-on de **vista trasera** | FASHN maskless | Leffa — **estructuralmente imposible** |
| Fondo + sombra de un producto rígido | Photoroom Plus (1 llamada) o composite Sharp+Flux | Kontext Pro sobre el producto — lo re-dibuja |
| Fidelidad **absoluta** con la modelo real | Face-swap sobre tu foto original | Cualquier try-on |
| Cualquier cosa que no requiera IA | **Sharp o ffmpeg** ($0, determinista) | Un modelo de video para hacer un reel de fotos |

**Regla transversal:** todo proveedor que acepte texto **debe** recibir el `garmentDescription` de Claude Vision. Es la palanca de fidelidad más barata que existe.

---

## 7. Lo que NO hay que volver a probar

| Idea | Por qué no |
|---|---|
| Photoroom **Virtual Model** para lencería | ❌ 500 en las 4 variables probadas, incluidos los presets del ejemplo oficial |
| Cambiar un generativo por **otro generativo** para ganar fidelidad | ❌ SeedDream, Kolors y FASHN fallan igual: todos re-dibujan |
| Subir `guidance_scale` / `num_inference_steps` en Leffa para la espalda | ❌ El problema es **qué región puede pintar**, no con cuánta fuerza |
| Prompt engineering para el Paso 4 con Leffa | ❌ Leffa **no recibe texto**. Solo dos URLs y `garment_type` |
| `segmentation_free: false` en FASHN | ❌ El paso dejó de devolver imagen (2026-08-10) |
| IDM-VTON / CatVTON para vista trasera | ❌ Mismo linaje VITON-HD → mismo fallo. CatVTON además es research-only |
| Photoroom **Basic** para habilitar el Paso 1 | ❌ Ghost mannequin está en Plus. Basic no lo habilita |
| Photoroom para **video** | ❌ No lo ofrece |
| remove.bg / WithoutBG / Bria para joyería | ❌ Medidos y perdieron contra BiRefNet |

---

## 8. Docs relacionados

- [`pipelines/README.md`](pipelines/README.md) — los 3 pipelines canónicos y sus reglas
- [`pipelines/lingerie-root-cause.md`](pipelines/lingerie-root-cause.md) — las 15 causas raíz del pipeline de lencería
- [`modules/README.md`](modules/README.md) — los 18 módulos
- [`../CHANGELOG.md`](../CHANGELOG.md) — historia completa por deploy

---

## 9. Cómo mantener este doc

Cuando cambies un proveedor en cualquier paso, **en el mismo commit**:

1. Actualiza la tabla de §1 (qué corre hoy)
2. Si fue una **prueba**, agrega la fila a §3 con **fecha y resultado medido**
3. Si algo **falló**, agrégalo a §7 con el porqué — eso es lo que evita repetir la prueba dentro de tres meses
4. Si cambió un **precio**, actualiza §4 con la fecha de verificación

> Un proveedor descartado sin explicación se vuelve a probar. Un proveedor descartado **con la razón escrita** no.
