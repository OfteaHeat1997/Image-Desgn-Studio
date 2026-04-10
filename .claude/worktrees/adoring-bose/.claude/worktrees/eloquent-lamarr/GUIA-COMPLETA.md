# UniStudio — Guia Completa para Entender el Proyecto

> Esta guia explica TODO el proyecto como si fueras estudiante.
> No necesitas saber todo de memoria — usa esta guia como referencia.

---

## 1. QUE ES UNISTUDIO (en palabras simples)

UniStudio es una **aplicacion web** que convierte fotos de productos (lenceria, joyeria, belleza) en fotos profesionales usando inteligencia artificial.

**Antes de UniStudio**: Pagabas $200+/mes en 5-6 herramientas diferentes (Photoroom, remove.bg, etc.)
**Con UniStudio**: Todo en UNA sola app por $3-15/mes en costos de API.

---

## 2. ARQUITECTURA — Como Esta Organizado

```
unistudio/
│
├── src/app/                    ← PAGINAS (lo que ve el usuario)
│   ├── page.tsx                   Dashboard (pagina principal)
│   ├── editor/page.tsx            Editor (donde se procesan fotos)
│   ├── agent/page.tsx             Agente IA (automatizacion)
│   ├── batch/page.tsx             Procesamiento masivo
│   ├── brand-kit/page.tsx         Kit de marca
│   ├── gallery/page.tsx           Galeria de resultados
│   ├── workflows/page.tsx         Guia visual de flujos
│   ├── docs/page.tsx              Documentacion interactiva
│   │
│   └── api/                    ← BACKEND (29 endpoints)
│       ├── bg-remove/route.ts     Quitar fondo
│       ├── bg-generate/route.ts   Generar fondo con IA
│       ├── enhance/route.ts       Mejorar calidad
│       ├── upscale/route.ts       Aumentar resolucion
│       ├── shadows/route.ts       Sombras e iluminacion
│       ├── inpaint/route.ts       Borrar/reemplazar objetos
│       ├── outpaint/route.ts      Extender imagen
│       ├── tryon/route.ts         Prueba virtual de ropa
│       ├── model-create/route.ts  Crear modelo IA
│       ├── ghost-mannequin/...    Maniqui invisible
│       ├── jewelry-tryon/...      Joyeria virtual
│       ├── video/route.ts         Generar video
│       ├── ad-create/route.ts     Crear anuncios
│       ├── ai-agent/plan/...      Planeacion con Claude IA
│       ├── analyze-image/...      Analisis de imagen
│       ├── health/route.ts        Estado del sistema
│       └── ... (13 mas)
│
├── src/components/             ← INTERFAZ DE USUARIO
│   ├── modules/                   19 paneles de modulos
│   │   ├── BgRemovePanel.tsx
│   │   ├── BgGeneratePanel.tsx
│   │   ├── EnhancePanel.tsx
│   │   ├── UpscalePanel.tsx
│   │   ├── AiAgentPanel.tsx
│   │   └── ... (14 mas)
│   ├── editor/                    Layout del editor
│   │   ├── ModuleSidebar.tsx      Barra lateral izquierda
│   │   └── Toolbar.tsx            Barra superior
│   └── ui/                        Componentes reutilizables
│       ├── button.tsx
│       ├── modal.tsx
│       ├── toast.tsx
│       ├── empty-state.tsx
│       └── result-banner.tsx
│
├── src/hooks/                  ← LOGICA REUTILIZABLE
│   ├── useAgentPipeline.ts        Motor del agente IA
│   └── use-toast.ts               Sistema de notificaciones
│
├── src/stores/                 ← ESTADO GLOBAL (Zustand)
│   ├── editor-store.ts            Estado del canvas/capas/undo
│   ├── gallery-store.ts           Historial de imagenes
│   ├── batch-store.ts             Estado de procesamiento masivo
│   ├── video-store.ts             Estado de video
│   ├── brand-store.ts             Colores/fuentes de marca
│   └── settings-store.ts          Configuracion general
│
├── src/lib/                    ← UTILIDADES Y LOGICA DE NEGOCIO
│   ├── api/                       Clientes de APIs externas
│   │   ├── replicate.ts           Replicate (IA de imagenes)
│   │   ├── fal.ts                 fal.ai (IA de video)
│   │   ├── fashn.ts               FASHN (try-on premium)
│   │   └── withoutbg.ts           withoutBG (Docker local)
│   ├── processing/                16 modulos de procesamiento
│   │   ├── bg-remove.ts
│   │   ├── bg-generate.ts
│   │   ├── enhance.ts
│   │   └── ... (13 mas)
│   ├── video/                     Sistema de video
│   │   ├── providers.ts           7 proveedores de video
│   │   ├── presets.ts             Presets de movimiento
│   │   ├── cost.ts                Calculo de costos
│   │   └── tts.ts                 Text-to-speech
│   └── db/
│       ├── prisma.ts              Cliente de base de datos
│       └── persist.ts             Guardar resultados
│
├── src/types/                  ← DEFINICIONES DE TIPOS
│   ├── api.ts                     Tipos de API
│   ├── video.ts                   Tipos de video
│   ├── agent.ts                   Tipos del agente IA
│   ├── batch.ts                   Tipos de batch
│   └── editor.ts                  Tipos del editor
│
└── prisma/
    └── schema.prisma           ← ESQUEMA DE BASE DE DATOS
```

---

## 3. FLUJO DE DATOS — Como Viaja una Foto

Este es el camino que sigue una foto desde que el usuario la sube hasta que sale procesada:

```
╔══════════════════════════════════════════════════════════════════╗
║                    FLUJO COMPLETO DE UNA FOTO                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  USUARIO                                                         ║
║    │                                                             ║
║    ▼                                                             ║
║  [1] Sube foto (drag & drop o click)                             ║
║    │  Archivo: foto-producto.jpg                                 ║
║    │                                                             ║
║    ▼                                                             ║
║  [2] Editor guarda en estado local                               ║
║    │  currentImageFile = File object                             ║
║    │  currentImage = blob:http://localhost:3000/abc123            ║
║    │                                                             ║
║    ▼                                                             ║
║  [3] Usuario elige modulo (ej: "Quitar Fondo")                   ║
║    │  selectedModule = "bg-remove"                               ║
║    │  Se muestra BgRemovePanel en la barra lateral               ║
║    │                                                             ║
║    ▼                                                             ║
║  [4] Usuario configura opciones                                  ║
║    │  provider = "replicate"                                     ║
║    │  outputType = "transparent"                                 ║
║    │                                                             ║
║    ▼                                                             ║
║  [5] Click "Procesar" → Panel envia al API                      ║
║    │                                                             ║
║    │  POST /api/bg-remove                                        ║
║    │  Body: { imageUrl: "data:image/jpeg;base64,...",            ║
║    │          provider: "replicate" }                             ║
║    │                                                             ║
║    ▼                                                             ║
║  [6] API Route recibe y valida                                   ║
║    │  → Verifica que imageUrl existe                             ║
║    │  → Verifica que provider es valido                          ║
║    │                                                             ║
║    ▼                                                             ║
║  [7] API Route llama al servicio de IA                           ║
║    │                                                             ║
║    │  replicate.ts → runModel("lucataco/remove-bg", {            ║
║    │    image: imageUrl                                          ║
║    │  })                                                         ║
║    │                                                             ║
║    │  Replicate procesa (10-30 segundos)                         ║
║    │                                                             ║
║    ▼                                                             ║
║  [8] Servicio de IA devuelve resultado                           ║
║    │  resultUrl = "https://replicate.delivery/abc/result.png"    ║
║    │                                                             ║
║    ▼                                                             ║
║  [9] API Route guarda en base de datos (sin bloquear)            ║
║    │  saveJob({ operation: 'bg-remove', cost: 0.01, ... })      ║
║    │                                                             ║
║    ▼                                                             ║
║  [10] API Route responde al Panel                                ║
║    │  { success: true, data: { url: resultUrl }, cost: 0.01 }   ║
║    │                                                             ║
║    ▼                                                             ║
║  [11] Panel llama onProcess(resultUrl, beforeImage, 0.01)        ║
║    │  → Editor convierte URL remota a blob URL local             ║
║    │  → Muestra comparacion antes/despues                        ║
║    │  → Actualiza costo de sesion ($0.01)                        ║
║    │                                                             ║
║    ▼                                                             ║
║  [12] Usuario decide:                                            ║
║      ├── "Aceptar y Seguir" → resultado se vuelve input          ║
║      │   para el siguiente modulo (encadenar)                    ║
║      ├── "Exportar" → descarga PNG/JPG/WebP                     ║
║      └── "Descartar" → vuelve a la foto original                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 4. LOS 3 PATRONES MAS IMPORTANTES

### Patron 1: Panel → API → Servicio de IA

Todos los 18 modulos siguen el MISMO patron:

```
┌─────────────────┐     POST /api/[modulo]     ┌─────────────────┐
│   Panel (UI)    │ ──────────────────────────► │   API Route     │
│   Component     │                             │   (Backend)     │
│                 │ ◄────────────────────────── │                 │
│ BgRemovePanel   │     { success, data, cost } │ bg-remove/      │
│ EnhancePanel    │                             │ route.ts        │
│ TryOnPanel      │                             │                 │
└─────────────────┘                             └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Servicio de IA │
                                                │                 │
                                                │ replicate.ts    │
                                                │ (imagenes)      │
                                                │                 │
                                                │ fal.ts          │
                                                │ (videos)        │
                                                └─────────────────┘
```

### Patron 2: Respuesta de API (siempre igual)

```typescript
// EXITO:
{
  success: true,
  data: { url: "https://...", provider: "replicate" },
  cost: 0.01    // en DOLARES (0.01 = un centavo)
}

// ERROR:
{
  success: false,
  error: "Mensaje describiendo el problema"
}
// HTTP 400 = datos invalidos
// HTTP 500 = error del servidor
// HTTP 503 = servicio no disponible
```

### Patron 3: Props de Panel (siempre igual)

```typescript
// TODOS los paneles de modulos reciben esto:
interface PanelProps {
  imageFile: File | null;        // La foto que subio el usuario
  onProcess: (                   // Callback cuando termina
    resultUrl: string,           // URL del resultado
    beforeImage?: string,        // URL de la imagen original (para comparacion)
    cost?: number                // Costo en dolares
  ) => void;
}
```

---

## 5. FLUJO DEL AGENTE IA (Automatizacion)

El Agente IA es el modulo mas complejo. Automatiza todo:

```
╔══════════════════════════════════════════════════════════════╗
║                    FLUJO DEL AGENTE IA                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [FASE 1: INPUT]                                             ║
║  ┌──────────────────────────────────────┐                    ║
║  │ Usuario elige:                        │                    ║
║  │  • Tipo: E-Commerce / Modelo / Social │                    ║
║  │  • Sube foto del producto             │                    ║
║  │  • Categoria (lenceria, joyeria...)   │                    ║
║  │  • Presupuesto (gratis/economico/pro) │                    ║
║  └──────────────────┬───────────────────┘                    ║
║                     │                                        ║
║  [FASE 2: ANALISIS]                                          ║
║  ┌──────────────────▼───────────────────┐                    ║
║  │ POST /api/analyze-image               │                    ║
║  │                                        │                    ║
║  │ Detecta automaticamente:               │                    ║
║  │  • Tiene marca de agua? ⚠️             │                    ║
║  │  • Iluminacion buena o mala?          │                    ║
║  │  • Resolucion suficiente?             │                    ║
║  │  • Tipo de fondo (transparente/color) │                    ║
║  │  • Formato y dimensiones              │                    ║
║  └──────────────────┬───────────────────┘                    ║
║                     │                                        ║
║  [FASE 3: PLANIFICACION]                                     ║
║  ┌──────────────────▼───────────────────┐                    ║
║  │ POST /api/ai-agent/plan               │                    ║
║  │                                        │                    ║
║  │ Claude IA decide los pasos:            │                    ║
║  │                                        │                    ║
║  │ Ejemplo para E-Commerce:               │                    ║
║  │  1. inpaint (quitar marca de agua)     │  ← Solo si tiene  ║
║  │  2. bg-remove (quitar fondo)           │                    ║
║  │  3. enhance (mejorar calidad)          │  ← Solo si needed  ║
║  │  4. bg-generate (fondo profesional)    │                    ║
║  │  5. shadows (sombras de estudio)       │                    ║
║  │                                        │                    ║
║  │ Ejemplo para Modelo:                   │                    ║
║  │  1. bg-remove (quitar fondo prenda)    │                    ║
║  │  2. model-create (generar modelo IA)   │  ← En paralelo    ║
║  │  3. tryon (vestir modelo con prenda)   │                    ║
║  └──────────────────┬───────────────────┘                    ║
║                     │                                        ║
║  [FASE 4: EJECUCION]                                         ║
║  ┌──────────────────▼───────────────────┐                    ║
║  │ useAgentPipeline.ts ejecuta cada paso │                    ║
║  │                                        │                    ║
║  │ Paso 1: POST /api/inpaint             │  ✅ $0.05          ║
║  │    resultado → input del paso 2        │                    ║
║  │                                        │                    ║
║  │ Paso 2: POST /api/bg-remove           │  ✅ $0.01          ║
║  │    resultado → input del paso 3        │                    ║
║  │                                        │                    ║
║  │ Paso 3: POST /api/bg-generate         │  ✅ $0.05          ║
║  │    resultado → input del paso 4        │                    ║
║  │                                        │                    ║
║  │ Paso 4: POST /api/shadows             │  ✅ Gratis         ║
║  │    resultado → FINAL                   │                    ║
║  └──────────────────┬───────────────────┘                    ║
║                     │                                        ║
║  [FASE 5: RESULTADOS]                                        ║
║  ┌──────────────────▼───────────────────┐                    ║
║  │ Muestra resultado final               │                    ║
║  │  • Preview de cada paso               │                    ║
║  │  • Costo total: $0.11                 │                    ║
║  │  • Boton descargar                    │                    ║
║  │  • Boton "Usar en Editor"             │                    ║
║  └──────────────────────────────────────┘                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 6. COMO PROBAR QUE FUNCIONA (Testing Manual)

### Test Basico: Verificar que la app corre

```bash
cd unistudio
npm run dev
# Abrir http://localhost:3000
```

**Checklist:**
- [ ] Dashboard carga sin errores en consola
- [ ] Las 18 tarjetas de modulos se muestran
- [ ] Videos se reproducen al pasar el mouse
- [ ] Navegacion a todas las paginas funciona

### Test del Editor (sin API keys)

1. Ir a `/editor`
2. Subir cualquier foto (drag & drop)
3. Verificar:
   - [ ] La foto aparece en el canvas central
   - [ ] Los modulos aparecen en la barra lateral izquierda
   - [ ] Puedes cambiar de modulo sin errores
   - [ ] Zoom in/out funciona
   - [ ] Undo/Redo no crashea

### Test de Modulos Gratis (sin API keys)

| Modulo | Como Probar | Que Debe Pasar |
|--------|-------------|----------------|
| **Enhance** | Subir foto → Seleccionar preset → "Aplicar" | Foto se ajusta (brillo, contraste, etc.) |
| **Smart Editor** | Subir foto → Usar herramientas de texto/crop | Edicion funciona en el canvas |
| **Compliance** | Subir foto → Seleccionar marketplace | Muestra si cumple requisitos |
| **Brand Kit** | Ir a `/brand-kit` → Agregar colores | Colores se guardan |
| **BG Remove (Browser)** | Subir foto → Provider "Browser" → Procesar | Fondo se quita localmente |

### Test de Modulos Pagados (con API keys)

**Requisito**: Necesitas al menos `REPLICATE_API_TOKEN` en `.env.local`

```env
# .env.local
REPLICATE_API_TOKEN=r8_tu_token_aqui
FAL_KEY=tu_fal_key_aqui
ANTHROPIC_API_KEY=sk-ant-tu_key_aqui     # Opcional, para agente IA
DATABASE_URL=postgresql://...             # PostgreSQL
```

| Modulo | Costo Aprox | Como Probar |
|--------|-------------|-------------|
| BG Remove (Replicate) | $0.01 | Subir foto → Provider "Replicate" → Procesar |
| BG Generate | $0.03-$0.05 | Foto sin fondo → Elegir estilo → Generar |
| Inpaint | $0.03-$0.05 | Subir foto → Describir que borrar → Procesar |
| Upscale | $0.02-$0.05 | Subir foto → Elegir escala 2x/4x → Procesar |
| Try-On | $0.02-$0.05 | Subir prenda + modelo → Procesar |
| Model Create | $0.055 | Configurar modelo → Generar (no necesita foto) |
| Video | $0.04-$0.35 | Foto procesada → Elegir provider → Generar |

### Test del Agente IA

**Requisito**: `ANTHROPIC_API_KEY` para planificacion inteligente (sin ella, usa templates basicos)

1. Ir a `/agent` o seleccionar "Agente IA" en el editor
2. Elegir tipo: "E-Commerce"
3. Subir foto de producto
4. Seleccionar categoria y presupuesto
5. Click "Crear Plan"
6. Verificar:
   - [ ] Plan muestra pasos logicos
   - [ ] Si la foto tiene marca de agua, incluye paso de inpaint
   - [ ] Costos individuales y total son razonables
7. Confirmar ejecucion
8. Verificar:
   - [ ] Cada paso muestra progreso
   - [ ] Resultado de cada paso es visible
   - [ ] Resultado final se puede descargar

### Test del Health Check

```bash
curl http://localhost:3000/api/health | json_pp
```

Debe responder:
```json
{
  "status": "healthy",
  "database": "connected",
  "backends": {
    "replicate": "connected",
    "fal": "connected"
  },
  "env": {
    "REPLICATE_API_TOKEN": "ok",
    "FAL_KEY": "ok"
  }
}
```

---

## 7. COSTOS — Cuanto Cuesta Cada Operacion

```
╔═══════════════════════════════════════════════════════════════╗
║                    MAPA DE COSTOS                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  GRATIS ($0):                                                 ║
║  ├── Enhance (mejora local con Sharp)                         ║
║  ├── Smart Editor (edicion en el navegador)                   ║
║  ├── Compliance (verificacion de marketplace)                 ║
║  ├── Brand Kit (guardar colores/fuentes)                      ║
║  ├── BG Remove - Browser (WASM local)                         ║
║  ├── Shadows - Drop/Contact/Reflection (Sharp local)          ║
║  └── Video - Ken Burns (animacion CSS)                        ║
║                                                               ║
║  ECONOMICO ($0.01 - $0.05):                                   ║
║  ├── BG Remove - Replicate .............. $0.01               ║
║  ├── Upscale - Real-ESRGAN .............. $0.02               ║
║  ├── Upscale - Aura SR .................. $0.03               ║
║  ├── BG Generate - Fast ................. $0.003              ║
║  ├── BG Generate - Creative ............. $0.03               ║
║  ├── Inpaint - Flux Fill Dev ............ $0.03               ║
║  ├── Shadows - AI Relighting ............ $0.04-$0.05         ║
║  ├── Video - LTX Video .................. $0.04               ║
║  ├── Video - Wan 2.2 Fast ............... $0.05               ║
║  ├── Outpaint ............................. $0.05               ║
║  ├── BG Generate - Precise .............. $0.05               ║
║  ├── Inpaint - Kontext Pro .............. $0.05               ║
║  ├── Upscale - Clarity .................. $0.05               ║
║  ├── Model Create ....................... $0.055              ║
║  └── Ghost Mannequin .................... $0.05-$0.08         ║
║                                                               ║
║  PREMIUM ($0.05+):                                            ║
║  ├── Try-On - IDM VTON .................. $0.015              ║
║  ├── Try-On - Kolors .................... $0.02               ║
║  ├── Try-On - FASHN ..................... $0.05               ║
║  ├── Video - Wan 2.5 .................... $0.10               ║
║  ├── Video - Kling 2.6 .................. $0.15               ║
║  ├── Video - Minimax Hailuo ............. $0.15               ║
║  └── Ad Creator ......................... $0.04-$0.35         ║
║                                                               ║
║  FLUJO TIPICO E-COMMERCE:                                     ║
║  BG Remove ($0.01) + BG Generate ($0.05) + Shadows ($0)       ║
║  = $0.06 por foto                                             ║
║                                                               ║
║  FLUJO TIPICO MODELO:                                         ║
║  BG Remove ($0.01) + Model Create ($0.055) + Try-On ($0.02)   ║
║  = $0.085 por foto                                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 8. COMO LEER EL CODIGO — Guia para Principiantes

### Paso 1: Empieza por las PAGINAS

Las paginas estan en `src/app/`. Cada carpeta = una URL:

| Carpeta | URL | Que Ver |
|---------|-----|---------|
| `src/app/page.tsx` | `/` | Como se arma el dashboard |
| `src/app/editor/page.tsx` | `/editor` | **EL MAS IMPORTANTE** — como funciona todo |
| `src/app/agent/page.tsx` | `/agent` | Como funciona la automatizacion |

### Paso 2: Sigue un modulo de principio a fin

Ejemplo completo para **BG Remove**:

```
1. src/components/modules/BgRemovePanel.tsx
   → El usuario ve este panel
   → Tiene botones, selectores, y el boton "Procesar"
   → Cuando hace click, llama a fetch("/api/bg-remove")

2. src/app/api/bg-remove/route.ts
   → Recibe la peticion HTTP
   → Valida los datos
   → Llama a la funcion de procesamiento

3. src/lib/processing/bg-remove.ts
   → Logica real de como quitar el fondo
   → Puede usar Replicate, withoutBG Docker, o browser

4. src/lib/api/replicate.ts
   → Si usa Replicate, este archivo se comunica con la API
   → Envia la imagen, espera el resultado

5. src/lib/db/persist.ts
   → Guarda el resultado en la base de datos
   → "Fire and forget" — nunca bloquea la UI
```

### Paso 3: Entiende el Estado (Stores)

Los stores son como "variables globales" que todos los componentes pueden leer:

```
editor-store.ts    → Capas, zoom, undo/redo del canvas
gallery-store.ts   → Lista de imagenes procesadas
settings-store.ts  → API keys, costos acumulados, tema
batch-store.ts     → Estado del procesamiento masivo
video-store.ts     → Estado del video studio
brand-store.ts     → Colores y fuentes de la marca
```

---

## 9. DECISIONES DE MEJORA — Que Puedes Hacer

### Nivel Facil (no requiere API keys)
- [ ] Agregar mas presets de color en BG Remove
- [ ] Agregar mas presets de enhance (filtros)
- [ ] Mejorar textos/descripciones en el dashboard
- [ ] Agregar mas formatos de marketplace en Compliance
- [ ] Personalizar el tema de colores (CSS variables en `globals.css`)

### Nivel Medio (requiere entender el flujo)
- [ ] Agregar un nuevo proveedor de video
- [ ] Crear presets de outpaint para nuevas plataformas
- [ ] Mejorar el sistema de galeria (filtros, busqueda)
- [ ] Agregar notificaciones por email cuando termina un batch

### Nivel Avanzado (requiere entender la arquitectura)
- [ ] Agregar autenticacion de usuarios (NextAuth)
- [ ] Implementar rate limiting por usuario
- [ ] Agregar webhook para notificar cuando termina un job
- [ ] Crear un modulo completamente nuevo

### Para Agregar un Modulo Nuevo:

```
1. Crear el panel: src/components/modules/NuevoPanel.tsx
   → Copiar estructura de BgRemovePanel como template

2. Crear la API: src/app/api/nuevo-modulo/route.ts
   → Copiar estructura de bg-remove/route.ts

3. Crear la logica: src/lib/processing/nuevo-modulo.ts
   → Implementar la funcion que procesa

4. Registrar en el editor: src/app/editor/page.tsx
   → Agregar a MODULE_PANELS

5. Registrar en sidebar: src/components/editor/ModuleSidebar.tsx
   → Agregar a MODULE_CATEGORIES

6. Registrar en dashboard: src/app/page.tsx
   → Agregar tarjeta al array MODULES
```

---

## 10. SERVICIOS EXTERNOS — De Donde Viene la IA

```
╔═══════════════════════════════════════════════════════════════╗
║                    SERVICIOS EXTERNOS                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  REPLICATE (replicate.com)                                    ║
║  ├── Que es: Marketplace de modelos de IA                     ║
║  ├── Pago: Por uso (pay-per-prediction)                       ║
║  ├── Se usa para: BG remove, upscale, inpaint, try-on,       ║
║  │   model create, ghost mannequin, shadows, video (Wan)      ║
║  ├── Archivo: src/lib/api/replicate.ts                        ║
║  └── Env var: REPLICATE_API_TOKEN                             ║
║                                                               ║
║  FAL.AI (fal.ai)                                              ║
║  ├── Que es: Plataforma de IA generativa                      ║
║  ├── Pago: Por uso                                            ║
║  ├── Se usa para: Video (LTX, Wan 2.5, Kling, Minimax)       ║
║  ├── Archivo: src/lib/api/fal.ts                              ║
║  └── Env var: FAL_KEY                                         ║
║                                                               ║
║  ANTHROPIC (anthropic.com)                                    ║
║  ├── Que es: Creadores de Claude IA                           ║
║  ├── Pago: Por tokens ($0.001 por plan)                       ║
║  ├── Se usa para: Planificacion del agente IA,                ║
║  │   analisis de imagen (vision)                              ║
║  └── Env var: ANTHROPIC_API_KEY                               ║
║                                                               ║
║  FASHN (fashn.ai) — OPCIONAL                                  ║
║  ├── Que es: Try-on especializado                             ║
║  ├── Se usa para: Try-on premium                              ║
║  └── Env var: FASHN_API_KEY                                   ║
║                                                               ║
║  POSTGRESQL (base de datos)                                   ║
║  ├── Que es: Base de datos relacional                         ║
║  ├── Se usa para: Guardar historial de procesamiento          ║
║  ├── ORM: Prisma (prisma/schema.prisma)                       ║
║  └── Env var: DATABASE_URL                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 11. GLOSARIO — Terminos que Encontraras en el Codigo

| Termino | Que Significa |
|---------|---------------|
| **Blob URL** | `blob:http://localhost:3000/abc...` — URL temporal que apunta a un archivo en memoria del navegador |
| **Data URL** | `data:image/png;base64,iVBOR...` — Imagen codificada como texto (mas pesada pero portable) |
| **Provider** | El servicio que hace el trabajo (Replicate, fal.ai, browser, withoutBG) |
| **Preset** | Configuracion predefinida (ej: "E-Commerce" = brillo +10, contraste +5) |
| **Pipeline** | Secuencia de pasos automaticos (ej: bg-remove → enhance → shadows) |
| **Zustand Store** | Estado global que persiste entre componentes (como useState pero global) |
| **API Route** | Endpoint del backend en Next.js (`/api/bg-remove` es un POST) |
| **Sharp** | Libreria de Node.js para manipular imagenes (gratis, local) |
| **Kontext Pro** | Modelo de IA "Flux Kontext Pro" — el mas usado ($0.05/imagen) |
| **Fire-and-forget** | Llamar una funcion sin esperar el resultado (ej: guardar en DB) |
| **SSR** | Server-Side Rendering — el servidor genera el HTML (Next.js lo hace automatico) |
| **Webhook** | URL que un servicio llama cuando termina un trabajo |
| **WASM** | WebAssembly — codigo compilado que corre en el navegador (usado en bg-remove browser) |

---

> **Tip**: Si te pierdes, empieza siempre por `src/app/editor/page.tsx`. Es el corazon del proyecto.
> Todo fluye desde ahi: sube foto → elige modulo → procesa → resultado.
