# UniStudio — Pipelines

> Los 3 pipelines canónicos del proyecto. Cada uno resuelve un caso de uso único y NO se solapan con los otros. Si crees que necesitas un 4to pipeline, para y discute antes de crearlo.

**Última actualización:** 2026-04-20

---

## Los 3 pipelines canónicos

| Pipeline | Productos que procesa | Productos totales (inventory) | Ruta API | Página UI |
|---|---|---:|---|---|
| [**Lencería**](./lingerie.md) | Bras, panties, shapewear, bodysuits, fajas, swimwear | 164 | `/api/pipelines/lingerie` | `/pipelines/lingerie` |
| [**Estáticos**](./static-product.md) | Perfumes, cremas, bloqueador, desodorantes, limpieza facial, maquillaje | 240 | `/api/pipelines/static-product` | `/pipelines/static-product` |
| [**Joyería**](./jewelry.md) | Aretes, cadenas, anillos, pulseras, topos, candongas, sets | 82 | `/api/pipelines/jewelry` | `/pipelines/jewelry` |

**Total cubierto: 486 productos = 100% del inventario Unistyles.**

---

## Regla #1 — Un pipeline, un caso de uso

Cada pipeline tiene un flow, unas reglas, y unos proveedores ÚNICOS que le pertenecen. No se comparten lógicas entre pipelines. Si dos pipelines necesitan lo mismo, se comparte desde el **módulo base** (ver `docs/modules/`), no duplicando steps.

Si detectas que estás a punto de crear un step que ya existe en otro pipeline, **mete ese step en un módulo** y lláma-lo desde ambos. No copies código.

## Regla #2 — Los pipelines reusan módulos, no los reemplazan

Los 18 módulos (`src/app/api/<modulo>/route.ts`) son la capa base. Los pipelines orquestan los módulos haciendo `fetch('/api/<modulo>')` en secuencia o en paralelo. **Prohibido llamar a fal/replicate/anthropic directamente desde un pipeline.** Si un proveedor nuevo se necesita, se agrega al módulo primero.

## Regla #3 — Sync pipeline ↔ módulo (mandatoria)

Si un pipeline cambia de proveedor en un step (ej: Kolors → FASHN para try-on), en el MISMO commit:
1. Se actualiza el pipeline (`/api/pipelines/<nombre>/route.ts`).
2. Se actualiza el módulo correspondiente (`/api/<modulo>/route.ts`) para que acepte el nuevo proveedor como opción.
3. Se actualiza la doc del pipeline (`docs/pipelines/<nombre>.md`).
4. Se actualiza la doc del módulo (`docs/modules/<modulo>.md` si existe) o el índice (`docs/modules/README.md`).

No commits separados. No "lo arreglo después". Lo que se toca, se documenta.

## Regla #4 — Auto-ruteo desde folders (activado desde v1)

Los pipelines detectan categoría automáticamente del path del archivo subido (`/api/inventory/scan` ya mapea la convención):

| Folder de origen | Pipeline destino |
|---|---|
| `images/bra/**` | Lencería (`garmentType: bra`) |
| `images/Pantys/**` | Lencería (`garmentType: panty`) |
| `images/LEONISA_*_SHAPER_*` | Lencería (`garmentType: shapewear`) |
| `images/perfumes/**`, `images/catalogo colonias/**` | Estáticos (`productType: perfume`) |
| `images/catalogo  cremas/**` | Estáticos (`productType: cream`) |
| `images/CATALOGO BLOQUEADOR/**` | Estáticos (`productType: sunscreen`) |
| `images/DESODORANTES_HD/**` | Estáticos (`productType: deodorant`) |
| `images/limpieza facial/**` | Estáticos (`productType: facial`) |
| `images/Accesorrios/CATALOGADOS/Aretes/**` | Joyería (`subType: earrings`) |
| `images/Accesorrios/CATALOGADOS/Collares/**` | Joyería (`subType: necklace`) |
| `images/Accesorrios/CATALOGADOS/Pulseras/**` | Joyería (`subType: bracelet`) |
| `images/Accesorrios/CATALOGADOS/Anillos/**` | Joyería (`subType: ring`) |
| `images/Accesorrios/CATALOGADOS/Sets/**` | Joyería (`subType: set`) |

Cuando la foto no viene de un folder conocido, `analyze-image` (Claude Vision) detecta la categoría y rutea al pipeline correcto.

---

## Qué NO es un pipeline

- **Batch** (`/batch`): orquestador genérico que aplica un pipeline existente a N imágenes. NO es un pipeline propio.
- **AI Agent** (`/agent`): detector-router. Lee la foto, detecta categoría, redirige al pipeline correcto. NO ejecuta steps propios.
- **Módulos sueltos** (ej: `/editor` con un módulo seleccionado): herramientas one-shot para edición manual. El usuario arma el flow a mano.

---

## Historial de consolidación

| Antes (obsoleto) | Ahora |
|---|---|
| `/catalog-pipeline` (6 steps hardcoded, lencería) | Migrado a `/pipelines/lingerie` |
| `agent-lenceria` preset en Batch | Eliminado — usar pipeline Lencería |
| `agent-perfumes` / `agent-cremas` / `agent-desodorantes` presets en Batch | Eliminados — usar pipeline Estáticos |
| `agent-accesorios` preset en Batch | Eliminado — usar pipeline Joyería |
| `getCatalogoPipeline()` fallback en `/api/ai-agent/plan` | Eliminado — AI Agent ya no genera planes, solo rutea |
| `getCambiarModeloPipeline()` fallback en `/api/ai-agent/plan` | Eliminado — caso de uso cubierto por Lencería |
| `docs/LINGERIE_PIPELINE_PLAN.md` | Migrado a `docs/pipelines/lingerie.md` |

Ver [CHANGELOG.md](../../CHANGELOG.md) del 2026-04-20 para el detalle de commits.
