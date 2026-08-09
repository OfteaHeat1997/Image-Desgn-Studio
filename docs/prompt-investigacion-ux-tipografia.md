# Prompt de investigación e implementación por fases — UX/UI + Tipografía

> **Para qué sirve este documento.** Es un *prompt* reutilizable, organizado en
> fases, para llevar UniStudio de "se ve junior" a "se ve como un producto
> profesional" — con foco fuerte en **tipografía** y **jerarquía visual**, y
> dejando todo **funcional de punta a punta** (full-stack). Cada fase empieza con
> una mini-investigación en línea (queries concretas), define qué implementar,
> qué archivos tocar y un **Definition of Done** (criterios de aceptación) para
> no dejar trabajo a medias.
>
> **Cómo usarlo.** Pégale a Claude Code (o al dev) una fase a la vez, en orden.
> No saltes fases: la tipografía y los tokens (Fase 1) son la base sobre la que
> se apoya todo lo demás. Regla del repo: cambios en `unistudio/`, commit + push
> tras cada fase, y nunca `git add .` desde la raíz.

---

## Contexto técnico (no re-investigar, ya está definido)

- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Estilos:** Tailwind CSS v4 con tokens en `@theme` (`src/app/globals.css`).
- **Fuentes ya cargadas** (`src/app/layout.tsx`): **Inter** (`--font-sans`) para UI/cuerpo
  y **Fraunces** (`--font-serif`) como serif editorial para títulos.
- **Tema:** oscuro por defecto, acento oro premium `--accent: #D4B48A`.
- **i18n:** ya existe base ES/EN → `src/lib/i18n/translations.ts`,
  `src/stores/language-store.ts`, `src/hooks/useI18n.ts`,
  `src/components/ui/LanguageSwitcher.tsx`. La home ya la usa.
- **Objetivo de negocio:** que una persona que entrevista/revisa el proyecto lo
  encuentre claro, legible y profesional en < 30 segundos.

---

## Fase 0 — Auditoría y baseline

**Investigar (queries):**
- `heuristic evaluation checklist UI Nielsen 10 heuristics 2025`
- `accessibility WCAG 2.2 AA color contrast checklist dark theme`

**Hacer:**
1. Inventariar en una tabla: tamaños de fuente, pesos, colores de texto y
   espaciados **realmente usados hoy** (grep de `text-`, `font-`, `tracking-`,
   `leading-` en `src/`). El objetivo es exponer la inconsistencia actual.
2. Capturar 3 pantallas clave (home, un pipeline, editor) como referencia
   "antes".
3. Correr contraste de color de los tokens de texto sobre los fondos oscuros.

**Definition of Done:**
- [ ] Tabla "estado actual" de tipografía y spacing en este doc o en un issue.
- [ ] Lista priorizada de inconsistencias (p. ej. "h1 usa 5 tamaños distintos
      entre páginas").
- [ ] Reporte de contraste: qué combinaciones no llegan a AA (4.5:1 texto normal).

---

## Fase 1 — Fundamentos de tipografía (LA fase crítica)

> La tipografía profesional no es "elegir una fuente bonita": es **un sistema**
> (escala, pesos, interlineado, tracking, espaciado) aplicado con **consistencia**.
> La mayoría de productos SaaS usan **una familia con variación de peso**, y suman
> una serif de display solo para dar carácter. Nosotros ya tenemos esa dupla
> (Inter + Fraunces): el trabajo es *usarla como sistema*, no ad-hoc.

**Investigar (queries):**
- `modular type scale 1.25 major third rem values UI`
- `8-point grid spacing system design tokens rem`
- `Inter font UI weights 400 500 600 line-height best practices`
- `luxury editorial serif display font pairing hierarchy`

**Especificación propuesta (punto de partida, ajústala con la investigación):**

### 1.1 Escala tipográfica (modular, ratio 1.25 · base 16px)

| Token         | rem      | px  | Uso                                   | Familia   |
|---------------|----------|-----|---------------------------------------|-----------|
| `display`     | 3.05rem  | 49  | Hero de la home                       | Fraunces  |
| `h1`          | 2.44rem  | 39  | Título de página                      | Fraunces  |
| `h2`          | 1.95rem  | 31  | Sección                               | Fraunces  |
| `h3`          | 1.5rem   | 25  | Card / subtítulo                      | Fraunces  |
| `lg`          | 1.25rem  | 20  | Lead / intro                          | Inter     |
| `base`        | 1rem     | 16  | Cuerpo                                | Inter     |
| `sm`          | 0.875rem | 14  | Secundario, labels                    | Inter     |
| `xs`          | 0.75rem  | 12  | Metadatos, costos, captions           | Inter     |

> En mobile, baja `display`/`h1` un escalón (usa `clamp()` o los breakpoints
> `md:` de Tailwind, como ya hace la home).

### 1.2 Reparto de familias (regla simple)

- **Fraunces (serif):** solo `display`, `h1`, `h2`, `h3` y el wordmark.
  Peso 500–600, `tracking-tight` (−0.01em a −0.02em) para que el serif se vea
  intencional y no "de blog".
- **Inter (sans):** todo lo demás — cuerpo, botones, labels, inputs, tablas.
  Tres pesos y punto: **400** (cuerpo), **500** (subtítulos/énfasis, botones),
  **600** (títulos de UI cortos). Nada de 300 ni 700 sueltos.

### 1.3 Interlineado (line-height) y tracking

- Títulos (serif): `leading-tight` (~1.1–1.2), `tracking-tight`.
- Cuerpo (Inter): `leading-relaxed` (~1.6) para textos largos, `leading-normal`
  (~1.5) para párrafos cortos de UI.
- Labels/uppercase: `tracking-[0.12em]`–`[0.16em]` (mayúsculas necesitan aire).
- **Los line-heights deben caer en la malla de 4px** (14/20, 16/24, 20/28…):
  lo que sigue la grilla es el interlineado, no el font-size.

### 1.4 Espaciado (grilla de 8pt, sub-grilla de 4pt)

Usa **solo** múltiplos de 4/8 (Tailwind ya lo hace: `2=8px`, `3=12px`, `4=16px`,
`6=24px`, `8=32px`, `12=48px`, `16=64px`). Prohibido `mt-[13px]` a ojo.
Ritmo vertical sugerido: bloque→bloque `mb-12/16`, título→texto `mt-4`,
texto→CTA `mt-6`.

**Implementar:**
1. Definir los tokens de tamaño/leading/tracking en `@theme` de
   `src/app/globals.css` (o clases utilitarias `.text-display`, `.text-h1`…).
2. Crear componentes tipográficos reutilizables en
   `src/components/ui/typography.tsx`: `<Display>`, `<H1>`, `<H2>`, `<H3>`,
   `<Lead>`, `<Body>`, `<Muted>`, `<Label>` — así ninguna página vuelve a
   escribir `text-2xl md:text-3xl font-bold` a mano.
3. Migrar la **home** primero (ya medio hecho), luego los 3 pipelines, luego el
   resto, reemplazando clases sueltas por los componentes.

**Definition of Done:**
- [ ] Existe UNA escala tipográfica documentada y en tokens.
- [ ] Componentes `<H1>…<Label>` creados y usados en la home + 3 pipelines.
- [ ] Cero `font-bold`/tamaños mágicos nuevos fuera del sistema (lint/grep).
- [ ] Títulos en Fraunces, cuerpo en Inter, máx. 3 pesos.
- [ ] Contraste AA en todos los textos (revisar vs Fase 0).

---

## Fase 2 — Sistema de UI y jerarquía visual

**Investigar (queries):**
- `visual hierarchy UI cards spacing elevation best practices`
- `button states design system primary secondary ghost disabled`
- `empty states loading skeletons UX patterns`

**Hacer:**
1. Estandarizar **botones** (primario oro, secundario, ghost, disabled, loading)
   en un solo `<Button>` con variantes. Grep de botones ad-hoc y migrarlos.
2. Estandarizar **cards** (radio, borde, hover, padding) con los mismos tokens.
3. Unificar **headers de página**: mismo patrón título+subtítulo en todas
   (home, pipelines, editor, gallery, batch, brand-kit, docs, workflows, agent).
4. Estados vacíos y de carga (skeleton) coherentes.

**Definition of Done:**
- [ ] Un solo componente `<Button>` con variantes; sin botones sueltos.
- [ ] Header de página consistente en las 10 rutas.
- [ ] Cards con tokens compartidos (nada de bordes/paddings a ojo).

---

## Fase 3 — Multilenguaje completo (extender el i18n existente)

> Ya existe la base ES/EN y la home la usa. Falta llevarla al resto.

**Investigar (queries):**
- `next.js app router i18n client store best practices 2025`
- `writing UI microcopy guidelines clarity actionable`

**Hacer:**
1. Extraer TODAS las strings hardcodeadas de los pipelines y páginas internas a
   `src/lib/i18n/translations.ts` (mantener la misma forma ES/EN — TypeScript
   obliga a traducir todo).
2. Reemplazar textos por `const { t } = useI18n()`.
3. Reescribir la microcopy mientras migras: verbos accionables, 1 idea por
   frase, sin jerga técnica ni nombres de modelos IA.
4. Verificar que el `<LanguageSwitcher>` esté accesible desde toda la app
   (moverlo a un header/layout compartido).

**Definition of Done:**
- [ ] 0 strings hardcodeadas de UI en las páginas migradas (grep de acentos/ñ
      en JSX como señal).
- [ ] ES y EN completos y sin claves faltantes (compila = completo).
- [ ] Switch de idioma visible y funcional en todas las rutas, con persistencia.

---

## Fase 4 — Funcionalidad full-stack (que todo *funcione*)

**Investigar (queries):**
- `react error boundary toast UX loading error states best practices`
- `form validation UX inline errors accessibility`
- `web vitals LCP CLS optimization next.js images`

**Hacer:**
1. **Estados**: cada acción async con loading + éxito + error visibles (toasts ya
   existen vía `use-toast.ts`). Nada que "no responda" al hacer click.
2. **Errores human-friendly** (ya hay base en el diccionario de errores): sin
   stack traces al usuario.
3. **Validación** en el borde de cada `/api/*` y en los formularios.
4. **Accesibilidad**: foco visible, `aria-*` en controles, navegación por
   teclado, `alt` en imágenes, `<html lang>` sincronizado (ya hecho en home).
5. **Performance**: `next/image` donde hoy hay `<img>`, revisar LCP/CLS.
6. **Health check**: `/api/health` verde con los proveedores conectados.

**Definition of Done:**
- [ ] Ninguna interacción sin feedback (loading/success/error).
- [ ] `<img>` crudos migrados a `next/image` en páginas clave.
- [ ] Navegable 100% por teclado; foco visible.
- [ ] `npm run lint:strict` y `tsc --noEmit` limpios.

---

## Fase 5 — Pulido y "demo listo para entrevista"

**Investigar (queries):**
- `product demo first impression 5 second test UX`
- `portfolio project README screenshots what reviewers look for`

**Hacer:**
1. Pasada final de consistencia (spacing, tipografía, colores) en las rutas que
   verá quien evalúa.
2. Capturas "después" y comparativa con las de Fase 0.
3. README/CHANGELOG al día; screenshots en el README.
4. **Test de 5 segundos**: enséñale la home a alguien 5s y pregúntale qué hace la
   app. Si no lo capta, arregla la jerarquía/copy.

**Definition of Done:**
- [ ] Home pasa el test de 5 segundos.
- [ ] Antes/después documentado.
- [ ] README con screenshots y descripción clara del stack.

---

## Checklist maestro (una línea por fase)

- [ ] **F0** Auditoría: inconsistencias + contraste documentados.
- [ ] **F1** Tipografía: escala, tokens y componentes `<H1>…<Label>` aplicados.
- [ ] **F2** UI: `<Button>`, cards y headers consistentes.
- [ ] **F3** i18n: toda la app ES/EN, switch global, microcopy reescrita.
- [ ] **F4** Full-stack: estados, validación, a11y, performance, lint/tsc verdes.
- [ ] **F5** Demo: pulido final, antes/después, README.

---

## Fuentes (investigación de base para este plan)

Tipografía y escala:
- [Inter Font Pairing: 12 Best Combinations (madegooddesigns)](https://madegooddesigns.com/inter-font-pairing/)
- [SaaS Typography Playbook — What 50 Companies Use (fullstop360)](https://fullstop360.com/blog/insights/branding/saas-typography-playbook-what-leading-companies-use)
- [Typography Guide for Modern SaaS Brands 2025 (evietek)](https://evietek.com/blogs/typography-guide-for-modern-saas-brands-2025)
- [8-Point Grid: Typography On The Web (freeCodeCamp)](https://www.freecodecamp.org/news/8-point-grid-typography-on-the-web-be5dc97db6bc/)
- [Spacing — Atlassian Design System](https://atlassian.design/foundations/spacing)
- [Spacing System Cheat Sheet: 4px vs 8px (Mantlr)](https://mantlr.com/blog/spacing-system-cheat-sheet)
- [Spacing, grids, and layouts (designsystems.com)](https://www.designsystems.com/space-grids-and-layouts/)

Serif editorial / lujo:
- [Best Fonts for Luxury Branding: Serif vs Sans (Lettertype Studio)](https://lettertypestudio.com/best-fonts-for-luxury-branding-serif-vs-sans-serif-complete-guide-2026/)
- [Elegant Fonts for Fashion Brands (FontFinds)](https://fontfinds.com/fonts-for-fashion-brands-boutique-luxury-2026/)
- [15 Best SaaS Typography Examples (Orbix Studio)](https://www.orbix.studio/blogs/saas-typography-examples)
