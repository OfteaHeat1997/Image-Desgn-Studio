# 07 — If Something Fails During the Live Demo (don't panic)

> A calm, one-line explanation turns a glitch into a *point in your favour* — it proves you
> understand your own system. Read this the morning of the interview.

---

## The golden rule (say this for almost anything)

> "The product itself is always faithful, because it's **composited, not regenerated.** What
> varies is the background — and I control that with prompts and provider choice."

💡 ES: si algo raro pasa y no sabes qué decir, di ESTA frase. Casi siempre aplica.

---

## The failure → one-liner table

| What they might see | What to say (calm, one line) |
|---|---|
| An extra bottle in a background | *"Fast generative models are imperfect at negation. I mitigate it with positive prompts, and since the real product is always composited, the product is never wrong — only the backdrop."* |
| The output looks blurry | *"That source is a ~145px thumbnail — a source-resolution limit, not a pipeline bug. With a 1000px+ photo it's sharp. Let me show one."* (Have a good example ready.) |
| A step times out or errors | *"That's a free-tier rate limit from Replicate or Vercel after heavy testing today. A Retry resolves it — the code is correct, the quota is temporary."* |
| The video looks wrong | *"Generative video is the least reliable step, so it's opt-in and off by default. I'd ship the images and treat video as experimental."* |
| Production looks like an old version | *"Vercel's free plan caps daily deploys; the fix is on `main` and runs locally — production updates when the deploy window frees."* |
| A jewelry on-model result changed the piece | *"That's why I built a quality gate — it flags exactly this. For catalogue shots I use composition so the piece can't change; on-model is the one generative step, and the gate catches its misses."* |
| Someone asks which provider does the lingerie back view | *"The back is my most-iterated view — FASHN, then ghost-3D, then back to on-model try-on. There's a labeling inconsistency in the current build I'd clean up. Let me walk you through the evolution instead."* (Don't claim one provider — tell the story. See `04`.) |

---

## Prep so nothing surprises you

- **Have one GREAT input ready** — a product photo that's ~1000px+ so the HD output looks sharp.
  If you can, run it once before the call and keep the result open.
- **Have one "hard case" ready too** (a tiny thumbnail) so *you* can introduce the resolution
  limit on your own terms — before they find it. Owning it first = maturity.
- **Keep the before/after compare view handy** — it's your strongest visual proof and it looks
  polished.
- **Screenshot 2–3 finished catalogue sets** in advance, in case live generation is slow or a
  provider is down. A slow demo shouldn't cost you the story.

💡 ES: si el internet o un proveedor está lento en vivo, **muestra capturas ya hechas** y sigue
contando la historia. Lo que evalúan es tu razonamiento, no la velocidad del WiFi.

---

## If you truly get stuck on a question

- **Buy a second:** *"Good question — let me think about that for a second."* (Totally fine.)
- **Reason out loud:** they want your *thinking*, not a memorized fact. Walk through it.
- **If you don't know:** *"I haven't hit that case, but here's how I'd approach it…"* — then use
  your method (observe → diagnose → verify). Honesty + a method beats a bluff every time.

💡 ES: "no lo sé, pero así lo abordaría…" es una respuesta FUERTE, no débil. Nunca inventes.
