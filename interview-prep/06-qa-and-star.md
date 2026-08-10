# 06 — Likely Questions → Answers + STAR Stories

> STAR = **S**ituation, **T**ask, **A**ction, **R**esult. TomTom's recruiter told you to use it.
> Use it for any "tell me about a time…" question. Below: quick answers first, then 3 full STAR
> stories you can memorize.

---

## Quick answers (one or two sentences each)

**"How do you keep the product from being altered by the AI?"**
> Composite-first: the AI makes only the background; the real product pixels are pasted on top,
> pixel-perfect. The product is never regenerated, so its shape, colour and label are always real.

**"Why 3 pipelines instead of one?"**
> Each product family needs different treatment — lingerie goes on a *model*, jewelry on a *body
> part* or a luxury scene, static products on a *surface*. One pipeline would be a tangle of
> conditionals; three disjoint pipelines that share small modules is cleaner. There's a strict
> rule: never a 4th pipeline, never duplicate a step — shared logic lives in a module.

**"How do you choose an AI provider?"**
> By the job and by *measured* correctness. Example 1: a faithful upscaler over a generative one,
> because the label must be real. Example 2: the reliable try-on provider over the 15×-faster one,
> because it must be the right person. Example 3: I benchmarked 6 background removers on my real
> product and chose the one that won *on my data*, not the one that tops the general ranking.

**"What was the hardest bug?"**
> The `FUNCTION_PAYLOAD_TOO_LARGE` one — see STAR #1. Or the ghost bottles — STAR #2.

**"How do you handle the AI being non-deterministic / unreliable?"**
> Three ways: (1) composite the real product so the AI can't corrupt it, (2) a quality gate that
> rejects results where the product changed, (3) provider fallback chains and retries. I design
> *around* the unreliability instead of pretending it's 100%.

**"What would you improve?"**
> Auto-detect the source photo's quality and warn the user before wasting a run. Fix the known
> cost-display bug in lingerie. Register the async route's timeout. Move video to a more
> controllable model. And upgrade off the free tiers to remove rate limits.

**"How is this relevant to TomTom / maps?"**
> The transferable skills: orchestrating external APIs, processing data at scale (486 products),
> full-stack TypeScript, handling non-deterministic AI in production, and an AI-native workflow —
> which is exactly what the role and TomTom's own AI products need. (More in `08-tomtom-and-fit.md`.)

**"Did you build this alone? How much did AI do?"**
> I built it solo, using an AI coding agent as a pair-programmer. It wrote code fast; I owned the
> decisions — which model to trust, what "correct" means for a catalogue, and rejecting fixes that
> looked right but weren't. See `05`.

**"What did you learn?"**
> Pick the model by the job, not by which looks better. Correctness before speed. Design around a
> model's limits (negation, non-determinism) instead of fighting them. And that the source data is
> often the real ceiling, not the algorithm.

---

## ⭐ STAR Story #1 — The payload/infrastructure bug (best "engineering depth" story)

- **S (Situation):** After I raised the catalogue output resolution to 2000×2000 for
  marketplace quality, the HD and shadow steps started failing in production with *Request Entity
  Too Large*.
- **T (Task):** Find the real cause and fix it without dropping the quality I'd just added.
- **A (Action):** The easy explanation was "bad inputs," but I read the actual error —
  `FUNCTION_PAYLOAD_TOO_LARGE`. The images were being passed between steps as **base64 data URLs
  of ~3.7 MB**, over Vercel's request-body limit. I moved every intermediate output to **Vercel
  Blob** object storage and passed a **~114-character URL** between steps instead of the raw string.
- **R (Result):** The request body went from **3.7 MB to 114 bytes**; the steps passed **10/10 in
  production**, and the 2000px quality stayed. I kept the fix documented in the changelog.
- **Lesson:** *Raising quality created an infra bug; the fix was about how data moves between
  serverless functions, not about the AI at all.*

---

## ⭐ STAR Story #2 — Ghost bottles / understanding the model (best "AI judgment" story)

- **S:** The styled perfume backgrounds kept showing **1–3 extra ghost bottles** behind the real one.
- **T:** Get clean, empty backgrounds — with the real bottle composited on top, there should be
  exactly one.
- **A:** My prompt said *"no bottles, no products."* I realized the background model (Flux Schnell)
  **doesn't support negative prompts** — it reads the words "bottle/product" and *draws* them (the
  "don't think of a pink elephant" effect). I rewrote every prompt in **pure positive language** —
  "empty studio backdrop, negative space, flat surface" — and stripped the product description out
  of the background prompt entirely.
- **R:** The ghost bottles disappeared. And because the real bottle is **composited**, not
  generated, the final image is guaranteed to have exactly one, real bottle.
- **Lesson:** *I stopped fighting the model and started working with how it actually behaves. Naming
  the thing I didn't want was what summoned it.*

---

## ⭐ STAR Story #3 — Correctness over speed (best "trade-off ownership" story)

- **S:** The lingerie side-view try-on with Leffa took ~4 minutes. I found FASHN could do it in ~15
  seconds — 15× faster.
- **T:** Speed up the pipeline without hurting quality.
- **A:** I switched the side view to FASHN and **tested it on real products.** Running mask-free,
  FASHN **redrew too much** — it returned a *frontal* shot of a *different woman*, losing the pose
  and the model's identity. I made the call to **revert to Leffa** for that view, and kept the fast
  provider only where it was safe.
- **R:** The catalogue stayed consistent — same model, right pose — at the cost of a slower side
  view. I optimized for *correctness first, speed second.*
- **Lesson:** *A 15× speedup is worthless if it returns the wrong person. I'd rather ship a slow,
  correct image than a fast, wrong one.*

---

## Questions to ask THEM (have 3–4 ready — it matters)

- "You've launched a TomTom AI Agent and an MCP server for maps — how is the team using AI
  internally in day-to-day engineering?"
- "What does 'AI-native way of working' look like on this team in practice — is it mostly
  AI-assisted coding, or building AI into the product, or both?"
- "What would success in the first 3–6 months look like for this role?"
- "What's the biggest data or quality challenge the team is working on right now?"
- (For I-Chun, UX-leaning) "How do design and engineering collaborate here when the output of a
  feature is non-deterministic, like an AI result?"

💡 ES: preguntar demuestra interés real y te da control de la conversación. Ten mínimo 3 listas.
