# Design System — UniStudio

> **Single source of truth** para colores, tipografía, espaciado y copy UX.
> Cambia acá → cambia en TODA la app.

## TL;DR para iterar rápido

| Si querés cambiar… | Editá… |
|---|---|
| Color del brand (oro) | `unistudio/src/app/globals.css` línea 21 (`--accent`) |
| Texto que ve la usuaria | `unistudio/src/lib/design/copy.ts` |
| Color de error / éxito / warning | `globals.css` líneas 34-41 |
| Tipografía | `globals.css` línea 56 (`--font-sans`) |
| Bordes redondeados (radii) | `globals.css` líneas 44-47 |

## Inspiración (research mayo 2026)

Análisis de las 3 apps líderes de AI product photography para e-commerce:

### Photoroom
- **150M+ downloads** — el más usado del mercado
- Bg-removal "el mejor en velocidad y precisión"
- **Mobile-first** (web "less polished" según AIToolShop) — coincide con tu experiencia testeando desde teléfono
- Patrón clave: **batch + virtual model con hasta 4 productos** (cross-sell)
- Outputs natively marketplace-compliant (Amazon, etc.)
- [Photoroom Guide 2026](https://aitoolsdevpro.com/ai-tools/photoroom-guide/)

### Claid
- **$19/$49/mes** — pricing simple
- Foco en "fotorealismo + producto preservado" (mismo problema que tú reportabas: "el producto cambia")
- "Single workspace para catalog cleanup + product photo generation"
- 20 free credits/mes para trial
- [Claid blog 2026](https://claid.ai/blog/article/ai-product-photo-tools)

### Pebblely
- "Themes act como un art director ligero"
- Patrón clave: **consistency-by-template** — un theme genera SET de imágenes con misma vibe (lo que tú ya hacés con shared seed entre 1:1 y 9:16)
- 40 free images/mes
- [Wearview comparison](https://www.wearview.co/blog/ai-product-photography-tools)

## Lo que UniStudio ya tiene mejor que ellos

| Feature | UniStudio | Photoroom | Claid | Pebblely |
|---|---|---|---|---|
| Pipelines categoría-específicos (lencería/perfumes/joyería) | ✅ | ❌ genérico | ❌ genérico | ❌ solo bg |
| Identity-check post-procesamiento | ✅ | ❌ | parcial | ❌ |
| Análisis Vision per-foto antes de generar | ✅ | ❌ | parcial | ❌ |
| 3 outputs cohesivos (blanco / catálogo / 9:16) | ✅ | parcial | ❌ | ❌ |
| Self-hosted, sin costo recurrente | ✅ | ❌ | ❌ | ❌ |

## Lo que copiamos de la competencia

1. **Mobile-first en dashboard** — los 3 pipelines son cards grandes verticales en mobile (commit `889e131`)
2. **Outcome > proceso** en descripciones (de "Bras, panties — quita modelo y crea una nueva" a "De foto con modelo a catálogo profesional con modelo IA")
3. **Single brand color** (oro `#D4B48A`) en vez de mezcla pink/amber/yellow random — patrón Claid
4. **Texto centralizado** (`copy.ts`) para iterar UX text sin tocar JSX

## Tokens disponibles

### Colores

```ts
// Surfaces (de fondo a más arriba)
bg-surface          // #0C0C0E — fondo de la app
bg-surface-light    // #151518 — cards
bg-surface-elevated // #1E1E22 — modal / hover

// Brand
text-[var(--accent)]       // #D4B48A — oro principal
text-[var(--accent-light)] // #E8D5B5 — oro hover
text-[var(--accent-muted)] // #A08560 — oro muted

// Texto
text-heading   // #FFFFFF — títulos
text-body      // #B0B0B8 — cuerpo
text-muted     // #7A7A82 — captions

// Semánticos
text-[var(--success)]  // #50C878 — verde "listo"
text-[var(--error)]    // #FF4D4D — rojo "falló"
text-[var(--warning)]  // #F5A623 — ámbar "advertencia"
text-[var(--info)]     // #5B9CF6 — azul "info"
```

### Spacing & Radii

```ts
rounded-[var(--radius-sm)]  // 8px  — botones pequeños
rounded-[var(--radius-md)]  // 12px — cards
rounded-[var(--radius-lg)]  // 16px — secciones grandes
rounded-[var(--radius-xl)]  // 20px — heroes
```

### Animaciones

```ts
.transition-default  // 150ms — interacciones normales
.transition-slow     // 300ms — page transitions
.text-gradient       // gradient oro para headings hero
.glass               // efecto glass con blur
.bg-shimmer          // skeleton loading
.checkerboard-bg     // fondo transparencia (PNG previews)
```

## Anti-patterns — NO HACER

❌ Usar colores Tailwind hardcoded (`bg-zinc-900`, `text-pink-400`, `border-amber-500/50`).
   **Por qué:** rompe coherencia con el brand y obliga a cambiar 50 lugares cuando querés iterar.

❌ Strings hardcoded en JSX (`<h2>Empezar →</h2>`).
   **Por qué:** la usuaria edita UX text → tiene que tocar React. Dolor.

❌ Inventar nuevos colores random (azul, verde, naranja) por cada feature.
   **Por qué:** Photoroom hace esto y se ve "playful pero ruidoso". Claid hace single-color y se ve "premium". Tu marca es Unistyles → premium.

❌ Mencionar nombres técnicos de modelos IA en UI ("usando Kolors", "Flux Schnell").
   **Por qué:** la usuaria final no sabe qué es eso. Genera ansiedad de "¿esto está bien?".

## Flujo recomendado para iterar UX text

1. Editar `unistudio/src/lib/design/copy.ts` con la nueva cadena
2. Reload del browser — el cambio aparece automático (no hay que tocar JSX)
3. Si querés probar variantes A/B, hacer copy alternativo: `COPY.pipelines.lingerie.benefit_v2`

## Próximos pasos sugeridos

- [ ] Aplicar mismo patrón (tokens + copy.ts) a `/pipelines/lingerie`, `/pipelines/static-product`, `/pipelines/jewelry`
- [ ] Crear `lib/design/spacing.ts` con escala consistente (4/8/12/16/24/32/48/64)
- [ ] Migrar mensajes de error técnicos (`fal-ai/kolors-virtual-try-on-v2 image_load_error`) a strings human-friendly de `COPY.errors`
- [ ] Storybook o `/styleguide` page para previsualizar todos los componentes con los tokens

## Sources del research

- [Photoroom 2026 features review](https://marszalstudio.pl/en/photoroom-2026-new-ai-features-review/)
- [Photoroom Review 2026 — Tooliverse](https://tooliverse.ai/tools/photoroom)
- [Best AI photo tools comparison — Claid blog](https://claid.ai/blog/article/ai-product-photo-tools)
- [9 best AI product photography tools — Wearview](https://www.wearview.co/blog/ai-product-photography-tools)
- [12 Best AI tools — Fibbl](https://fibbl.com/best-ai-tools-for-product-photography/)
