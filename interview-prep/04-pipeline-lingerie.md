# 04 — LINGERIE Pipeline ("Uwear" / lencería)

> The **hardest** pipeline — here the AI has to dress a *person*, so it's the most
> error-prone and the richest source of "choosing the right provider" stories.
> Verified against the current code (`pipelines/lingerie/page.tsx`, `api/tryon`,
> `api/tryon/async`, `api/model-create`).

---

## What it does (say this)

> "For lingerie the pipeline builds a **catalogue on a virtual model.** It isolates the real
> garment, generates a **royalty-free AI model** (reused across every colour of the same
> reference so the catalogue is consistent), and then dresses that model — a **front** view, a
> **side** profile, a **back** view for the clasp and straps, a **detail** macro, and a
> **full-body** shot. Optionally it makes short videos. Because I'm dressing a person, this is
> the pipeline where **provider choice matters most** — so I benchmarked several and picked by
> *correctness*, not speed."

**The main views and who does them TODAY (verified in code):**

| View | Provider now | Why |
|---|---|---|
| **Front** | **Uwear (Qwen Intimate)** first → SeedDream → Kolors (a fallback chain) | Uwear can read the garment spec and reconstruct low-contrast detail |
| **Side** | **Leffa** | Reverted from FASHN — FASHN returned a *frontal* shot of a *different woman* |
| **Back** | on-model try-on (see the honest note below) | Needs the real back photo, isolated first |
| **Detail** | **Uwear + a real-pixel macro crop** | The macro proves the true fabric texture |

💡 ES: no tienes que recitar los nombres de todos los proveedores. Lo importante es la
**historia de por qué elegiste cada uno.** Abajo están las 4 que valen oro.

---

## ⭐ Story 1 — "The back photo pasted a FACE on the model's back"

- **What broke:** the back view came out with a **face on the model's back**, and it even leaked
  another brand's copyrighted photo.
- **Root cause:** the back photo was being **warped onto the body without isolating the garment
  first** — so the try-on model deformed the *entire* source photo (a whole person, background
  and all) onto the avatar's back.
- **Fix:** **isolate the garment first**, and if isolation fails, **stop with a clear message**
  instead of warping the raw photo.
- **Say:** *"The rule I learned: never warp an image onto a body without isolating the subject
  first. And fail loudly — a wrong image is worse than a missing one, especially with someone
  else's copyrighted photo in the input."*
- 💡 ES: esta historia tiene DOS lecciones (aislar primero + fallar con mensaje claro) y toca un
  tema serio (copyright). Es una de tus mejores.

---

## ⭐ Story 2 — "FASHN was 15× faster but returned the wrong woman"

- **What happened:** I moved the **side** view to **FASHN** because it was ~15 seconds vs Leffa's
  ~4 minutes. But FASHN, running mask-free, **redrew too much** — it returned a **frontal** view
  of a **different woman**, losing both the pose and the model's identity.
- **Decision:** I **reverted the side view to Leffa** — slower, but it keeps the right person and
  the right pose.
- **Say:** *"I benchmarked FASHN vs Leffa. FASHN was 15× faster but occasionally hallucinated a
  different model. Speed is worthless if it returns the wrong person — so for the risky views I
  kept the slower, reliable provider. Correctness first, speed second."*
- 💡 ES: **"correctness first, speed second"** — esta frase suena muy senior. Úsala aquí.

---

## ⭐ Story 3 — "'Auto' isn't a provider — it's a chain" (a subtle reasoning bug)

- **What broke:** *"no provider works"* — the try-on kept dying with confusing, different errors.
- **Root cause:** the step that creates the AI model was set to skip whenever the provider was
  `"uwear"` **or `"auto"`**. But `"auto"` is **not a provider — it's a fallback chain** (Uwear →
  SeedDream → Kolors). When it fell through to SeedDream/Kolors, those *need* an AI model, and it
  had been skipped → everything failed.
- **Fix:** only the explicit `"uwear"` choice skips model creation (because Uwear brings its own
  model). `"auto"` now always creates one.
- **Say:** *"The bug wasn't in the AI — it was in my mental model. I'd treated 'auto' as a single
  provider, but it's a chain that can fall back to providers with different requirements. Once I
  saw that, the fix was one line."*
- 💡 ES: esta muestra que **entiendes el sistema a fondo** — que un bug puede ser un error de
  *razonamiento*, no de la IA. A Thiago le va a gustar.

---

## ⭐ Story 4 — "Why the front view moved to Uwear" (fidelity)

- **What happened:** Leffa only **warps the pixels it can see** — it doesn't *understand* the
  garment. On beige / nude / white products, the **hook-and-eye clasp is the same colour as the
  fabric**, so Leffa smoothed it away.
- **Decision:** the front view now defaults to **Uwear**, which receives the **Claude Vision
  description** of the garment and can reconstruct that low-contrast detail. *(This wiring — Uwear
  actually receiving the Vision spec — was itself a bug I fixed: it was being computed and then
  thrown away.)*
- **Say:** *"A warping model is faithful to what it can see but blind to what it can't. For
  low-contrast details like a nude-on-nude clasp, I moved to a provider that reads a text
  description of the garment and reconstructs it. Different jobs need different provider types."*

---

## Other real fixes

- **The AI model put a CAP on the model's head** → the Uwear "art direction" preset was changing
  the framing and re-dressing the model. I **pulled art-direction out of the Uwear path** for
  stability.
- **The side view used the *back* photo as the garment reference** → fixed to use the front.
- **The back step paid for an AI model just to throw it away** → removed that wasted call.

---

## The honest, defensible notes (READ THIS — don't over-claim)

Lingerie has a few **known inconsistencies** you should *own* rather than get caught on. Framing
them as "tech debt I'm aware of" reads as maturity.

1. **The back-view provider label is inconsistent.** The back view went through a lot of
   iteration — FASHN → a ghost-3D experiment → back to on-model try-on. In the current code the
   **badge and the commit message say "Leffa" but the engine that actually runs is FASHN.** So if
   they ask "which provider does the back?", the safe, honest answer is:
   > *"The back view is the one I iterated on most — FASHN, then a ghost-3D reconstruction, then
   > back to on-model try-on. There's actually a labeling inconsistency in the current build I'd
   > clean up: the badge says Leffa but it's running the FASHN path. It's on my list."*
   Don't state a single confident provider name for the back — tell the evolution instead.
2. **Cost accounting under-reports.** The UI reads the cost from the wrong field, so a real
   $0.20 Uwear front photo is logged as $0.02. The *images* are correct; the *cost number* is a
   known bug. If money comes up: *"the per-step cost display reads the wrong field — a known bug;
   the real cost is higher than the badge shows."*
3. **A true back view needs a real back photo.** Without one, it warns and falls back to the front
   crop — which can't show the real clasp. It's honest about it (a toast), but it's a limit.
4. **The async try-on route isn't registered in `vercel.json`** (inherits the 60s default). In
   practice the enqueue-and-poll design keeps each call short, so it hasn't bitten — but it's
   unregistered.

💡 ES: **NO** entres diciendo "la espalda usa Leffa" como un hecho firme — el código dice otra
cosa y te podrían pillar. Cuenta la *evolución* y menciona que hay una etiqueta que arreglarías.
Eso te hace ver honesta y en control, no insegura.

**Say (summary):** *"Lingerie is where provider choice matters most, because you're dressing a
person. I benchmarked providers, kept the reliable one over the fast one for risky views, and
moved to a spec-reading provider for low-contrast detail. It's also my most-iterated pipeline, so
it carries some known tech debt I can point to — which is honestly a sign of how much real
testing it went through."*
