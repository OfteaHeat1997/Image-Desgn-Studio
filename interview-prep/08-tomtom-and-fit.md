# 08 — About TomTom + Why You Fit

> Know enough to sound genuinely interested and to connect your project to their world.
> Verified from public sources (August 2026) — links at the bottom.

---

## TomTom in 3 sentences (so you can talk about them)

- TomTom is an **Amsterdam-based maps and location-technology company**, ~3,700 people, 30+ years
  old. It builds **maps, real-time traffic, and navigation** — for carmakers, developers, and
  enterprises, not just consumer devices.
- Two segments: **Location Technology** (maps, traffic, APIs, automated-driving data) and
  **Consumer** (navigation apps, some devices).
- **They're going AI-native in the product itself:** at CES 2026 they showed a **TomTom AI Agent**
  and **Orbis Maps for Automated Driving**, and they now offer a **TomTom MCP Server** so AI agents
  can pull live map/traffic/location data for context-aware answers. *"They don't just provide
  maps — they provide the tools to build them and to interact with maps using AI."*

💡 ES: menciona el **AI Agent** y el **MCP Server** de TomTom. Demuestra que investigaste y que
tu forma de trabajar (construir sobre modelos de IA imperfectos) es justo su dirección.

---

## The interviewers (tailor to each)

- **Thiago Andrade** — background in **data science / machine learning / mobility** (spatio-temporal
  data, anomaly detection, mobility patterns). He'll probe the **engineering & data** side.
  → Lean into: provider **benchmarking with measurements**, handling **non-deterministic** models,
  **scale** (486 products), **fallback chains**, the **payload/timeout infra** fixes, cost trade-offs.
- **I-Chun Chou** — hiring manager, with a **UX/design** sensibility.
  → Lean into: the **UI redesign** (3-stage flow, progressive disclosure / "Ajustes avanzados"),
  the **before/after compare zoom**, the **measured** typography and contrast fixes (you counted
  65 texts under 12px and fixed them — you didn't eyeball it), and the **quality gate** that
  protects the user from bad AI output.

💡 ES: no sabes exactamente el rol, así que cubre AMBOS lados. Tu proyecto tiene ingeniería de
datos **y** diseño de producto — es tu súper poder aquí.

---

## TomTom's hiring process (what to expect, generally)

- A recruiter screen (done — that's Beatrice), then interviews with the hiring manager and team.
- For technical roles they value: **role-matched keywords**, **quantified impact**, and **one
  project you can defend end-to-end.** (That's UniStudio — and this folder makes it defendable.)
- They explicitly recommend the **STAR method** — you have 3 STAR stories ready in `06`.
- Some roles include a short coding task or a technical deep-dive; be ready to *reason out loud*.

---

## How your project connects to TomTom (say a version of this)

> "On the surface it's product photography, but underneath it's the same engineering TomTom does:
> **orchestrating many external services into reliable pipelines, processing data at scale, and
> building on top of imperfect AI models while staying in control of correctness.** I handled
> non-determinism, rate limits, payload limits, provider fallback and quality gates — production
> concerns, not a toy demo. And I did it AI-native: an AI agent as a pair-programmer, with the
> engineering judgment staying mine. That's the way of working I'd bring to a team that's putting
> AI into maps."

**Transferable skills to name explicitly:**
- Full-stack **TypeScript** (Next.js App Router, React, serverless).
- **API orchestration** across many providers with fallbacks and retries.
- **Data at scale** — a 486-product catalogue, auto-routed by category.
- **Handling non-deterministic AI in production** — gates, composites, measured provider choice.
- **AI-native workflow** — the exact thing they're asking you to demonstrate.

---

## Confidence reminders (read the morning of)

- You built a **real, working product** covering **100% of a real company's catalogue.** That's
  rare — most candidates bring a tutorial project. Yours ships.
- Every hard question has an honest answer in this folder. You are **not** going in blind.
- They already like you — you're past the screen. This is a conversation, not an exam.
- If you go blank: breathe, and fall back to one of the **5 sentences** in `00-START-HERE.md`.

💡 ES: respira. Tú **hiciste** esto. Nadie conoce este proyecto mejor que tú. 💙

---

## Sources
- [TomTom — Maps and Location Technology](https://www.tomtom.com/)
- [TomTom CES 2026 product demos (AI Agent, Orbis Maps)](https://www.tomtom.com/newsroom/product-focus/tomtom-ces-2026-product-demos-what-you-can-expect-to-see-in-las-vegas/)
- [How we hire at TomTom](https://www.tomtom.com/careers/how-we-hire/)
- [TomTom interview questions — Glassdoor](https://www.glassdoor.com/Interview/TomTom-Interview-Questions-E38808.htm)
- [TomTom hiring process guide 2026 — ClavePrep](https://claveprep.com/blog/tomtom-hiring-process-guide-2026)
- [STAR method (Situation, Task, Action, Result)](https://en.wikipedia.org/wiki/Situation,_task,_action,_result)
