# Auditoría Pipeline Estáticos — Gaps vs Lencería

> **Meta:** llevar el pipeline Estáticos al mismo nivel de Lencería (el gold standard que ya funciona en producción).
>
> **Basado en:**
> - `docs/pipelines/static-product.md` (181 líneas, doc del pipeline)
> - `docs/pipelines/lingerie.md` (161 líneas, referencia)
> - `unistudio/src/lib/pipelines/static-product.ts` (193 líneas, matriz)
> - `unistudio/src/app/pipelines/static-product/page.tsx` (656 líneas)
> - `unistudio/src/app/pipelines/lingerie/page.tsx` (1565 líneas — 2.4× más grande)
>
> **Fecha:** 2026-04-23

---

## TL;DR — 7 gaps priorizados

| # | Gap | Prioridad | Esfuerzo | Estado | Commit |
|---|---|---|---|---|---|
| 1 | Batch real desde folder no implementado | 🔴 bloqueante | M | ⏳ pendiente | — |
| 2 | Seed compartido por marca no se persiste | 🔴 bloqueante | S | ✅ **HECHO 2026-04-23** | seed en `static-product.ts` + propagado por `/api/bg-generate` a Flux |
| 3 | `/api/inventory/scan` no mapea los paths nuevos | 🔴 bloqueante | S | ✅ **HECHO 2026-04-23** | scan route añade 5 entries `inv-final-*` + modo recursive para bras |
| 4 | Image disambiguation perfume vs desodorante | 🟡 alto | S | ✅ **HECHO 2026-04-23** | `folder-routing.ts` + integración en `static-product/page.tsx` |
| 5 | Sin UI per-step con approval (como Lencería) | 🟡 alto | L | ⏳ pendiente | — |
| 6 | No hay troubleshooting programático (re-run si bg malo) | 🟢 medio | M | ⏳ pendiente | — |
| 7 | Sin integración con Prisma para guardar bg generado por marca (cache) | 🟢 medio | M | ⏳ pendiente | — |

---

## Gap 1 — Batch real desde folder

**Estado actual:** `docs/pipelines/static-product.md` describe batch desde `images/perfumes/`, `images/catalogo  cremas/` etc., **pero no verifiqué que la orquestación esté en `page.tsx`**. Probablemente el usuario sube imágenes una por una a la UI.

**Qué debería hacer (copiar patrón de Lencería):**
```
Usuario selecciona folder (ej: docs/inventory-final/images/cremas/)
  → /api/inventory/scan returna lista de files con productType inferido
  → UI muestra grid "32 imágenes encontradas, procesar todas?"
  → Por cada imagen: ejecutar flow Estáticos (5 pasos) con seed de marca fijo
  → Guardar outputs en output/static/{productType}/{brand}/{sku}.jpg
  → Barra de progreso + pausar/reanudar
```

**Por qué importa:** Sin esto, procesar 52 cremas a mano requiere 52 sesiones. El usuario va a hacer esto para 200+ productos — manual no escala.

**Impacto si se arregla:** Paso de "demo" a "producción" del pipeline.

---

## Gap 2 — Seed compartido por marca

**Estado actual:** `static-product.ts` devuelve `prompt`/`shadowType`/`bgMode`/`label` pero **NO retorna un `seed`**. Cada llamada a bg-generate usa seed random → mismo producto Yanbal puede salir con fondo mármol más claro/oscuro entre runs → catálogo incoherente.

**Qué agregar al matrix:**

```typescript
export interface AdaptiveBgConfig {
  prompt: string;
  shadowType: 'contact' | 'drop' | 'reflection';
  bgMode: 'fast' | 'precise';
  label: string;
  seed: number; // 🆕 estable por (productType, brand)
}

// Dentro de getAdaptiveBgConfig:
const seed = brandSeed(productType, brand); // hash estable
```

Esto hace que las 20 cremas Yanbal salgan con **el MISMO fondo mármol** (mismo reflejo, misma posición de luz), solo cambia el producto. Eso es lo que hace un catálogo Sephora-style verdaderamente cohesivo.

**Impacto si se arregla:** Las fotos del mismo brand/type se ven como una serie editorial, no como 20 fotos desconectadas.

---

## Gap 3 — `/api/inventory/scan` paths nuevos

**Estado actual:** `docs/pipelines/README.md` tiene tabla de auto-ruteo con paths:
```
images/perfumes/**, images/catalogo colonias/**  → perfume
images/catalogo  cremas/**                         → cream
images/CATALOGO BLOQUEADOR/**                       → sunscreen
images/DESODORANTES_HD/**                           → deodorant
images/limpieza facial/**                           → facial
```

Pero **las imágenes finales ahora viven en `docs/inventory-final/images/<cat>/`** (ver gap de Vercel deploy abajo). El scan actual no mapea esos paths.

**Fix:** actualizar `unistudio/src/app/api/inventory/scan/route.ts` para aceptar raíz configurable y añadir mapping:
```
docs/inventory-final/images/bras/**         → lingerie, bra
docs/inventory-final/images/bloqueador/**   → static, sunscreen
docs/inventory-final/images/cremas/**       → static, cream
docs/inventory-final/images/desodorantes/** → static, deodorant
docs/inventory-final/images/limpieza-facial/** → static, facial
```

**Notas adicionales:**
- `docs/` está en `.vercelignore` → las imágenes NO se deployan. El scan debe correr en **dev/local** o en una ruta que lea del filesystem del servidor.
- Si el procesamiento ocurre en producción, mover imágenes a `unistudio/public/images/inventory-final/` — pero entonces **revisar tamaño total** para no romper el límite Vercel 10MB de request (el build sí puede tener más).

---

## Gap 4 — Disambiguación perfume vs desodorante

**Problema documentado en `docs/inventory.md` línea 384:**
> Shared images between categories: DORSAY.jpg, GAIA.jpg, OHM.jpg, OSADIA.jpg, ZENTRO.jpg used for both perfumes AND deodorants

**Qué pasa con la matriz actual:** Si se sube `DORSAY.jpg` sin contexto, analyze-image detecta "Dorsay" como marca/nombre Esika → matriz defaultea a **perfume premium Esika** → fondo mármol Sephora. **Pero si es un desodorante**, el fondo correcto es gris neutro.

**Fix:** forzar `productType` **desde el folder** ANTES de que la matriz decida, y **solo caer a Claude Vision** si el folder es ambiguo. Orden correcto:

```
1. Si folder in {cremas, bloqueador, desodorantes, limpieza-facial, perfumes} → productType = folder
2. Sino, si analyze-image devuelve packaging={spray/stick} → productType = deodorant
3. Sino, si packaging={bottle/perfume} + claude dice "fragrance" → productType = perfume
4. Sino, pedir al usuario
```

El código actual (probable) pasa directo a analyze-image, lo que falla para DORSAY/GAIA/OHM.

---

## Gap 5 — UI per-step con approval

**Lencería** (1565 líneas de page.tsx) tiene:
- Selector de ángulo/color
- Preview después de cada paso con botón "Aprobar y seguir" o "Re-ejecutar con prompt distinto"
- Panel lateral "Mis modelos" para reusar
- Modal de plan con checklist
- Progreso visual paso 1/7 → 2/7 → …

**Estáticos** (656 líneas — 42% del tamaño) probablemente:
- Upload de una foto
- Matriz decide automáticamente
- Botón "Generar" → salida directa
- Sin approval intermedio

**Qué agregar:**
1. Preview después de analyze-image → usuario puede **sobreescribir** el productType/brand si la matriz lo eligió mal
2. Preview del bg-generate con opción "Cambiar fondo" (otra variante de la matriz o prompt custom)
3. Preview del shadows con opción "Más duro/suave"
4. Final con aprobación + guardar en galería

Esto es CRÍTICO para catálogos e-commerce — no puede haber una mala foto aprobada silenciosamente.

---

## Gap 6 — Troubleshooting programático

**Lencería** tiene validación dura: si el bg-remove devuelve imagen con overlay/anotaciones (bug conocido de grounded_sam que retorna la imagen de debug), se rechaza y se re-corre.

**Estáticos** no tiene validación equivalente. Casos que deberían re-correr automáticamente:

| Síntoma detectable | Validador | Acción |
|---|---|---|
| Fondo generado tiene el producto duplicado | Claude Vision: "how many products?" → >1 | Re-run bg-generate con `negative_prompt:"duplicate, multiple bottles, clones"` |
| Producto se ve distorsionado (bg-remove comió pedazo) | Sharp: % píxeles transparentes > umbral | Re-run bg-remove con threshold distinto |
| Sombra toca los bordes del canvas | Sharp: bbox vs canvas | Re-posicionar producto, reducir padding |
| Crema Yanbal aparece con vibe de crema Esika | Claude Haiku: ¿el fondo matchea la marca que dije? | Re-run con prompt más explícito |

---

## Gap 7 — Cache de backgrounds generados por marca

**Observación:** si las 20 cremas Yanbal comparten el MISMO fondo (mismo seed, mismo prompt), **no tiene sentido re-generar el fondo 20 veces**. Generar 1 vez, guardarlo, componer los 20 productos sobre él.

**Ahorro por marca (aproximado):**
- 20 cremas Yanbal × $0.05 Flux Pro = $1.00
- Con cache: $0.05 una vez + 20× composite en Sharp (gratis) = **$0.05**
- **20× ahorro**

**Modelo Prisma:**
```prisma
model GeneratedBackground {
  id String @id @default(cuid())
  productType String  // perfume | cream | sunscreen | ...
  brand String        // esika | yanbal | lbel | ...
  promptHash String   // sha256 del prompt exacto
  seed Int
  url String          // fal storage
  generatedAt DateTime
  @@unique([productType, brand, promptHash])
}
```

---

## Implementación sugerida en orden (6 commits)

1. **Gap 2 (seed)** — una línea de cambio en `static-product.ts`, devuelve seed estable. Ahorro inmediato + mejora cohesión.
2. **Gap 4 (disambiguación)** — folder > analyze-image. Previene fotos mal procesadas.
3. **Gap 3 (scan)** — actualizar `/api/inventory/scan` con los paths nuevos. Habilita batch.
4. **Gap 1 (batch)** — en page.tsx, añadir flow batch que consume el scan. Esto es el grande — ~300 líneas nuevas.
5. **Gap 5 (UI per-step)** — mover approvals intermedios a page.tsx. Copiar patrón de Lencería.
6. **Gap 6 + 7 (validación + cache)** — nice-to-have para producción seria, posponer hasta después del primer batch exitoso.

Cada commit debe respetar la **Regla Pipeline ↔ módulo** (ver `CLAUDE.md`): si se toca el pipeline, se toca el módulo Y la doc en el mismo commit.

---

## Riesgos detectados

1. **Content filter en Cremas "Hot Body Gel" (Avon, Salome):** los prompts con "warming gel" + "body" pueden ser rechazados por modelos con filtro estricto. Testear Flux Pro primero, si falla caer a SeedDream edit (como hace Ghost Mannequin para lencería).
2. **Image share issue de desodorantes:** el gap 4 lo mitiga pero hay que probar con DORSAY.jpg real.
3. **Vercel 10MB cap:** si se mueven las 199 imágenes extraídas a `unistudio/public/`, el upload Vercel puede romperse. Evaluar `NEXT_PUBLIC_IMAGE_BASE_URL` apuntando a CDN externo, o mantener procesamiento en dev local.
4. **Fotos huérfanas (29 SKUs sin imagen):** el pipeline no puede sustituir una foto inexistente. El gap es de INPUT, no de pipeline.
