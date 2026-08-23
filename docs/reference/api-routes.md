# Referencia — rutas API

> **Tipo Diátaxis:** *Reference*. Describe **qué existe**, sin enseñar ni argumentar.
> Para el porqué del diseño, ver [`../architecture.md`](../architecture.md). Para qué proveedor corre cada paso y cuánto cuesta, ver [`../providers.md`](../providers.md).
>
> **51 rutas** en `unistudio/src/app/api/`. Generado y verificado contra el código el **2026-08-23**.
> `maxDuration` en segundos; `—` significa que usa el valor por defecto de Vercel.

---

## Procesamiento de imagen

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/bg-remove` | POST | — | Quita el fondo. Cascade de proveedores según categoría |
| `/api/bg-generate` | POST | 300 | Genera fondo nuevo. 3 modos (fast / precise / creative), 27 presets |
| `/api/enhance` | POST | — | Color, brillo y contraste con Sharp. 10 presets. $0 |
| `/api/shadows` | POST | — | Sombras drop / contact / reflection (Sharp) + AI relight |
| `/api/inpaint` | POST | — | Borra marcas de agua, etiquetas y manchas; cambia colores |
| `/api/outpaint` | POST | — | Extiende la imagen a 14 formatos de plataforma |
| `/api/upscale` | POST | — | Real-ESRGAN → Clarity → Aura SR |
| `/api/macro-crop` | POST | — | Recorte macro con Sharp, sin IA. $0 |
| `/api/photo-clean` | POST | — | Limpia texto y ruido de la foto (Flux Kontext Pro) |
| `/api/validate-bg` | POST | — | Valida que el fondo generado cumpla los requisitos |

## Modelos y try-on

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/tryon` | POST | — | Try-on virtual. Cascade Uwear → SeedDream → Kolors |
| `/api/tryon/async` | POST, GET | — | Try-on por cola: POST encola, GET consulta estado |
| `/api/model-create` | POST | 300 | Genera modelo de IA (género, edad, tono de piel, pose) |
| `/api/ghost-mannequin` | POST | — | `model-to-ghost`, `remove-mannequin`, `flat-to-model`, `model-to-flat` |
| `/api/jewelry-tryon` | POST | — | Aplica joyería sobre el cuerpo. 7 sub-tipos |
| `/api/jewelry-scene` | POST | — | Construye la escena de lujo para el packshot de joyería |
| `/api/jewelry-prompts` | POST | — | Genera prompts específicos por sub-tipo de joya |
| `/api/face-swap` | POST | 120 | Sustituye la cara preservando producto, pose y luz |
| `/api/ai-models` | GET, PATCH | — | Registro de modelos de IA guardados |

## Uwear.ai

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/uwear-check` | GET | — | Verifica credenciales y saldo |
| `/api/uwear-models` | GET | — | Lista los avatares disponibles |
| `/api/uwear-options` | GET | — | Opciones de generación admitidas |
| `/api/uwear-art-directions` | GET | — | Direcciones de arte disponibles |
| `/api/uwear-presign` | GET | — | URL prefirmada para subir el producto |

## Photoroom

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/photoroom-check` | GET | — | Verifica credenciales, plan y cuota |
| `/api/photoroom-virtualmodel` | GET | — | Virtual Model. **Descartado** — ver [ADR-0008](../decisions/0008-photoroom-virtual-model-descartado.md) |

## Video y audio

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/video` | POST | 300 | Generación de video. 7 proveedores |
| `/api/video-enhance` | POST | — | Post-proceso del video generado |
| `/api/avatar` | POST | 300 | Avatar que habla. 5 proveedores |
| `/api/tts` | POST | — | Texto a voz. Edge TTS ($0) y Google Cloud |

## Inteligencia (Claude)

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/analyze-image` | POST | — | Análisis con Sharp + Claude Vision (marca de agua, luz, resolución) |
| `/api/analyze-product` | POST | 60 | Análisis de producto para los pipelines |
| `/api/product-features` | POST | 60 | **Ficha de fidelidad.** Ver [ADR-0009](../decisions/0009-claude-vision-anclaje-fidelidad.md) |
| `/api/identity-check` | POST | 60 | Compara entrada y salida: ¿sigue siendo el mismo producto? |
| `/api/ai-agent/plan` | POST | — | Planificación del pipeline con Claude Haiku |
| `/api/prompt` | POST | — | Genera 4 conceptos fotográficos por producto |
| `/api/prompt-templates` | GET, POST | — | Biblioteca de plantillas de prompt |

## Marketing y salida

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/ad-create` | POST | — | 7 plantillas de anuncio (IG, TikTok, FB, YT, Pinterest) |
| `/api/social-kit` | POST | — | Kit de Instagram con Sharp + ffmpeg. $0 |
| `/api/infographic` | POST | — | Infografía de producto |
| `/api/brand-kit` | GET, PUT | — | Colores, tipografías, logo y marca de agua |

## Datos y almacenamiento

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/upload` | POST | — | Subida de imagen |
| `/api/save-result` | POST | — | Guarda el resultado en Vercel Blob + DB |
| `/api/proxy-image` | GET, POST | — | Proxy de imágenes remotas (evita CORS) |
| `/api/db/history` | GET | — | Historial de procesamiento. Requiere `DATABASE_URL` |
| `/api/batch` | POST | — | Procesa varias imágenes por un pipeline configurable |
| `/api/health` | GET | — | Estado de los proveedores conectados |

## Inventario

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/inventory/scan` | GET | — | Escanea el catálogo completo |
| `/api/inventory/scan-bras` | GET | — | Escaneo filtrado a bras |
| `/api/inventory/scan-lingerie` | GET | — | Escaneo filtrado a lencería |
| `/api/inventory/load` | POST | — | Carga productos al espacio de trabajo |

---

## Notas de uso

**Rutas que NO existen.** No hay `/api/pipelines/lingerie`, `/api/pipelines/static-product` ni `/api/pipelines/jewelry`. Los pipelines se orquestan **desde el cliente**, encadenando `fetch` a las rutas de módulo desde `src/app/pipelines/<nombre>/page.tsx`. Ver [`../architecture.md`](../architecture.md) §5.3.

**Timeouts.** Toda ruta que invoque generación de video, avatar o modelo debe declarar su `maxDuration` en `vercel.json`, o morirá en el valor por defecto de Vercel.

**Claves de API.** Solo los adapters de `src/lib/api/` leen credenciales, y todos hacen `.trim()` sobre la clave. `vercel env pull` deja un `\n` final que provoca 401 silenciosos.

**Modelos de Replicate.** Los community models exigen el hash de versión (`owner/name:sha256…`); los oficiales van sin él.
