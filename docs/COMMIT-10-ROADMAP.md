# Commit 10+ Roadmap — Dashboard redesign + mobile + deferred audits

**Creado:** 2026-04-21 al final de commit 9.
**Estado actual:** `main` en `9f1b0eb`. Producción debería estar deployada.
**Regla suprema del usuario:** "mejorar no dañar" — no romper lo que funciona, mejorar la UX. Cada cambio se verifica antes de pushear.

---

## Por qué este README existe

La sesión que creó commits 1–9 llegó al 90% de contexto. La usuaria aprobó **Opción C: redesign completo del dashboard + mobile-first sweep** (5-6h estimadas) pero no hay contexto para hacerlo en la misma sesión. Este doc es la mano al próximo turno.

---

## Qué ya funciona (NO romper)

Después de commit 9 (`9f1b0eb`), la app tiene:

- **3 pipelines canónicos funcionando**: `/pipelines/lingerie`, `/pipelines/static-product`, `/pipelines/jewelry`
- **/agent** como router puro (upload opcional + grid 14 categorías → redirect)
- **/batch** con `startAutoMode` que redirige a pipelines via `cat.pipeline`
- **/api/inventory/scan** con 11 categorías, cada una con `pipeline` + `pipelineParams`
- **Sidebar** con entradas para los 3 pipelines + stubbed AiAgentPanel en `/editor?module=ai-agent`
- **Homepage** con 4 quick-action cards (agente / batch / pipeline lencería / pipeline estáticos / pipeline joyería / brand-kit)
- **gallery-store** con IndexedDB tier-2 backup (commit 9)
- **editor autoSaveResult** con retry 3× + toast (commit 9)
- **Env vars** todas con `.trim()` (commit 9)

Verificación antes de empezar commit 10:
```bash
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline -3
# Debería mostrar 9f1b0eb como HEAD
npx --prefix unistudio tsc --noEmit 2>&1 | grep -v "__tests__\|jest\|validator.ts"
# Debería estar vacío
```

---

## OPCIÓN C — Plan detallado (lo que aprobó la usuaria)

### Parte 1: Redesign del dashboard (`unistudio/src/app/page.tsx`)

**Layout actual (a reemplazar):**
- Hero con "Unistyles Curacao · AI Photo Studio"
- 4 tarjetas cuadradas de quick action
- Grid de "Todos los Módulos" con muchas cards pequeñas

**Layout propuesto:**

```
┌────────────────────────────────────────────────────────────────┐
│ HERO                                                           │
│   Unistyles Studio                                             │
│   Fotos de catálogo IA · lista para e-commerce en minutos      │
│   [Subí una foto] → detecta categoría y abre pipeline          │
│   (ESTE CTA va al /agent page con upload)                      │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ LOS 3 PIPELINES (cards grandes con preview)                    │
│   ┌──────────────┬──────────────┬──────────────┐               │
│   │ LENCERÍA     │ ESTÁTICOS    │ JOYERÍA      │               │
│   │ [preview img]│ [preview img]│ [preview img]│               │
│   │ 164 productos│ 240 productos│ 82 productos │               │
│   │ bra/panty/   │ perfumes/    │ aretes/      │               │
│   │ shapewear    │ cremas/bloq. │ cadenas/etc  │               │
│   │ $0.15/foto   │ $0.01/foto   │ $0.23/pieza  │               │
│   │ [Abrir →]    │ [Abrir →]    │ [Abrir →]    │               │
│   └──────────────┴──────────────┴──────────────┘               │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ ÚLTIMOS RESULTADOS (patrón gallery compacto)                   │
│   [thumb] [thumb] [thumb] [thumb] [thumb]          [Ver todo]  │
│   (lee de gallery-store.images.slice(0, 8))                    │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ HERRAMIENTAS (sección compacta, no grid enorme)                │
│   [Batch Masivo] [Kit de Marca] [Galería] [Editor manual]      │
│   [Workflows guide] [Architecture]                             │
└────────────────────────────────────────────────────────────────┘
```

**Archivos a tocar:**
- `unistudio/src/app/page.tsx` — reescritura completa (~200 líneas)
- Importar `useGalleryStore` para "Últimos resultados"
- Reusar los cards/componentes existentes de `/gallery` como ejemplo de estilo

**Preview images para las cards de pipelines:**
Usar imágenes reales de `frontend/public/images/`:
- Lencería: `frontend/public/images/bra/*.jpg` (una imagen de referencia)
- Estáticos: `frontend/public/images/perfumes/*.jpg`
- Joyería: `frontend/public/images/Accesorrios/CATALOGADOS/Aretes/*.jpg`

O crear 3 SVGs ilustrativos en `unistudio/public/pipeline-previews/`.

### Parte 2: Mobile-first responsive sweep

**Breakpoints Tailwind (ya configurados por default):**
- `sm:` ≥ 640px (landscape phone)
- `md:` ≥ 768px (tablet)
- `lg:` ≥ 1024px (desktop)
- `xl:` ≥ 1280px

**Páginas que necesitan auditoría mobile:**

| Archivo | Issue actual | Fix |
|---|---|---|
| `src/app/page.tsx` | Grid `md:grid-cols-2` puede no stackear bien en phone | Usar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `src/app/agent/page.tsx` | Grid de 14 categorías posiblemente mal en móvil | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` ya está OK, revisar que los textos no overflowen |
| `src/app/pipelines/lingerie/page.tsx` | Layout `lg:grid-cols-[1fr_360px]` asume desktop; en móvil el sidebar derecho debería pasar arriba o abajo | Cambiar a `grid-cols-1 lg:grid-cols-[1fr_360px]` + en mobile el sidebar va abajo con `order-2` |
| `src/app/pipelines/static-product/page.tsx` | Dos selects side-by-side (`sm:grid-cols-2`) OK | Solo verificar que job cards no overflowen |
| `src/app/pipelines/jewelry/page.tsx` | Grid `sm:grid-cols-3` en controls, OK | Verificar result cards en móvil |
| `src/app/batch/page.tsx` | Layout complejo con sidebar de inventory — crítico para móvil | Collapsible sidebar en mobile; toggle con botón |
| `src/app/editor/page.tsx` | Canvas + panels laterales — **muy desktop-focused** | Mobile: sidebar se vuelve drawer; canvas full-width; panels stackeados o como modal |
| `src/components/editor/ModuleSidebar.tsx` | Sidebar fijo izquierda 260-300px | Mobile: hamburger menu + slide-in |
| `src/app/gallery/page.tsx` | Grid adaptativo probablemente ya OK | Verificar |

**Convención a aplicar en todo:**
- Container widths: `max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4`
- Font sizes: `text-sm sm:text-base` para títulos
- Padding: `p-3 sm:p-5`
- Grids: siempre arrancar con `grid-cols-1` y escalar

**Sidebar mobile (crítico — impacta toda la experiencia del editor):**
En `ModuleSidebar.tsx`:
- Detectar `window.innerWidth < 768` o usar media query
- Mobile: `fixed` + `transform: translate-x-[-100%]` cuando cerrado
- Botón hamburger top-left para abrir (en editor header)
- Overlay oscuro cuando abierto
- Cierra al seleccionar módulo

### Parte 3: Componente reusable para pipeline preview cards

Crear `unistudio/src/components/dashboard/PipelineCard.tsx`:

```tsx
interface PipelineCardProps {
  title: string;
  subtitle: string;
  productCount: number;
  productTypes: string;
  costPerItem: string;
  previewImageUrl: string;
  href: string;
  accentColor: "violet" | "amber" | "yellow";
}
```

Mantener consistencia visual con el tema dark (#09090B + #C5A47E gold accent — del README root).

---

## Checklist "mejorar no dañar"

Antes de cada commit, verificar:

- [ ] Las 3 páginas de pipeline siguen funcionando (upload + process)
- [ ] /agent redirige correctamente a los pipelines
- [ ] /batch auto-mode redirige via `cat.pipeline`
- [ ] Sidebar sigue mostrando las 3 entries + módulos sueltos
- [ ] Imports no rotos: `grep -r "AgentChat\|getCatalogoPipeline\|getCambiarModeloPipeline" unistudio/src/` → 0 active references
- [ ] `tsc --noEmit` limpio (filtrando jest + validator.ts)
- [ ] `npm run lint` sin nuevos errores (opcional pero recomendado)
- [ ] El dashboard refactored NO remueve funcionalidad — solo reorganiza
- [ ] Mobile: probar en Chrome DevTools con viewport iPhone SE (375×667) — todo se ve decente

**NUNCA tocar:**
- `src/stores/*.ts` (a menos que sea bug fix explícito)
- `src/lib/api/{replicate,fal,fashn,withoutbg}.ts` (providers — sensibles)
- `src/lib/pipelines/*.ts` (matrices adaptativas — probadas)
- `prisma/schema.prisma` (DB schema)
- `src/app/api/*/route.ts` (a menos que sea fix del audit)

---

## Deferred audits (NO scope de commit 10, pero documentado para después)

### High priority (commit 11 candidate) — 4-6h

| # | Qué | Archivo | Por qué |
|---|---|---|---|
| H1 | Manual-mode event listener timeout | `pipelines/lingerie/page.tsx:745-759` | Memory leak si se cierra tab durante manual mode |
| H2 | Jewelry upscale hard-fail | `pipelines/jewelry/page.tsx:243-249` | Actualmente soft-fail silencioso; jewelry sin upscale se ve mal |
| H3 | Soft-fail notifications al usuario | `pipelines/static-product/page.tsx:283, 298` + jewelry modelo/video | Jobs terminan "done" con outputs faltantes sin aviso |
| H4 | Contradicción en prompt Claude Haiku | `api/ai-agent/plan/route.ts:637 vs 639` | "modelo NO use bg-remove" vs "lingerie MUST use bg-remove" |
| H5 | Timeout en `/api/analyze-image` desde /agent | `app/agent/page.tsx:234-254` | UI congelada si API cuelga |
| H6 | Inventory scan: distinguir error vs empty | `app/batch/page.tsx:244-255` | Silent fail sin distinción |

### Data-loss follow-ups (commit 11 candidate) — 2-4h

| # | Qué | Archivo |
|---|---|---|
| D1 | Cross-session AI model reuse | `api/ai-models/route.ts` GET (aceptar `?referenceNumber=X`) + `pipelines/lingerie/page.tsx` useEffect lookup + `api/model-create` save con `referenceNumber` |
| D2 | Brand Kit DB↔localStorage timestamp merge | `stores/brand-store.ts:105-142` |
| D3 | Cost tracking a DB (hoy solo localStorage) | `stores/settings-store.ts:131-144` + nueva tabla `CostHistory` |
| D4 | FAL storage retention policy docs | `api/upload/route.ts:93-99` |

### Structural (commit 12 candidate) — 6-8h

| # | Qué |
|---|---|
| S1 | Extraer garment types a `src/lib/constants/garment-types.ts` (hoy duplicados en 3 lugares: lingerie page, plan route, bg-remove route) |
| S2 | Response shape consistency (todas las rutas devolver `data.url`) |
| S3 | Delete `useAgentPipeline` hook (1081 líneas sin consumers runtime) |
| S4 | Update `docs/architecture.md`, `docs/guia-completa.md`, `docs/UX_UI_GUIDE.md` — referencias stale a código borrado |

### Competitive-analysis features (commits 13+) — 30-40h total

Priorizados por impacto × esfuerzo para Unistyles:

| # | Feature | Pipeline | Esfuerzo | Impacto económico |
|---|---|---|---|---|
| F1 | Color variant swap | Lencería | 4-6h | 💰💰💰 (multiplica catálogo 5-10x) |
| F2 | Multi-format export simultáneo (1:1 + 4:5 + 9:16 + 16:9) | Los 3 | 3-4h | Ahorro tiempo manual enorme |
| F3 | Macro close-up automático | Joyería | 2h | Conversión joyería +50% según benchmarks |
| F4 | Material-aware prompts (oro/plata/acero) | Joyería | 1h | Calidad visual |
| F5 | Multi-angle desde 1 foto (front/back/side/lifestyle) | Lencería | 6-8h | Estándar Leonisa |
| F6 | Seasonal themes (Navidad/DíaMadre/Verano) | Estáticos | 2-3h | Campañas oportunas |
| F7 | Brand Kit auto (logo/watermark en output) | Los 3 | 3h | Brand consistency |
| F8 | Template saving ("mi look Yanbal") | Los 3 | 4-6h | Rapidez recurrente |
| F9 | Text overlays con módulo `infographic` | Estáticos | 2h | Features destacadas |
| F10 | Lifestyle scenes (mano sosteniendo, flat-lay) | Estáticos | 2-3h | Engagement ads |

---

## Security + backend + UX audit findings (commits 1-9)

Ya resueltos ✓:
- 0 vulnerabilidades de seguridad encontradas
- 0 errores UX/UI funcionales (antes del redesign de commit 10)
- Env vars con `.trim()` — fixed commit 9
- autoSaveResult con retry — fixed commit 9
- gallery-store IDB fallback — fixed commit 9
- AiAgentPanel type mismatch (Vercel build) — fixed commit 9

Findings no resueltos listados arriba en "Deferred audits".

---

## Reglas del usuario (memoria persistente — honrarlas siempre)

De `~/.claude/projects/-mnt-c-Users-maria-Documents-GitHub-Image-Desgn-Studio/memory/MEMORY.md`:

1. **Always push to GitHub** — commit + push después de cada cambio
2. **No concurrent deploys** — chequear `.next/lock`, `pgrep next build`, `pgrep vercel` antes de buildear
3. **Changelog + docs stay current** — cada code change actualiza CHANGELOG.md + docs relevantes
4. **No concurrent builds** — igual que deploys
5. **Verify before claiming done** — log verificado con ls/git log/git status
6. **No duplicate pipelines** — los 3 canónicos son Lingerie/Static/Jewelry; pipeline nuevo borra duplicados en el mismo commit
7. **Modules first, pipelines compose** — los módulos son la base; fix módulos primero, pipelines reusan

Plus reglas nuevas escuchadas en esta sesión:
- **Mejorar no dañar** — cada cambio mejora UX sin romper funcionalidad existente
- **Dashboard debe usar patrones de video/foto history existentes** (referencia a `/gallery` como inspiración)
- **Mobile + web** — todo debe funcionar en los dos

---

## Comandos útiles para la próxima sesión

```bash
# Ver estado actual
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline -5

# Ver commits del pipeline rewrite
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline b27ce7a..9f1b0eb

# Typecheck (filtrar ruido de tests + stale validator)
cd /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio/unistudio && npx --no-install tsc --noEmit 2>&1 | grep -v "__tests__\|jest\|validator.ts"

# Verificar imports colgados
grep -r "AgentChat\|getCatalogoPipeline\|getCambiarModeloPipeline" unistudio/src/ 2>/dev/null

# Inventory scan categories (todas deberían tener `.pipeline` set)
grep -A1 '"id":' unistudio/src/app/api/inventory/scan/route.ts | head -40
```

---

## Mensaje a mi yo futuro

Si estás retomando esto: la base está sólida. Los 3 pipelines funcionan, el backend está limpio (0 vulns), el type check pasa. Commit 9 estabilizó todo.

Lo que viene es **visual + mobile**, NO estructural. Resistí la tentación de refactorizar: la usuaria dijo literalmente "mejorar no dañar". Si un archivo te tienta a reescribirlo, preguntate: ¿esto mejora UX? Si no, no lo toques.

Prioridad absoluta al arrancar: leer este doc entero + ejecutar los comandos de "Ver estado actual" + confirmar con la usuaria cuál de Parte 1 (dashboard) o Parte 2 (mobile) arranca primero. Si vas bien de contexto, hacer ambas. Si no, Parte 2 primero (mobile es más alto impacto para su caso — probablemente usa celular para ver resultados mientras trabaja desde Curaçao).

---

# NORTE UX — instrucción directa de la usuaria (2026-04-21, fin commit 9)

**Texto exacto:** "quiero que te enfoques en la experiencia, que en los módulos pueda ver cada paso, todo se pueda editar, optimizar, sea visual, importantísimo se vean los cambios. Necesito que todo sea interactivo. Mi user son personas que no manejan en absoluto tecnología pero quiero usar esta app para entender fácil y que se pueda ver todo los procesos visualmente. Que sea botón interactivo que explique ejemplo. Hablo por ejemplo CSS, no lo sé, como visuales. Ejemplo como si fuera un app de niños, algo así."

## Qué significa esto en la práctica

**Target user: NO técnico.** Paula vende a clientes finales (no devs). La app tiene que ser como Canva para niños — cada acción obvia, cada cambio visible al instante, cada botón se explica solo.

### 10 principios de diseño (honrar en cualquier commit futuro)

1. **Cada paso de un pipeline tiene que verse en vivo** — no más "procesando..." opaco. Muestra thumbnails de ANTES y DESPUÉS mientras corre.
2. **Botones con preview hover** — al pasar el mouse, muestra ejemplo visual de lo que hace (miniatura animada).
3. **Tooltips con ejemplo, no solo texto** — un arete sobre terciopelo negro, no "estante de terciopelo negro".
4. **Slider before/after en cada resultado** — se ve el input a la izquierda, el output a la derecha, drag para comparar.
5. **Iconos grandes + palabras en español simple** — "Quitar fondo" no "bg-remove", "Poner en modelo" no "try-on".
6. **Colores + emojis contextuales** — cada módulo con su paleta (lencería rosa/violeta, joyería dorado, perfumes beige). Iconos literales: 🩱 para lencería, 💎 para joyería, 🧴 para perfumes. (La usuaria ya removió emojis del código en un commit anterior, pero los quiere PARA UI visual — confirmar con ella si los emojis inline son OK).
7. **Progreso visible con animación** — step 2 de 6, barra de progreso llenándose, check verde cuando completa.
8. **"¿Qué va a pasar?" preview antes de ejecutar** — muestra los 6 pasos con iconos + costo de cada uno, así el usuario sabe qué va a suceder.
9. **Errors en castellano humano** — no "HTTP 500", sino "No pude conectar con la IA de fondos. ¿Querés reintentar?". Pattern: `humanizeError()` ya existe en `src/lib/utils/humanize-error.ts`, usarlo en todos los toast.
10. **Deshacer fácil** — cada paso debería tener "rehacer" o "saltar" visible. Ya existe en lingerie page pero necesita ser más prominente.

### Patrones de UI a implementar/extender

- **Step card con 3 zonas visibles**: [Input thumbnail] → [Iconito del paso + nombre en español] → [Output thumbnail con botón download + rehacer]
- **Hero CTA en cada pipeline**: "Subí tu foto de brassiere aquí" con drag-zone gigante + ícono animado de cámara, no "Arrastra archivos"
- **Progress tracker arriba**: 6 dots con icono de cada paso, el actual pulsa, los previos en verde, los futuros en gris
- **Panel de "Configurar antes de empezar"**: solo 2-3 campos visibles (tipo de producto, marca, modelo opcional), todo lo demás como "Ajustes avanzados" colapsable
- **Resultado final = pantalla grande**: grilla de todos los outputs (estante/modelo/video) con botón "Descargar todo" enorme + share buttons
- **Onboarding first-time**: la primera vez que alguien entra a un pipeline, overlay paso a paso con tooltips animados explicando cada zona de la UI

### Componentes reusables nuevos a crear (commit 10+)

Ninguno existe todavía. Candidatos (basar en shadcn/ui o crear custom):

| Componente | Dónde | Reemplaza |
|---|---|---|
| `<BeforeAfterSlider>` | Results de cada pipeline + gallery | Que no hay — usuaria pidió esto explícitamente |
| `<StepProgressBar steps={[...]} current={n}>` | Top de cada pipeline page | Los step-cards sueltos actuales |
| `<UploadHero>` | Start de cada pipeline | UploadZone actual (muy chiquita) |
| `<HoverPreviewButton>` | Sidebar + category grids | Botones actuales sin preview |
| `<CostBadge amount={0.15} tier="economic">` | Cada step definido | Texto "$0.15" suelto |
| `<ResultGrid outputs={{estante, modelo, video}}>` | Final de jewelry/lingerie pipeline | ResultCard sueltos actuales |
| `<ExplainTooltip example={<img/>}>` | Cada botón no-obvio | Los `title=` attributes actuales |

### Comportamientos interactivos esperados

- **Hover en un step futuro**: muestra tooltip "Este paso va a poner el bra en una modelo IA" con mini GIF/imagen de ejemplo.
- **Click en un step completado**: abre modal con el resultado full-size + "Rehacer este paso" + "Descargar".
- **Drag en foto cargada**: permite reordenar orden de procesamiento (en batch).
- **Shift+click en categorías**: selecciona varias (para batch).
- **Escape**: cierra cualquier modal o menú.
- **Cmd/Ctrl+Z**: deshace último paso (ya existe en editor, extender a pipelines).

### Mobile-first implicaciones

Esto amplifica la necesidad de mobile del plan original:
- Los step cards tienen que apilarse verticalmente en móvil
- El slider before/after tiene que funcionar con touch (no solo mouse)
- Los tooltips se convierten en tap-to-expand en lugar de hover
- El upload zone cubre toda la pantalla en móvil
- El progress bar se vuelve vertical en pantallas estrechas

## Reorden de prioridades para commit 10

**Parte 1 (antes era "dashboard redesign"): AHORA ES LA INTERACTIVIDAD VISUAL**

Reordenar así:
1. `<BeforeAfterSlider>` — el componente más pedido, reusable en gallery + los 3 pipelines
2. `<StepProgressBar>` — visible al top de cada pipeline, muestra paso por paso
3. Humanizar todos los toast con `humanizeError()`
4. Tooltips con ejemplo visual en sidebar + categorías
5. Dashboard redesign (lo que era Parte 1 original)
6. Mobile responsive sweep (lo que era Parte 2 original)

**Tiempo estimado con este ángulo: 8-12h** (más que las 5-6h originales porque agrega componentes reusables).

## Cómo evitar romper nada mientras agregamos interactividad

- **NUEVOS componentes** en `src/components/ui/` (before-after-slider, step-progress, etc.) — aditivos, no modifican nada existente
- **Integrar los componentes nuevos en las páginas existentes** reemplazando bloques UI pequeños (no re-escribir páginas enteras)
- Ejemplo: en `pipelines/lingerie/page.tsx`, reemplazar SOLO el render de step cards actuales con el nuevo `<StepProgressBar>`. El resto de la página queda igual.
- Cada commit del ciclo 10 toca 1 componente + la integración mínima para probarlo en 1 sola página. Luego extender a las otras.

## Métrica de éxito (cómo sabemos que mejoró)

Si una persona que NUNCA usó la app puede:
- Entrar al dashboard → entender qué pipeline usar en 5 segundos ✓
- Subir una foto sin leer instrucciones ✓
- Ver QUÉ va a pasar antes de apretar "empezar" ✓
- Ver cada paso ejecutándose con feedback visual ✓
- Comparar antes/después con un slider sin explicación ✓
- Descargar el resultado sin buscar el botón ✓

Entonces cumplimos "app para niños". Antes de cerrar commit 10, probar el flujo completo con esa checklist.

