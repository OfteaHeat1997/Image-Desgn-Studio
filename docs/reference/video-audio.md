# Referencia — proveedores de video, avatar y voz

> **Tipo Diátaxis:** *Reference*. Catálogo de proveedores del subsistema de video.
> Para los proveedores de **imagen** por paso de pipeline, ver [`../providers.md`](../providers.md).

Configuración en `src/lib/video/` (proveedores, presets, TTS, costes). Rutas: `/api/video`, `/api/video-enhance`, `/api/avatar`, `/api/tts`.

---

## Video — 7 proveedores

| Proveedor | Coste | Duración | Calidad | Backend |
|---|---|---|---|---|
| **Ken Burns** | **$0** | 5-15 s | Zoom / paneo básico | CSS, sin IA |
| LTX-Video | $0.04 | 5 s | Buena | fal.ai |
| **Wan 2.2 Fast** | $0.05 | 3-5 s | Buena | Replicate |
| Wan 2.5 | $0.05-0.10 | 3-5 s | Muy buena | fal.ai |
| Wan 2.1 | $0.05 | 3-5 s | Buena | Replicate |
| **Kling 2.6** | $0.07/s | 5-10 s | Excelente | fal.ai |
| Minimax Hailuo | $0.35-0.80 | 5-6 s | Excelente | fal.ai |

**En uso hoy:** `wan-2.2-fast` para el video 360° de producto ($0.05) y **Kling 2.6** para el video de modelo ($0.35). Kling es, con diferencia, la operación más cara del sistema.

### Particularidades que ya han costado un bug

- **`wan-2.1`** no tiene `num_frames`; usa `aspect_ratio`.
- **`wan-2.2-fast`** exige `num_frames >= 81`, `guidance_scale: 3.0` y `negative_prompt` — sin el negative prompt **duplica el producto**.
- Los resultados de video se guardan en la galería **por el flujo de URL**, no con `toPersistentThumbnail`, que falla sobre `.mp4`.

---

## Avatar — 5 proveedores

| Proveedor | Coste | Calidad | Backend |
|---|---|---|---|
| Wav2Lip | $0.005 | Lip sync básico | Replicate |
| MuseTalk | $0.04 | Lip sync bueno | Replicate |
| SadTalker | $0.08 | Animación facial completa | Replicate |
| LivePortrait | $0.09 | La mejor | Replicate |
| Hedra Free | $0 (limitado) | Buena | API de Hedra |

`/api/avatar` valida en el borde la longitud del guion, el proveedor y el proveedor de TTS **antes** de llamar a fal.

---

## Texto a voz — 2 proveedores

| Proveedor | Coste | Voces | Idiomas |
|---|---|---|---|
| **Edge TTS** | **$0** | 13 | 5 (ES, EN, FR, NL, PAP) |
| Google Cloud TTS | $0 (capa gratuita) | Muchas | Todos |

> **Restricción de importación:** `tts.ts` usa `node-edge-tts` (WebSocket y APIs de Node) y **solo se puede importar en código de servidor**. Para el cliente existe `tts-voices.ts` con las constantes de voz. Importarlo en un componente rompe el build.

---

## Timeouts

`video`, `avatar` y `model-create` declaran `maxDuration = 300` en `vercel.json`. Cualquier ruta nueva que invoque generación de video o avatar **tiene que registrarse ahí** o morirá en el valor por defecto de Vercel.
