# 🎯 TomTom Interview — START HERE

> **This folder replaces the old, outdated interview notes.** Everything here has been
> verified against the *current* code (August 2026), not against memory or old docs.
> English = what you SAY in the interview. 💡 ES = notes for you, in Spanish.

---

## The interview (what you already know)

- **Two parts:** (1) **present one project** (UniStudio), and (2) **show your AI-native way of working.**
- **Interviewers:** **I-Chun Chou** (hiring manager) and **Thiago Andrade**.
  - Thiago's background is **data science / machine learning / mobility** → he'll probe the
    *engineering and data* side (providers, pipelines, scale, trade-offs).
  - The panel also has a **UX/design** sensibility → talk about the *redesign, usability,
    progressive disclosure, before/after comparison* too.
  - 💡 ES: tu proyecto tiene las DOS caras (IA/datos **y** UX). Menciona ambas — es tu ventaja.
- **They asked you to use the STAR method** (Situation, Task, Action, Result). Use it for
  every "tell me about a time…" question. See `06-qa-and-star.md`.

---

## How to study this folder (in order)

| File | What it gives you | Priority |
|---|---|---|
| `01-project-overview.md` | The 1-paragraph pitch + the ONE idea (composite-first) + numbers + architecture | ⭐ Must |
| `02-pipeline-static.md` | Static products — your deepest work, best debugging stories | ⭐ Must |
| `03-pipeline-jewelry.md` | Jewelry — Vision-driven, sub-type routing, Instagram kit | Read |
| `04-pipeline-lingerie.md` | Lingerie/Uwear — hardest pipeline, provider benchmarking | Read |
| `05-ai-native-way-of-working.md` | The debugging-loop story — **this is Part 2 of the interview** | ⭐ Must |
| `06-qa-and-star.md` | Likely questions → short answers + STAR stories | ⭐ Must |
| `07-if-something-fails.md` | If the live demo breaks: one calm line per case | ⭐ Must |
| `08-tomtom-and-fit.md` | About TomTom + how your project connects + questions to ask them | Read |

💡 ES: si solo tienes 1 hora, lee los ⭐. Entiende la *historia* de 4–5 bugs y podrás
contestar casi cualquier pregunta. No memorices: **entiende**.

---

## Your 12-minute presentation script (rough shape)

1. **(1 min) One paragraph.** What UniStudio is + "it replaces $200/mo of SaaS with one app."
   → from `01`.
2. **(1 min) The one big idea: composite-first.** "AI only makes the background; the real
   product is never regenerated." → this pre-answers half their questions.
3. **(2 min) Architecture.** 3 pipelines (one per product family) → each orchestrates small
   modules → each module wraps one AI provider. "Pipeline = conductor, modules = instruments."
4. **(4 min) A real debugging story.** Pick ONE from static (ghost bottles ⭐ or payload ⭐).
   Tell it as: *what I saw → why it happened → how I decided the fix → how I verified it.*
   This IS your "AI-native way of working" — you debugging a real product with AI, in control.
5. **(2 min) Trade-offs I owned.** Faithful-over-fake, correctness-over-speed, removed Photoroom.
6. **(2 min) Honest limits + what I'd improve.** Source resolution ceiling, non-determinism,
   free-tier limits → each with a mitigation. Ends on maturity, not weakness.

💡 ES: si te ponen a hacer demo en vivo, ten lista una foto BUENA (fuente grande, ~1000px+)
para que el resultado se vea HD. Si algo falla, ve directo a `07-if-something-fails.md`.

---

## The 5 sentences that carry the whole interview (memorize these)

1. **"The pipeline is the conductor; the modules are the instruments — I never call an AI
   provider directly from a pipeline."**
2. **"Composite-first: the AI only makes the background. The real product pixels are pasted
   on top, pixel-perfect, so the product is never invented."**
3. **"I pick the model by the job, not by which looks sharper — a generative upscaler invented
   fake text on a label, so I chose the faithful one."**
4. **"Correctness first, speed second — I kept the slower try-on provider because the fast one
   occasionally returned the wrong person."**
5. **"I work with AI as a pair-programmer, but I stay the engineer: I read the real output,
   I question its first answer, I reject fixes that look right but aren't, and I own the trade-offs."**

💡 ES: si te quedas en blanco, cualquiera de estas 5 frases te devuelve al control.
