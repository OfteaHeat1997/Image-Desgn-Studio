# Guía de aprendizaje — Pipeline de Lencería

> **Para:** Maria (aprendiendo a programar)
> **Qué es:** explicación de CADA feature que construimos en esta sesión, por qué existe, dónde está el código, y cómo funciona. Pensado para que abras el archivo al lado del código y vayas leyendo.
>
> **Archivo principal:** `unistudio/src/app/pipelines/lingerie/page.tsx` (~3800 líneas)
> **URL para testear:** https://unistudio.vercel.app/pipelines/lingerie

---

## Cómo está organizado el archivo

```
page.tsx (3800 líneas)
│
├── TIPOS (líneas 1-185)
│   ├── StepId, StepStatus, Phase — qué pasos existen y en qué estado pueden estar
│   ├── PipelineStep — la info de cada paso (isolate, model, tryon, etc.)
│   ├── ImageJob — UNA foto subida + su estado + sus resultados
│   ├── PhotoAngle — frontal/espalda/lado/detalle/flat/otra
│   └── GenerationMode — default/face-swap/multi-sample
│
├── FUNCIONES DETECTORAS (líneas 130-340)
│   ├── detectPhotoAngle() — mira el nombre del archivo y adivina si es frontal/espalda
│   ├── detectColor() — extrae el color (beige/negro/etc) del nombre
│   ├── detectSize() — extrae la talla (38B, XL) del nombre
│   ├── detectReferenceKey() — extrae el número de REF (011473) del nombre
│   └── sizeToBodyType() — mapea talla a tipo de cuerpo sugerido
│
├── CONSTANTES (líneas 340-500)
│   ├── STEP_DEFS — los 7 pasos del pipeline (isolate, model, tryon, photoBack, etc.)
│   ├── STEP_DOCS — documentación de cada paso (proveedor, costo, fallas, tips)
│   ├── PHOTO_ANGLE_OPTIONS — opciones del dropdown de ángulo
│   ├── GENERATION_MODE_OPTIONS — las 3 opciones del selector de modo
│   └── TRYON_PROVIDER_OPTIONS — opciones de proveedor para retry
│
├── COMPONENTES UI (líneas 500-1500)
│   ├── StatusBadge — badge de color por estado (procesando/listo/error)
│   ├── ModelThumb — thumbnail de modelo IA (con fallback si la URL expiró)
│   ├── ImageThumb — thumbnail genérica
│   ├── ImageLightbox — modal full-screen para ver imágenes grandes
│   ├── ProductSpecPanel — ficha técnica editable (Claude Vision)
│   ├── StepCard — la tarjeta de cada paso (el componente más grande)
│   └── UploadZone — zona de drag-and-drop para subir fotos
│
├── COMPONENTE PRINCIPAL: LingeriePipelinePage (líneas 1857+)
│   ├── useState hooks — todo el estado del pipeline
│   ├── Persistencia — localStorage read/write
│   ├── Undo/Redo — history stack
│   ├── Handlers — handleFiles, removeJob, loadInventoryBras, etc.
│   ├── Pipeline engine — executeStep, processJob, startPipeline
│   └── JSX render — la UI que ves en el browser
│
└── API ROUTES (archivos separados)
    ├── /api/analyze-product — Claude Vision lee las fotos
    ├── /api/face-swap — cambia la cara en una foto
    ├── /api/inventory/scan-bras — escanea el inventario de bras
    ├── /api/model-create — genera modelo IA
    ├── /api/tryon — viste la modelo con tu prenda
    ├── /api/bg-remove — quita el fondo/modelo
    └── /api/video — genera videos 360°
```

---

## Feature por feature — QUÉ, POR QUÉ, DÓNDE, CÓMO

### 1. Auto-detección de ángulo (P0-1)

**QUÉ:** cuando subís una foto, el sistema lee el nombre del archivo y adivina si es frontal, espalda, lado, etc.

**POR QUÉ:** tu mamá sube "bh negro patras 011473.png" — el sistema debe SABER que "patras" = espalda sin que ella tenga que configurar nada.

**DÓNDE:**
- Función `detectPhotoAngle()` — línea ~130 de page.tsx
- Se llama desde `handleFiles()` — línea ~2066
- Se muestra en el badge arriba-izquierda de cada foto — línea ~3038

**CÓMO funciona:**
```javascript
function detectPhotoAngle(filename) {
  const f = filename.toLowerCase();
  // Si el nombre contiene "patras", "atras", "espalda", "back" → es espalda
  if (/patras|atras|espalda|back/.test(f)) return "espalda";
  // Si contiene "delante", "frente", "frontal", "front" → es frontal
  if (/delante|frente|frontal|front/.test(f)) return "frontal";
  // etc. para lado, detalle, flat
  return "frontal"; // si no matchea nada, asumimos frontal
}
```

**Concepto de programación:** esto es un **pattern matcher** — usa **expresiones regulares** (regex) para buscar palabras dentro de un string. `\b` significa "límite de palabra" para no matchear parciales.

---

### 2. Detección de color (P1-2)

**QUÉ:** extrae el color del nombre del archivo.

**POR QUÉ:** para agrupar fotos del mismo producto por color y mostrar badges con swatch (punto de color).

**DÓNDE:**
- Función `detectColor()` — línea ~234
- Constante `COLOR_SWATCH` — línea ~280 (mapea nombre a hex para el punto de color)
- Badge en UI — línea ~3044

**CÓMO funciona:** igual que detectPhotoAngle, pero busca nombres de colores. Incluye typos comunes ("berde" → "verde").

---

### 3. Detección de talla + sugerencia de bodyType

**QUÉ:** extrae "38B", "XL" del filename. Sugiere qué tipo de modelo usar.

**POR QUÉ:** tu mamá dijo "por cada talla, la modelo se tiene que ver más gorda o más flaca". Un bra 32B no debería mostrar una modelo plus-size.

**DÓNDE:**
- `detectSize()` — línea ~291
- `sizeToBodyType()` — línea ~315
- Badge azul en UI — línea ~3056
- Warning amber — línea ~2988

**CÓMO funciona:**
```javascript
// 32B → slim, 36B → average, 38C → curvy, 42D → plus-size
function sizeToBodyType(size) {
  const num = parseInt(size); // extrae el número
  if (num <= 34) return "slim";
  if (num === 36) return "average";
  if (num <= 38) return "curvy";
  return "plus-size";
}
```

---

### 4. Undo/Redo (Ctrl+Z)

**QUÉ:** podés deshacer acciones (subir foto, borrar, cambiar ángulo).

**POR QUÉ:** toda app profesional tiene undo. Sin él, borrar una foto por error = perderla para siempre.

**DÓNDE:**
- `historyRef` (stack de estados anteriores) — línea ~2027
- `pushHistory()` — línea ~2034
- `undoJobs()` / `redoJobs()` — líneas ~2044, ~2055
- Listener de Ctrl+Z — línea ~2175
- Botones visibles — línea ~2803

**CÓMO funciona:**
```
Estado actual: [foto1, foto2, foto3]
↓ La usuaria borra foto2
pushHistory() guarda [foto1, foto2, foto3] en historyRef
Estado nuevo: [foto1, foto3]
↓ La usuaria aprieta Ctrl+Z
undoJobs() saca [foto1, foto2, foto3] de historyRef
Estado restaurado: [foto1, foto2, foto3]  ← foto2 vuelve!
```

**Concepto de programación:** esto es un **stack** (pila). `push()` agrega al tope, `pop()` saca del tope. El "redo" es un SEGUNDO stack que guarda lo que deshiciste.

---

### 5. Persistencia en localStorage

**QUÉ:** cuando refrescás la página, tus settings + fotos + resultados siguen ahí.

**POR QUÉ:** sin esto, cada refresh borrabatodo. Frustrante en mobile donde el browser cierra apps en background.

**DÓNDE:**
- Leer al mount — línea ~1775 (settings), ~1854 (jobs)
- Escribir con debounce — línea ~1936 (settings), ~1950 (jobs)

**CÓMO funciona:**
```javascript
// GUARDAR: cada vez que cambian los jobs, esperamos 800ms y guardamos
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem("lingerie:pipeline:jobs:v1", JSON.stringify(jobs));
  }, 800); // 800ms de "debounce" para no guardar 100 veces por segundo
  return () => clearTimeout(timer); // si cambia de vuelta antes de 800ms, cancela
}, [jobs]);

// LEER: al cargar la página, leemos lo guardado
const [jobs] = useState(() => {
  const raw = localStorage.getItem("lingerie:pipeline:jobs:v1");
  return raw ? JSON.parse(raw) : [];
});
```

**Concepto de programación:** **localStorage** es como un mini-base-de-datos en el browser. Guarda strings por clave. Sobrevive refresh pero NO cross-domain (solo tu app lo ve). **Debounce** = esperar un rato antes de hacer algo, por si la acción se repite rápido.

---

### 6. Modos de generación

**QUÉ:** 3 formas de generar las fotos — default, face-swap, multi-sample.

**POR QUÉ:** cada modo tiene tradeoffs distintos de calidad, costo y legalidad. La usuaria elige según el caso.

**DÓNDE:**
- Estado `generationMode` — línea ~1877
- Selector en UI — línea ~3103
- Branching en `executeStep()` — línea ~2264

**CÓMO funciona:**
```
Si modo = "default":
  → genera modelo IA nueva + viste con Kolors (flow clásico)
  → legalmente limpio, pero Kolors "aproxima" la prenda

Si modo = "face-swap":
  → usa TU foto real + cambia solo la cara por la modelo IA
  → producto idéntico, pero usa la foto original (cuidado copyright)

Si modo = "multi-sample":
  → genera 4 variantes en paralelo con seeds distintos
  → la usuaria ve las 4 y elige la mejor
  → 4× más caro pero máximo control
```

**Concepto de programación:** esto es un **strategy pattern** — el mismo pipeline, pero el comportamiento cambia según la "estrategia" elegida. El código usa `if (generationMode === "face-swap")` para decidir qué path tomar.

---

### 7. Botón Detener (AbortController)

**QUÉ:** botón rojo que cancela un paso en ejecución.

**POR QUÉ:** sin él, si un paso tardaba 3 minutos y no te gustaba, tenías que esperar.

**DÓNDE:**
- `abortControllersRef` (Map de controllers) — línea ~2215
- `stopStep()` — línea ~2222
- Pasar `signal` a todos los `fetch()` — líneas ~1067, 1107, etc.
- Botón en UI — dentro de StepCard header

**CÓMO funciona:**
```javascript
// Crear un controller por cada step
const controller = new AbortController();
// Pasar el signal al fetch
const res = await fetch("/api/tryon", { signal: controller.signal, ... });
// Si la usuaria aprieta "Detener":
controller.abort(); // ← esto hace que el fetch explote con AbortError
```

**Concepto de programación:** **AbortController** es una API del browser para cancelar requests HTTP en vuelo. El `signal` es como una "cuerda" que conecta el botón con el fetch — cuando tirás de la cuerda (abort), el fetch se cancela.

---

### 8. Lightbox con comparación

**QUÉ:** click en cualquier resultado → modal full-screen para ver detalles + descargar + comparar con original.

**POR QUÉ:** los thumbnails son muy chicos para evaluar si el bra quedó fiel al original. Necesitás verlo grande.

**DÓNDE:**
- Componente `ImageLightbox` — línea ~641
- `compareMode` state — línea ~660
- Split view (Original vs Resultado) — línea ~762
- Shortcut tecla C — línea ~671

**CÓMO funciona:** el lightbox es un `<div>` con `position: fixed` que cubre toda la pantalla. Las flechas cambian el `idx` (índice) del array de imágenes. "Comparar" activa un modo que muestra 2 imágenes lado a lado en vez de 1.

---

### 9. Smart fallback

**QUÉ:** cuando un paso falla (ej. "Foto Cuerpo Completo"), si tenés una foto real del ángulo correspondiente, la usa como resultado en vez de mostrar error.

**POR QUÉ:** antes, si el paso fallaba, perdías $0.075 Y veías un error rojo. Ahora, se recicla tu foto real y el pipeline sigue.

**DÓNDE:**
- Catch block en processJob — línea ~2295
- `findMatchingPhoto()` busca la foto tagged — línea ~2238

**CÓMO funciona:**
```
Paso "Foto Cuerpo Completo" falló
↓
¿Hay una foto tagged como "flat" o "frontal" en el batch?
↓ SÍ
Usarla como resultado del paso (cost = $0)
↓ Toast: "Foto Cuerpo Completo falló — usamos tu foto real"
Pipeline sigue normal
```

---

### 10. Gallery auto-save

**QUÉ:** cada resultado se guarda automáticamente en /gallery.

**POR QUÉ:** antes, cerrando la pestaña perdías todo. Ahora los resultados quedan en la galería entre sesiones.

**DÓNDE:**
- `useGalleryStore.getState().addImages()` — al final de processJob (~línea 2414)

**CÓMO funciona:** el gallery-store es un store Zustand (como una mini-base-de-datos en el browser) que persiste a localStorage con un mecanismo especial que excluye blobs grandes para no exceder el quota.

---

### 11. Cargar inventario

**QUÉ:** botón que carga las 128 fotos del inventario de BH desde el servidor, sin arrastrar archivos.

**POR QUÉ:** arrastrar 128 fotos a mano en cada sesión es tedioso. 1 click es mejor.

**DÓNDE:**
- Endpoint `/api/inventory/scan-bras` — `src/app/api/inventory/scan-bras/route.ts`
- Función `loadInventoryBras()` — línea ~2105 en page.tsx
- Botón en UI — línea ~2834

**CÓMO funciona:**
```
1. Click en "Cargar inventario"
2. Frontend llama GET /api/inventory/scan-bras
3. Endpoint lee public/inventory/bras/*/*.png con fs.readdirSync()
4. Devuelve JSON con: { ref, photos: [{ filename, angle, color, relativePath }] }
5. Frontend fetchea cada foto como blob (6 en paralelo para no saturar)
6. Convierte blob → File → handleFiles() (mismo flow que drag-and-drop)
7. Las fotos aparecen en la grilla con todos los badges auto-detectados
```

**Concepto de programación:** esto es un **ETL** (Extract-Transform-Load) simplificado. Extract = leer del filesystem. Transform = detectar ángulo/color/REF. Load = crear ImageJobs en la UI.

---

### 12. Provider switcher

**QUÉ:** cuando un paso falla o no te gusta el resultado, podés elegir otro proveedor de IA y reintentar.

**POR QUÉ:** Kolors a veces reinterpreta mal el broche. FASHN puede hacerlo mejor. Tener opciones = más control.

**DÓNDE:**
- Dropdown en error UI de StepCard — línea ~1138
- `providerOverride` en PipelineStep — campo del tipo
- Se pasa a `runStep()` → a `fetch("/api/tryon", { provider })` — línea ~1373

---

### 13. Ficha técnica con Claude Vision

**QUÉ:** antes de correr el pipeline, Claude Vision "lee" tu foto y extrae: color, tela, textura, tipo, copa, tirantes, broche, etc.

**POR QUÉ:** si la IA sabe que tu bra tiene "broche frontal de 5 ganchos" puede preservar ese detalle en la generación (en una iteración futura — hoy la ficha es solo informativa/editable).

**DÓNDE:**
- Endpoint `/api/analyze-product` — `src/app/api/analyze-product/route.ts`
- Se llama desde processJob — línea ~2172
- Panel editable `ProductSpecPanel` — línea ~1335

**CÓMO funciona:** manda la foto a la API de Anthropic (Claude Vision) como base64. Claude la "mira" y devuelve un JSON con los campos del producto. El frontend muestra ese JSON como campos editables.

---

## Archivos que toqué en esta sesión (NO borrar)

| Archivo | Qué hice |
|---|---|
| `unistudio/src/app/pipelines/lingerie/page.tsx` | El 95% de los cambios — toda la UI + lógica del pipeline |
| `unistudio/src/app/api/analyze-product/route.ts` | NUEVO — Claude Vision para ficha técnica |
| `unistudio/src/app/api/face-swap/route.ts` | NUEVO — face-swap (experimental) |
| `unistudio/src/app/api/inventory/scan-bras/route.ts` | NUEVO — escanear inventario de bras |
| `unistudio/src/app/api/tryon/route.ts` | Modificado — agregué fashnMode + provider override |
| `unistudio/src/lib/api/fashn.ts` | Modificado — agregué mode param a FashnRunInput |
| `unistudio/vercel.json` | Modificado — agregué timeout para face-swap |
| `unistudio/public/inventory/bras/` | NUEVO — 128 fotos copiadas del inventario |
| `docs/ux-research-2026-04-22.md` | NUEVO — investigación de 8 competidores |
| `docs/inventory-fixes-for-mom.md` | NUEVO — lista de arreglos para mamá |
| `docs/testing-checklist.html` | NUEVO — checklist de testing |
| `docs/pendientes.md` | Modificado — estado actualizado |

## Archivos que NO toqué (de otros chats/terminales)

- Todos los otros pipelines (`jewelry/page.tsx`, `static-product/page.tsx`)
- Todos los stores (`gallery-store.ts`, `video-store.ts`, etc.)
- Todos los otros API routes (excepto tryon + fashn)
- Todo el folder `src/components/` (los módulos individuales)
- `CLAUDE.md`, `README.md`, `CHANGELOG.md`
- Todo lo de `docs/pipelines/`, `docs/modules/`, `docs/architecture.md`

---

## Conceptos de programación que usamos

| Concepto | Dónde lo usamos | Qué es |
|---|---|---|
| **useState** | Por todo el componente | Variable que cuando cambia, React re-dibuja la UI |
| **useCallback** | Todos los handlers | Función que se "memoriza" para no recrearse cada render |
| **useRef** | historyRef, abortControllersRef | Variable que persiste entre renders pero NO causa re-render al cambiar |
| **useEffect** | Persistencia, listeners | Código que corre "después" del render (para efectos secundarios) |
| **localStorage** | Persistencia | Base de datos mini del browser (5-10MB, sobrevive refresh) |
| **AbortController** | Botón Detener | API del browser para cancelar fetch() en vuelo |
| **Regex** | Detectores | Patrón para buscar texto dentro de un string |
| **Stack** | Undo/Redo | Estructura de datos LIFO (último en entrar, primero en salir) |
| **Debounce** | localStorage write | Esperar un rato antes de ejecutar, por si la acción se repite |
| **Strategy pattern** | Modos de generación | Mismo pipeline, comportamiento distinto según la estrategia elegida |
| **ETL** | Cargar inventario | Extract (leer) → Transform (detectar metadata) → Load (crear jobs) |
| **Promise.all** | Pre-upload, multi-sample | Ejecutar N operaciones en paralelo y esperar que TODAS terminen |
| **Zustand** | Gallery store | Librería de state management (como Redux pero más simple) |

---

## Para testear

1. **URL:** https://unistudio.vercel.app/pipelines/lingerie
2. **Checklist completa:** `docs/testing-checklist.html` (50 checkboxes)
3. **Inventario para arreglar:** `docs/inventory-fixes-for-mom.md`
4. **Research de competidores:** `docs/ux-research-2026-04-22.md`
5. **Estado de pendientes:** `docs/pendientes.md`
