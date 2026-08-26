# Referencia — rutas API

> **Tipo Diátaxis:** *Reference*. Describe **qué existe**, sin enseñar ni argumentar.
> Para el porqué del diseño, ver [`../architecture.md`](../architecture.md). Para qué proveedor corre cada paso y cuánto cuesta, ver [`../providers.md`](../providers.md).
>
> **51 rutas** en `unistudio/src/app/api/`. Verificado contra el código y `vercel.json` el **2026-08-26**.
> `maxDuration` en segundos, tomado de `unistudio/vercel.json`. El glob `src/app/api/**/*.ts` fija **60 s a todas las rutas API**; las 18 que aparecen con 120 o 300 tienen override explícito.

---

## Procesamiento de imagen

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/bg-remove` | POST | 300 | Quita el fondo. Cascade de proveedores según categoría |
| `/api/bg-generate` | POST | 300 | Genera fondo nuevo. 3 modos (fast / precise / creative), 27 presets |
| `/api/enhance` | POST | 60 | Color, brillo y contraste con Sharp. 10 presets. $0 |
| `/api/shadows` | POST | 60 | Sombras drop / contact / reflection (Sharp) + AI relight |
| `/api/inpaint` | POST | 120 | Borra marcas de agua, etiquetas y manchas; cambia colores |
| `/api/outpaint` | POST | 120 | Extiende la imagen a 14 formatos de plataforma |
| `/api/upscale` | POST | 300 | Real-ESRGAN → Clarity → Aura SR |
| `/api/macro-crop` | POST | 60 | Recorte macro con Sharp, sin IA. $0 |
| `/api/photo-clean` | POST | 120 | Limpia texto y ruido de la foto (Flux Kontext Pro) |
| `/api/validate-bg` | POST | 60 | Valida que el fondo generado cumpla los requisitos |

## Modelos y try-on

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/tryon` | POST | 300 | Try-on virtual. Cascade Uwear → SeedDream → Kolors |
| `/api/tryon/async` | POST, GET | 60 | Try-on por cola: POST encola, GET consulta estado |
| `/api/model-create` | POST | 300 | Genera modelo de IA (género, edad, tono de piel, pose) |
| `/api/ghost-mannequin` | POST | 60 | `model-to-ghost`, `remove-mannequin`, `flat-to-model`, `model-to-flat` |
| `/api/jewelry-tryon` | POST | 300 | Aplica joyería sobre el cuerpo. 7 sub-tipos |
| `/api/jewelry-scene` | POST | 300 | Construye la escena de lujo para el packshot de joyería |
| `/api/jewelry-prompts` | POST | 120 | Genera prompts específicos por sub-tipo de joya |
| `/api/face-swap` | POST | 120 | Sustituye la cara preservando producto, pose y luz |
| `/api/ai-models` | GET, PATCH | 60 | Registro de modelos de IA guardados |

## Uwear.ai

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/uwear-check` | GET | 60 | Verifica credenciales y saldo |
| `/api/uwear-models` | GET | 60 | Lista los avatares disponibles |
| `/api/uwear-options` | GET | 60 | Opciones de generación admitidas |
| `/api/uwear-art-directions` | GET | 60 | Direcciones de arte disponibles |
| `/api/uwear-presign` | GET | 60 | URL prefirmada para subir el producto |

## Photoroom

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/photoroom-check` | GET | 60 | Verifica credenciales, plan y cuota |
| `/api/photoroom-virtualmodel` | GET | 60 | Virtual Model. **Descartado** — ver [ADR-0008](../decisions/0008-photoroom-virtual-model-descartado.md) |

## Video y audio

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/video` | POST | 300 | Generación de video. 7 proveedores |
| `/api/video-enhance` | POST | 60 | Post-proceso del video generado |
| `/api/avatar` | POST | 300 | Avatar que habla. 5 proveedores |
| `/api/tts` | POST | 60 | Texto a voz. Edge TTS ($0) y Google Cloud |

## Inteligencia (Claude)

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/analyze-image` | POST | 120 | Análisis con Sharp + Claude Vision (marca de agua, luz, resolución) |
| `/api/analyze-product` | POST | 60 | Análisis de producto para los pipelines |
| `/api/product-features` | POST | 60 | **Ficha de fidelidad.** Ver [ADR-0009](../decisions/0009-claude-vision-anclaje-fidelidad.md) |
| `/api/identity-check` | POST | 60 | Compara entrada y salida: ¿sigue siendo el mismo producto? |
| `/api/ai-agent/plan` | POST | 60 | Planificación del pipeline con Claude Haiku |
| `/api/prompt` | POST | 60 | Genera 4 conceptos fotográficos por producto |
| `/api/prompt-templates` | GET, POST | 60 | Biblioteca de plantillas de prompt |

## Marketing y salida

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/ad-create` | POST | 300 | 7 plantillas de anuncio (IG, TikTok, FB, YT, Pinterest) |
| `/api/social-kit` | POST | 300 | Kit de Instagram con Sharp + ffmpeg. $0 |
| `/api/infographic` | POST | 60 | Infografía de producto |
| `/api/brand-kit` | GET, PUT | 60 | Colores, tipografías, logo y marca de agua |

## Datos y almacenamiento

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/upload` | POST | 60 | Subida de imagen |
| `/api/save-result` | POST | 60 | Guarda el resultado en Vercel Blob + DB |
| `/api/proxy-image` | GET, POST | 60 | Proxy de imágenes remotas (evita CORS) |
| `/api/db/history` | GET | 60 | Historial de procesamiento. Requiere `DATABASE_URL` |
| `/api/batch` | POST | 300 | Procesa varias imágenes por un pipeline configurable |
| `/api/health` | GET | 60 | Estado de los proveedores conectados |

## Inventario

| Ruta | Método | maxDuration | Qué hace |
|---|---|---:|---|
| `/api/inventory/scan` | GET | 60 | Escanea el catálogo completo |
| `/api/inventory/scan-bras` | GET | 60 | Escaneo filtrado a bras |
| `/api/inventory/scan-lingerie` | GET | 60 | Escaneo filtrado a lencería |
| `/api/inventory/load` | POST | 60 | Carga productos al espacio de trabajo |

---

## Notas de uso

**Rutas que NO existen.** No hay `/api/pipelines/lingerie`, `/api/pipelines/static-product` ni `/api/pipelines/jewelry`. Los pipelines se orquestan **desde el cliente**, encadenando `fetch` a las rutas de módulo desde `src/app/pipelines/<nombre>/page.tsx`. Ver [`../architecture.md`](../architecture.md) §5.3.

**Timeouts.** El glob de `vercel.json` da 60 s a toda ruta API nueva, así que una ruta lenta **no muere en el default de Vercel: muere a los 60 s**. Toda ruta que invoque generación de video, avatar, modelo o try-on necesita su override explícito en `vercel.json`. Algunas rutas declaran además `export const maxDuration` en su propio archivo; cuando las dos existen, la de `vercel.json` es la que se despliega.

**Claves de API.** Solo los adapters de `src/lib/api/` leen credenciales, y todos hacen `.trim()` sobre la clave. `vercel env pull` deja un `\n` final que provoca 401 silenciosos.

**Modelos de Replicate.** Los community models exigen el hash de versión (`owner/name:sha256…`); los oficiales van sin él.
