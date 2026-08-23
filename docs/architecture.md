# Arquitectura de UniStudio

> **Tipo Diátaxis:** *Explanation*. Explica **cómo está construido el sistema y por qué**.
> Para la lista exacta de endpoints, ver [`reference/api-routes.md`](reference/api-routes.md).
> Para el razonamiento detrás de cada decisión, ver [`decisions/`](decisions/).
> Para el método con que se investigaron, ver [`process/README.md`](process/README.md).
>
> **Estructura:** subset de [arc42](https://arc42.org/) con las vistas del [modelo C4](https://c4model.com/) en la sección 5.
> **Verificado contra el código el:** 2026-08-23.

---

## 1. Introducción y objetivos

UniStudio convierte fotos crudas de producto en imágenes y videos de catálogo profesionales, de forma automática. Sustituye cinco herramientas SaaS que costaban más de **$200/mes** por una plataforma propia cuyo gasto real son las llamadas a APIs de IA: **~$0.15 por producto en fotos, ~$0.55 con los dos videos** (medido end-to-end el 2026-08-08 sobre el bra `011473`).

### Objetivos de calidad, por prioridad

El orden importa: cuando dos objetivos chocan, gana el de arriba.

| # | Objetivo | Escenario que lo concreta |
|---|---|---|
| **1** | **Fidelidad del producto** | Si la foto final muestra un bra distinto al que el cliente recibe, el sistema ha fallado — por bonita que quede la imagen. |
| **2** | **Coste por imagen** | El coste por producto tiene que quedar muy por debajo del SaaS al que sustituye. |
| **3** | **Robustez ante fallos de terceros** | Un proveedor caído degrada un paso, no tumba el pipeline. |
| **4** | **Mantenibilidad por una persona** | Cualquier cambio tiene que ser abordable por una desarrolladora sin equipo de apoyo. |
| **5** | Rendimiento | Importa, pero está dominado por la latencia de terceros (30 s a 4 min por paso). |

> El objetivo 1 es el que ordena la arquitectura entera. De él sale [ADR-0004](decisions/0004-segmentacion-sobre-generacion.md), que es la decisión estructural del proyecto.

### Stakeholders

| Quién | Qué espera del sistema |
|---|---|
| **Unistyles** (Curazao) — usuaria y negocio | 486 productos fotografiados con calidad de catálogo, sin sesión de estudio |
| **Paula Salazar** — desarrolladora única | Poder cambiar un proveedor sin romper tres pipelines |
| **Proveedores de IA** (8 externos) | — (son dependencias, no clientes) |

---

## 2. Restricciones

Estas no se negocian: son el marco dentro del cual se toma cualquier decisión.

| Restricción | Consecuencia arquitectónica |
|---|---|
| **Una sola desarrolladora** | Sin microservicios, sin GitFlow, sin ceremonias de equipo → [ADR-0001](decisions/0001-monolito-modular.md) |
| **Un solo usuario, sin autenticación** | No hay multi-tenancy, ni sesiones, ni control de acceso. Es un diseño deliberado, no una omisión |
| **Presupuesto de infra ≈ $0** | Vercel + APIs de pago por uso. El dinero va a la IA, no al servidor |
| **El trabajo pesado lo hacen terceros** | La arquitectura es de **orquestación**, no de cómputo. Optimizar nuestro CPU no mueve la aguja |
| **Fotos de origen de baja resolución** (muchas a 204 px) | Techo real de calidad HD. Condiciona la elección de upscaler |
| **Contenido íntimo (lencería)** | Restringe el conjunto de proveedores utilizables a los que no filtran por moderación |
| **`DATABASE_URL` puede no existir** | Toda llamada a Prisma va con null-guard → [ADR-0002](decisions/0002-base-de-datos-opcional.md) |
| **Timeout de Vercel** | Toda ruta lenta declara su `maxDuration` en `vercel.json` o muere |

---

## 3. Contexto — C4 Nivel 1

Qué hay dentro del sistema y qué queda fuera.

```
                            ┌───────────────────────┐
                            │       Unistyles       │
                            │  (usuaria — Curazao)  │
                            └───────────┬───────────┘
                                        │ sube fotos, elige pipeline,
                                        │ descarga resultados
                                        v
    ┌───────────────────────────────────────────────────────────────────┐
    │                          UniStudio                                │
    │        Next.js 16 · App Router · desplegado en Vercel              │
    │                                                                   │
    │   3 pipelines · 18 módulos · 51 rutas API · 12 páginas            │
    └───┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┘
        │          │          │          │          │          │
        v          v          v          v          v          v
   ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
   │ fal.ai │ │Replicate│ │Photoroom││ Uwear  │ │Anthropic│ │  Vercel  │
   │        │ │         │ │        │ │  .ai   │ │        │ │Blob + PG │
   ├────────┤ ├─────────┤ ├────────┤ ├────────┤ ├────────┤ ├──────────┤
   │SeedDream│ │  Flux   │ │ Ghost  │ │Try-on  │ │ Vision │ │Imágenes  │
   │Kolors   │ │ rembg   │ │mannequin││íntimos │ │ Haiku  │ │durables  │
   │Leffa    │ │Grounded │ │Recorte+│ │flat-lay│ │        │ │Historial │
   │FASHN    │ │  SAM    │ │fondo+  │ │avatares│ │        │ │(opcional)│
   │wan/Kling│ │ESRGAN   │ │sombra  │ │        │ │        │ │          │
   │BiRefNet │ │Clarity  │ │        │ │        │ │        │ │          │
   │+ STORAGE│ │         │ │        │ │        │ │        │ │          │
   └────────┘ └─────────┘ └────────┘ └────────┘ └────────┘ └──────────┘
```

> **Riesgo de concentración — el más importante del sistema.**
> **fal.ai no es solo un proveedor de modelos: es también el storage de todas las imágenes intermedias.** Si la cuenta se queda sin saldo, **todos** los pasos salen en rojo a la vez y parece un bug de código. No lo es. Se recarga en `fal.ai/dashboard/billing`.

---

## 4. Estrategia de solución

Las cinco decisiones que explican casi todo lo demás:

| Estrategia | Decisión | ADR |
|---|---|---|
| **Segmentación antes que generación** | Recortar píxeles reales del producto siempre que se pueda; generar solo como último recurso | [0004](decisions/0004-segmentacion-sobre-generacion.md) |
| **Determinista antes que IA** | Si el resultado se puede calcular (Sharp, ffmpeg), se calcula. $0 y reproducible | [0011](decisions/0011-determinista-antes-que-ia.md) |
| **Tres pipelines por física de la toma** | No por categoría comercial. 486 productos cubiertos, prohibido un cuarto | [0003](decisions/0003-tres-pipelines-canonicos.md) |
| **Monolito modular** | Límites internos, no de red. Un deploy | [0001](decisions/0001-monolito-modular.md) |
| **Degradación elegante en todo** | Sin base de datos funciona; sin un proveedor, cae al siguiente; `softFail` no frena el pipeline | [0002](decisions/0002-base-de-datos-opcional.md) |

---

## 5. Vista de bloques

### 5.1 Contenedores — C4 Nivel 2

```
┌──────────────────────────── VERCEL ────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CLIENTE — React 19 Server + Client Components            │  │
│  │  12 páginas · 20 paneles de módulo · 7 stores Zustand     │  │
│  │  ── Aquí se ORQUESTAN los 3 pipelines (ver §5.3) ──       │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │ fetch                          │
│  ┌────────────────────────────v─────────────────────────────┐  │
│  │  RUTAS API — 51 route.ts (App Router)                     │  │
│  │  Validación en el borde · maxDuration por ruta            │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                │
│  ┌────────────────────────────v─────────────────────────────┐  │
│  │  LÓGICA DE NEGOCIO — src/lib/processing/  (16 módulos)    │  │
│  │  + src/lib/pipelines/ (joyería, estáticos, folder-routing)│  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                │
│  ┌────────────────────────────v─────────────────────────────┐  │
│  │  ADAPTERS DE PROVEEDOR — src/lib/api/  (8 clientes)       │  │
│  │  ÚNICA capa que lee API keys. Todas hacen .trim()         │  │
│  └────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────┼────────────────────────────────┘
                                v
                    APIs externas de IA + Blob + PostgreSQL
```

**La capa de adapters es el único punto que lee credenciales.** Los ocho clientes (`fal`, `replicate`, `photoroom`, `uwear`, `fashn`, `withoutbg`, `blob`, más `route-helpers`) hacen `.trim()` sobre la key: `vercel env pull` deja un `\n` al final que provocaba 401 silenciosos. **Ese `.trim()` no se quita nunca.**

### 5.2 Componentes — C4 Nivel 3

| Bloque | Ubicación | Responsabilidad |
|---|---|---|
| **Paneles de módulo** | `src/components/modules/` (20) | UI de un módulo. Sin lógica de proveedor |
| **Hooks** | `src/hooks/` (5) | Estado y ciclo de vida. `useAgentPipeline.ts` es el motor del agente |
| **Stores** | `src/stores/` (7, 3 persistidos) | Estado global con Zustand |
| **i18n** | `src/lib/i18n/` | Catálogo tipado ES/EN + `useI18n`. 13 componentes lo consumen |
| **Processing** | `src/lib/processing/` (16) | Lógica de negocio y validación por módulo |
| **Pipelines** | `src/lib/pipelines/` (4) | Lógica compartida de joyería y estáticos + enrutado por carpeta |
| **Adapters** | `src/lib/api/` (8) | Clientes de proveedor. Única lectura de env |
| **Persistencia** | `src/lib/db/` (3) | Prisma con null-guard |

### 5.3 Dónde viven realmente los pipelines — discrepancia documentada

> **Corrección de la documentación previa.** `CLAUDE.md` y `docs/pipelines/README.md` documentan rutas `/api/pipelines/lingerie`, `/api/pipelines/static-product` y `/api/pipelines/jewelry`.
> **Esas rutas no existen.** Verificado el 2026-08-23: `src/app/api/pipelines/` no está en el repositorio.

Lo que hay en realidad:

| Pipeline | Orquestación | Lógica compartida |
|---|---|---|
| Lencería | `src/app/pipelines/lingerie/page.tsx` — **6.210 líneas** | ninguna extraída |
| Estáticos | `src/app/pipelines/static-product/page.tsx` — 2.486 líneas | `src/lib/pipelines/static-product.ts` |
| Joyería | `src/app/pipelines/jewelry/page.tsx` — 2.256 líneas | `src/lib/pipelines/jewelry.ts` |

Los tres pipelines se orquestan **en el cliente**: la página encadena `fetch` a las rutas de módulo (`/api/tryon`, `/api/bg-remove`, `/api/outpaint`…) y mantiene el estado entre pasos.

**Consecuencias reales de este diseño:**

- La regla de [ADR-0003](decisions/0003-tres-pipelines-canonicos.md) *"un pipeline orquesta módulos, nunca llama al proveedor"* **sí se cumple** — la orquestación es cliente-side, pero pasa por los módulos.
- **El usuario tiene que dejar la pestaña abierta.** No hay ejecución en servidor: si cierra el navegador a mitad, pierde el progreso.
- `lingerie/page.tsx` con **6.210 líneas** es la mayor deuda técnica del proyecto (§11).

---

## 6. Vista de runtime

### 6.1 Petición de un módulo

```
Panel  →  hook  →  fetch /api/<módulo>  →  route.ts (valida)
   →  lib/processing/<módulo>.ts (negocio)
   →  lib/api/<proveedor>.ts (adapter)
   →  API externa
   →  respuesta  →  guardado opcional en Blob + DB  →  store Zustand
```

### 6.2 Patrones de invocación a proveedor

Los tres modos que hay que conocer:

```typescript
// Replicate — síncrono
const output = await runModel('owner/model', { ...params });
const url = extractOutputUrl(output);

// fal.ai — por cola
const requestId = await submitFal('fal-ai/model', { ...params });
const result = await pollFal(requestId);

// FASHN — submit / poll
const id = await runFashn({ ...params });
const result = await pollFashn(id);
```

**Nomenclatura de Replicate — causa recurrente de 404:**

```
Modelos oficiales:    owner/name              (ej. wan-video/wan-2.2-i2v-fast)
Modelos community:    owner/name:sha256hash   (el hash es OBLIGATORIO)
```

### 6.3 Pipeline del agente de IA (módulo 18)

`src/hooks/useAgentPipeline.ts` es el motor de ejecución.

```
1. UPLOAD          2. ANÁLISIS         3. PLANIFICACIÓN    4. EDICIÓN       5. EJECUCIÓN
┌─────────────┐   ┌──────────────┐   ┌───────────────┐   ┌────────────┐   ┌─────────────┐
│ Sube imagen │──>│/api/analyze- │──>│/api/ai-agent/ │──>│ Añadir /   │──>│ Pasos       │
│ Elige agente│   │image         │   │plan           │   │ quitar /   │   │ paralelos + │
│ Fija budget │   │Sharp + Vision│   │ Claude Haiku  │   │ reordenar  │   │ secuenciales│
└─────────────┘   └──────────────┘   └───────────────┘   └────────────┘   └──────┬──────┘
                                                                                  v
                                                                          6. VALIDACIÓN
                                                                          + RESULTADOS
```

`StepContext` es lo que se pasa entre pasos: `currentUrl` (última imagen), `garmentUrl` (preservada desde bg-remove para el try-on) y `modelUrl` (creada por model-create).

Los pasos independientes — bg-remove y model-create, por ejemplo — corren **en paralelo**.

---

## 7. Vista de despliegue

| Aspecto | Cómo |
|---|---|
| **Hosting** | Vercel. `main` despliega automáticamente a <https://unistudio.vercel.app> |
| **Estrategia de ramas** | Trunk-Based: todo a `main` |
| **Base de datos** | PostgreSQL vía Prisma 7. **Opcional** |
| **Almacenamiento** | Vercel Blob para binarios. La DB guarda URLs, nunca bytes ([ADR-0010](decisions/0010-vercel-blob-almacenamiento.md)) |
| **Timeouts** | Por ruta en `vercel.json`. `video`, `avatar`, `model-create`, `bg-generate` → 300 s; `upscale`, `face-swap` → 120 s; `analyze-product`, `identity-check`, `product-features` → 60 s |
| **Salud** | `GET /api/health` reporta qué proveedores responden |
| **Feature flags** | `LINGERIE_FLATTEN=0`, `DEBUG_KOLORS=1` — revierten en producción sin redeploy |
| **Límite de subida** | El `.vercelignore` de la raíz mantiene el paquete bajo el límite de 10 MB. Los deploys corren **desde la raíz** |

---

## 8. Conceptos transversales

### Gestión de errores
Error boundary global en `src/app/error.tsx` + `global-error.tsx`. Los 13 paneles de módulo emiten toasts vía `use-toast.ts` (Zustand).

### Estado
Siete stores Zustand; tres persisten a `localStorage`, con dos protecciones que **no se deben revertir**:
- `brand-store` usa `partialize` para excluir base64 de lo persistido (cuota de `localStorage`).
- `video-store` envuelve las escrituras para tragarse `QuotaExceededError`.
- `gallery-store.addImage` es **síncrono**; la generación de miniatura es asíncrona. Ese orden evita una race condition ya corregida.

### Fugas de memoria
Las URLs de blob se revocan en los efectos de limpieza. `useAgentPipeline`, `UpscalePanel` y `EnhancePanel` ya lo hacen — cualquier código nuevo sigue ese patrón.

### Internacionalización
Catálogo tipado ES/EN en `src/lib/i18n/` consumido por `useI18n`. **Todo texto visible va en español**; los comentarios de código, en inglés.

### Control de coste
`src/lib/utils/cost-tracker.ts` acumula el gasto por operación. El agente valida presupuesto antes de ejecutar pasos de pago, con tres niveles: Gratis ($0), Económico (<$0.20) y Premium.

### Módulos server-only
`tts.ts` usa `node-edge-tts` (WebSocket y APIs de Node): **solo se importa en código de servidor**. Para el cliente existe `tts-voices.ts` con las constantes de voz.

### Identificadores de modelo
Los IDs de Claude viven centralizados en `src/lib/utils/constants.ts` (`CLAUDE_HAIKU`, `CLAUDE_SONNET`). Nunca se escriben a mano en una ruta.

---

## 9. Decisiones de arquitectura

Las once decisiones vigentes están en [`docs/decisions/`](decisions/), en formato MADR. Las cinco de mayor impacto:

- [ADR-0004](decisions/0004-segmentacion-sobre-generacion.md) — Segmentación por encima de generación. **La decisión estructural del proyecto.**
- [ADR-0003](decisions/0003-tres-pipelines-canonicos.md) — Tres pipelines, prohibido el cuarto.
- [ADR-0001](decisions/0001-monolito-modular.md) — Monolito modular, no microservicios.
- [ADR-0009](decisions/0009-claude-vision-anclaje-fidelidad.md) — Claude Vision como anclaje de fidelidad.
- [ADR-0010](decisions/0010-vercel-blob-almacenamiento.md) — Vercel Blob; prohibido base64 en la DB.

---

## 10. Escenarios de calidad

Cómo se comprueba que los objetivos de la §1 se cumplen de verdad.

| Escenario | Respuesta esperada | Estado |
|---|---|---|
| El pipeline devuelve un producto distinto al de entrada | `/api/identity-check` lo detecta y muestra un chip ⚠ con el cambio concreto | Implementado |
| Un proveedor devuelve 500 | Cae al siguiente de la cascada; el paso se marca como degradado | Implementado, **pero avisa mal** (§11) |
| fal.ai se queda sin saldo | Todos los pasos fallan a la vez | **Sin manejo específico.** Se diagnostica a mano |
| Falta `DATABASE_URL` | La app funciona; se pierde el historial persistente | Implementado |
| El upscale de joyería falla | `softFail`: el pipeline continúa sin upscale | Implementado |
| Una ruta lenta supera el timeout | Declarada en `vercel.json` | Implementado |
| El usuario cierra la pestaña a mitad del pipeline | **Pierde el progreso** | **No mitigado** (§11) |

---

## 11. Riesgos y deuda técnica

Ordenados por impacto. Los cuatro primeros están medidos, no supuestos.

| # | Riesgo / deuda | Impacto | Evidencia |
|---|---|---|---|
| **1** | **`lingerie/page.tsx` tiene 6.210 líneas** y contiene toda la orquestación del pipeline | Cualquier cambio es de alto riesgo; imposible de testear por unidades | Medido, 2026-08-23 |
| **2** | **El Paso 1 no avisa cuando genera en vez de recortar.** Photoroom reconstruye y re-ilumina — es tan generativo como SeedDream — pero el aviso solo se dispara con `regenerated === true`, que solo se marca en el camino de SeedDream. El guardia de fidelidad corre, falla, y **solo lo loguea** | Rompe el objetivo de calidad nº 1 en silencio | `docs/providers.md` §5.1 |
| **3** | **El badge de proveedor miente en el Paso 4.** `tryon/async/route.ts:208` devuelve `provider: 'leffa'` hardcodeado aunque haya corrido FASHN | Sustitución silenciosa de proveedor — el patrón que el resto del proyecto combate | `docs/providers.md` §5.2 |
| **4** | **Errores de proveedor tragados.** Cuando Uwear falla, el `catch` solo hace `console.warn` y cae a SeedDream: nunca se ve por qué falló | Diagnóstico imposible en producción | `docs/providers.md` §5.3 |
| **5** | **Concentración en fal.ai** (modelos + storage) | Un fallo de saldo tumba el sistema entero | §3 |
| **6** | **Orquestación cliente-side**: cerrar la pestaña pierde el progreso | Pipelines de 4 min sin recuperación | §5.3 |
| **7** | **Nada borra los blobs.** El almacenamiento crece de forma monótona | Coste creciente sin techo | [ADR-0010](decisions/0010-vercel-blob-almacenamiento.md) |
| **8** | **La mancha blanca del Paso 4** sigue abierta: el arreglo correcto es recortar el cutout al bounding box de la prenda | Defecto visible en la foto de espalda | [ADR-0006](decisions/0006-leffa-descartado-vista-trasera.md) |
| **9** | Sin autenticación ni rate limiting | Aceptado por diseño (herramienta de un solo usuario) | §2 |
| **10** | Sin usability testing formal | Brecha metodológica reconocida | [`process/README.md`](process/README.md) §2.4 |

---

## 12. Glosario

| Término | Significado en este proyecto |
|---|---|
| **Pipeline** | Secuencia completa de pasos para una física de toma. Hay exactamente 3 |
| **Módulo** | Capacidad reutilizable expuesta como `/api/<módulo>`. Hay 18 |
| **Segmentación** | Recortar los píxeles **reales** del producto (BiRefNet, Grounded SAM) |
| **Warp** | Deformar la prenda real sobre un cuerpo (Leffa, FASHN). No la re-dibuja |
| **Generación** | Dibujar un producto **nuevo** (SeedDream, Kolors, Flux). Último recurso |
| **Ghost mannequin** | El producto flotando en 3D, sin cuerpo visible |
| **`model-to-ghost`** | Quitar un **humano real** dejando el producto flotando. **No** es `remove-mannequin`, que asume un maniquí real en la entrada |
| **Ficha / `garmentDescription`** | Descripción estructurada generada por Claude Vision que ancla la fidelidad ([ADR-0009](decisions/0009-claude-vision-anclaje-fidelidad.md)) |
| **`softFail`** | Un paso que, al fallar, deja continuar el pipeline en vez de abortarlo |
| **Identity check** | Comparación automática entrada/salida que detecta si el producto cambió |
