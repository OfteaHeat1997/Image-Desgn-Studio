# 01 — The Project (UniStudio) in One Read

> Everything here is verified against the repo README + code, August 2026.

---

## Say this first (the one-paragraph pitch)

> "UniStudio is a web app that turns a small, raw product photo into a full set of
> professional catalogue images — a clean white e-commerce shot, styled backgrounds,
> vertical formats for Reels, and short videos. It was built for **Unistyles**, a lingerie
> and beauty e-commerce in Curaçao. It replaces about **$200/month of separate SaaS tools**
> (Photoroom, remove.bg, FASHN, Pebblely…) with **one platform** that costs a few dollars a
> month in API fees. It has **3 pipelines**, one per product family — **Lingerie** (164
> products), **Static products** like perfumes and creams (240), and **Jewelry** (82) —
> together covering **486 products, 100% of the catalogue**."

💡 ES: di el número (486, 100% del catálogo) — demuestra que resolviste un problema **real
y completo**, no un demo de juguete.

---

## The ONE idea that explains everything — "composite-first"

> "The real product pixels are **never regenerated** by the AI. The AI only makes the
> *background*. Then I paste the real product on top, pixel-perfect. That guarantees the
> product — its shape, colour and label — is always faithful. The moment you let AI touch the
> product itself, it *invents* — and an invented label on a perfume is unacceptable for a
> real catalogue."

⭐ This single sentence pre-answers half of the technical questions ("how do you keep the AI
from changing the product?", "how do you guarantee fidelity?", "what if the model hallucinates?").

---

## Architecture (say it as 3 layers)

```
  PAGE / UI  (src/app/pipelines/<name>/page.tsx)
      │   the user uploads a photo and approves each step
      ▼
  PIPELINE   (the "conductor" — orchestrates steps in sequence/parallel)
      │   fetch('/api/<module>') — never calls a provider directly
      ▼
  MODULES    (the "instruments" — one job each: bg-remove, upscale, tryon, shadows, video…)
      │   src/lib/processing/<module>.ts  (business logic + validation)
      ▼
  PROVIDER CLIENTS  (the only place API keys are read)
      replicate.ts · fal.ts · fashn.ts · withoutbg.ts
      ▼
  EXTERNAL AI  (Replicate, fal.ai, FASHN, Anthropic/Claude Vision)
```

**Why it matters (say this):**
> "The pipeline is the conductor; the modules are the instruments. A pipeline never calls an
> AI provider directly — it orchestrates modules. So if I swap a provider for one step, I
> change it in one module and every pipeline that uses it benefits, with no duplicated logic.
> There's a strict rule in the repo: **exactly 3 pipelines, never a 4th, never duplicate a
> step between them.**"

💡 ES: eso demuestra **pensamiento de arquitectura**, no solo "usé una API de IA".

---

## The numbers to drop naturally

| Metric | Value |
|---|---|
| Products covered | **486 (100% of the Unistyles catalogue)** |
| Pipelines | **3** (Lingerie 164 · Static 240 · Jewelry 82) |
| Lines of code | **~37,000**, full-stack **TypeScript** |
| Source files | 150 (62 TSX + 87 TS) |
| Modules wrapping AI providers | **~19** |
| API routes | **29** endpoints |
| State stores | 6 Zustand stores (3 persisted to localStorage) |
| Cost | replaces **~$200/mo SaaS** with **~$3–15/mo** in API fees |

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 7 +
PostgreSQL (optional, every DB call null-guarded) · Zustand · **Sharp** (pixel compositing) ·
**Replicate** & **fal.ai** (pay-per-use AI) · **FASHN** (try-on) · **Claude Vision/Haiku**
(image analysis + planning) · **Vercel** (serverless + Blob object storage).

💡 ES: "PostgreSQL es opcional y cada llamada está null-guarded" es un detalle que suena muy
profesional — significa que la app no se cae si no hay base de datos.

---

## The three pipelines at a glance

| Pipeline | Product goes… | Core challenge | Key providers (now) |
|---|---|---|---|
| **Static** (perfumes, creams) | …on a **surface** | faithful HD + clean backgrounds without ghost duplicates | Real-ESRGAN (restore), Flux Schnell (bg), Sharp (white + composite) |
| **Jewelry** (rings, necklaces) | …on a **body part** or luxury scene | isolate cleanly, never redraw the piece, right sub-type placement | BiRefNet (isolate), Flux Kontext (scene), Sharp+ffmpeg (macro + reel) |
| **Lingerie/Uwear** (bras, fajas) | …on a **model** (try-on) | dress a *person* faithfully — the hardest, most error-prone | Leffa + FASHN + Uwear (try-on), SeedDream (ghost) |

Details in `02`, `03`, `04`.

---

## The phases (if they ask "how did this evolve?")

The project grew in clear phases (visible in `CHANGELOG.md`):

1. **Foundation (Apr 2026):** consolidated a messy set of tools into **3 canonical pipelines**;
   made the AI Agent a *router* (detect category → send to the right pipeline) instead of a
   free-form generator. Introduced **composite-first** for static products.
2. **Provider exploration (Apr–Jun):** benchmarked try-on providers for lingerie (SeedDream →
   Uwear.ai → Leffa → FASHN), learning each one's failure modes. Added the **before/after
   comparator** on every step.
3. **Deep debugging & polish (Aug):** the big session — killed ghost bottles, payload/timeout
   infra bugs, made jewelry **Vision-driven** with an Instagram kit, and fixed the lingerie
   "the AI model never got created" bug. UX was measured (font sizes, contrast), not guessed.

💡 ES: contar el proyecto en **fases** demuestra que sabes evolucionar un producto, no solo
tirar código. Si preguntan "¿cómo empezó?", esta es tu respuesta.
