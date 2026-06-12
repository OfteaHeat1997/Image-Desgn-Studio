# UniStudio — Módulos

> Los 18 módulos son la capa base del proyecto. Los pipelines (`docs/pipelines/`) los orquestan. Nunca duplicar lógica de módulo dentro de un pipeline: si falta un preset o proveedor, se agrega AL MÓDULO, no al pipeline.

**Última actualización:** 2026-04-20

---

## Índice de los 18 módulos

| # | Módulo | Ruta API | Proveedores | Usado por pipelines |
|---|---|---|---|---|
| 1 | BG Remove | `/api/bg-remove` | Browser WASM, Replicate rembg, grounded_sam, Docker self-hosted | Lencería (removeSubject), Estáticos, Joyería |
| 2 | BG Generate | `/api/bg-generate` | Flux Schnell (fast), Flux Pro (precise), Flux Kontext (creative) | Estáticos, Joyería |
| 3 | Enhance | `/api/enhance` | Sharp local | Los 3 pipelines |
| 4 | Shadows | `/api/shadows` | Sharp (contact/drop/reflection), Replicate Flux (AI relight) | Estáticos, Joyería |
| 5 | Inpaint | `/api/inpaint` | Flux Fill Dev, Flux Fill Pro, Kontext Pro | **Lencería** (step `texturePreserve` — flux-fill-pro restaura tela del bra post-tryon), uso manual vía editor |
| 6 | Outpaint | `/api/outpaint` | Flux Kontext Pro, **Flux Fill Pro** (direction mode con canvas+mask server-side) | **Lencería** (step `photoFullBody` extiende tryon hacia abajo, sin regenerar modelo), uso manual vía editor |
| 7 | Upscale | `/api/upscale` | Real-ESRGAN, Aura SR, Clarity | Lencería (opcional), Joyería (obligatorio) |
| 8 | Try-On | `/api/tryon` | **SeedDream v4 edit (fal, primario lencería)**, Kolors v1.5 (fal, backup), FASHN v1.6 (solo no-íntimos), IDM-VTON | Lencería (`auto` → SeedDream, cae a Kolors) |
| 9 | Model Create | `/api/model-create` | SeedDream 4.5 (fal), Flux Kontext Pro | Lencería, Joyería |
| 10 | Ghost Mannequin | `/api/ghost-mannequin` | SeedDream edit, Flux Kontext Pro | Ninguno (reemplazado por Lencería para lencería real) |
| 11 | Jewelry Try-On | `/api/jewelry-tryon` | Flux Kontext Pro | Joyería |
| 12 | Video | `/api/video` | Ken Burns, wan-2.1, wan-2.2-fast, Kling, Minimax, LTX, fal/replicate | Lencería (modelo/flat-lay), Joyería (Ken Burns) |
| 13 | Ad Creator | `/api/ad-create` | fal.ai + Replicate varios | Ninguno (uso manual) |
| 14 | Analyze Image | `/api/analyze-image` | Claude Vision (Sonnet) + Sharp | Los 3 pipelines |
| 15 | AI Prompt | `/api/prompt` | Claude Haiku | Ninguno (uso manual) |
| 16 | Avatar | `/api/avatar` | Hedra, fal LTX avatar, Replicate SadTalker/LivePortrait/MuseTalk | Ninguno (uso manual) |
| 17 | TTS | `/api/tts` | node-edge-tts (gratis), Google Cloud TTS | Avatar |
| 18 | Infographic | `/api/infographic` | Composición Sharp + texto | Ninguno actualmente |

---

## Módulos compartidos entre pipelines

Estos 5 módulos son usados por los 3 pipelines. Cualquier cambio en ellos requiere validación en los 3:

- `bg-remove` — cada pipeline lo usa con flags distintos (`removeSubject:true` para Lencería, normal para los otros).
- `enhance` — distintos presets por pipeline; el módulo debe exponer todos los presets.
- `analyze-image` — única fuente de verdad para clasificación de categoría/sub-tipo.
- `upload` — pre-upload obligatorio en todos los pipelines para esquivar límite de 4.5MB body.
- `ai-models` (tabla Prisma) — reuso de modelos IA compartido entre Lencería y Joyería.

---

## Módulos exclusivos de 1 pipeline

| Módulo | Pipeline único que lo usa | Razón |
|---|---|---|
| `tryon` | Lencería | Solo lencería hace try-on general. Primario SeedDream v4 edit (preserva producto), Kolors backup. Joyería usa `jewelry-tryon` aparte. |
| `inpaint` (flux-fill-pro) | Lencería | Step `texturePreserve`: post-tryon, máscara del bra (grounded_sam returnMaskOnly) + inpaint con prompt material para recuperar textura real. |
| `jewelry-tryon` | Joyería | Composición específica para piezas (orejas/cuello/mano/muñeca). |
| `bg-generate` | Estáticos + Joyería | Lencería no genera fondos (el tryon ya pone el fondo del modelo). |
| `shadows` | Estáticos + Joyería | Lencería no agrega sombras (el modelo IA ya tiene iluminación). |
| `model-create` | Lencería + Joyería | Estáticos no usa modelos humanos. |

---

## Módulos no usados por pipelines (uso manual)

Estos módulos están expuestos en `/editor` y `/batch` pero ningún pipeline canónico los orquesta:

- `inpaint` — remover watermarks, manchas, objetos específicos.
- `outpaint` — extender imagen para plataformas.
- `ad-create` — generar anuncios sociales.
- `ai-prompt` — sugerir conceptos creativos.
- `avatar` + `tts` — avatares parlantes.
- `infographic` — texto sobrepuesto estilo Leonisa.
- `ghost-mannequin` — quitar maniquí (modo original — NO usar para lencería real, eso va al pipeline Lencería).

Si uno de estos se integra a un pipeline en el futuro, actualizar este README en el mismo commit.

---

## Regla de sincronización (recordatorio)

Copiada de `docs/pipelines/README.md` regla #3:

> Si un pipeline cambia de proveedor en un step, en el MISMO commit se actualizan:
> 1. El pipeline (`/api/pipelines/<nombre>/route.ts`)
> 2. El módulo correspondiente (`/api/<modulo>/route.ts`)
> 3. Esta tabla (`docs/modules/README.md`)
> 4. La doc del pipeline (`docs/pipelines/<nombre>.md`)

No commits separados.

---

## Gotchas por módulo

Copiado de `CLAUDE.md` — preservar estos invariantes al tocar módulos:

- **Flux Kontext Pro** (`inpaint`, `outpaint`, `shadows` AI relight, `jewelry-tryon`, `ghost-mannequin`): usa `input_image` NO `image`. No soporta `output_format`.
- **Replicate community models** (inpaint Flux Fill, upscale Clarity): versión sha256 obligatoria en el slug.
- **wan-2.1** (video): NO tiene `num_frames`, usa `aspect_ratio`.
- **wan-2.2-fast** (video): `num_frames >= 81`, `guidance_scale: 3.0`, `negative_prompt` obligatorio para no duplicar producto.
- **Inpaint flux-fill-pro/dev**: `negative_prompt` se pasa al API call (hubo regresión donde se computaba pero no se enviaba).
- **Upscale Clarity**: `resemblance: 0.85`, `creativity: 0.25`, usar helper `replicateUrl`.
- **Avatar**: validar script length + provider + TTS provider en la route antes de llamar fal.
- **Video MP4**: guardar a galería via URL (no `toPersistentThumbnail` — falla en `.mp4`).
- **Ghost Mannequin lencería**: usa `model-to-ghost` con `garmentType` de la lista LINGERIE_TYPES → SeedDream edit (no Flux). Prompts color-agnostic.
- **Todas las APIs**: `.trim()` en env vars (fal, replicate, fashn) — `vercel env pull` deja `\n` al final.
