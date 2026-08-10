# 03 — JEWELRY Pipeline (joyería)

> Verified against the current code (`pipelines/jewelry/page.tsx`, `jewelry-scene.ts`,
> `bg-remove.ts`, `macro-crop.ts`, `social-kit.ts`). **Note:** the current flow is more
> advanced than the old doc — it no longer has an upscale step or an AI video step; it moved
> to **composition** and an **ffmpeg reel.**

---

## What it does (say this)

> "For jewelry the UI is **3 stages — Prepare → Generate → Publish** — wrapping 8 steps. It
> cleans the WhatsApp price/text off the photo, isolates the piece, then **composes** a
> catalogue packshot and a luxury scene, cuts a real-pixel macro detail, optionally places the
> piece **on a model** or **held in a hand** for scale, and finally builds an **Instagram
> carousel and a Reel**. As in every pipeline, the piece itself is **never redrawn** — it's
> composited."

**The 8 steps:**

| Stage | Step | What it does | Engine | Cost |
|---|---|---|---|---|
| Prepare | 1. Clean | remove price/text/watermark overlays | Flux Kontext Pro | $0.04 |
| Prepare | 2. Isolate | cut piece to transparent PNG | **BiRefNet** | $0.01 |
| Generate | 3. Packshot | ivory-background catalogue shot | **Sharp composition (no AI)** | $0 |
| Generate | 4. Luxury scene | editorial scene | **Sharp composition** (+ Flux backdrop only if it passes a card-detector) | ~$0 |
| Generate | 5. Macro | tight detail crop of **real pixels** | **Sharp (no AI)**, Vision picks the region | $0 |
| Generate | 6. On model (default ON) | piece worn on an AI model | SeedDream + Kontext | $0.10 |
| Generate | 7. Scale (default OFF) | piece **held by a hand** for size | SeedDream + Kontext | $0.10 |
| Publish | 8. Social | IG carousel 1080×1350 + reel 1080×1920 | **Sharp + ffmpeg (no AI)** | $0 |

Total with defaults ≈ **$0.20**.

💡 ES: si te preguntan por costo, "veinte centavos por producto para 8 entregables" es una cifra
muy fuerte. Y muchos pasos cuestan **$0** porque son composición, no IA.

---

## ⭐ The benchmark story — choosing the background remover by *measurement*

- **What happened:** the isolation step used **rembg**, which barely touched the photo — it left
  the white pedestals and background.
- **What I did:** I **benchmarked 6 removers on a real rosary photo** and measured each:
  - **BiRefNet — 1.8 s, keeps the full chain, crucifix and medal with texture → WINNER**
  - Grounded SAM — 78.9 s, whitens the crucifix
  - Bria RMBG 2.0 — 4.0 s, keeps the pedestals (doesn't isolate)
  - rembg — 8.4 s, isolates nothing
  - WithoutBG — falls back to rembg; remove.bg — HTTP 400
- **The nuance (say this):** *"Bria wins the general benchmark 90% to 85%, but it lost on my
  actual product. Edge quality depends on the image type, not the average ranking — so I chose
  by measuring on my real data, not by copying a leaderboard."*
- 💡 ES: esta frase — "elegí midiendo con mi dato real, no copiando un ranking" — es de nivel
  **data scientist.** Thiago va a valorar exactamente eso.

---

## ⭐ Composite-first, applied to jewelry

- **What broke:** Step 3 was **generating** the piece with Flux Kontext instead of compositing it
  — so the AI **redrew** the jewelry and changed it.
- **Fix:** packshot and luxury scene now **compose** the real cut-out pixels onto a background
  with Sharp. The piece never enters the image model for those steps.
- **Say:** *"Same rule as everywhere: never let the model redraw the product. For the two
  catalogue shots I compose the real pixels — only the on-model step, where the piece must
  physically adapt to a body, still uses generative placement."*

---

## Other good "attention to detail" fixes

- **Macro is real pixels, not AI.** A detail photo exists to *prove* the clasp and links are
  genuinely like that — an AI-generated macro would invent exactly the thing you're trying to
  prove. So the macro is a **Sharp crop** that finds the densest region of the piece (an
  integral-image heuristic, with Vision overriding the region when available). **Cost $0.**
- **The reel is ffmpeg, not a paid video model.** ffmpeg was already installed; a Ken-Burns +
  crossfade reel is **$0 and deterministic**, versus $0.05–0.35 and a different result every run
  from a generative video model.
- **Vision drives the type, not a dropdown.** Real inventory is **202 uncatalogued photos named
  by camera timestamp.** So the jewelry "type" is an **open string** from Claude Vision (it once
  returned `armband`, which was in no menu), reduced to a family by keywords — and the UI **marks
  in amber** anything it had to guess. Sub-types include rings, necklaces, earrings, studs, hoops,
  sets and even **rosary** (its own hanging-from-an-invisible-neck scene).
- **A quality gate that says "no."** After on-model, an `identity-check` compares the result to
  the original; if the piece changed (confidence > 0.6) the step turns **red, not "Done"** — it
  refuses to ship a wrong result.

💡 ES: el "quality gate" (compuerta de calidad) es clave — la app **rechaza sus propios malos
resultados** en vez de entregarlos. Eso es control sobre la IA.

---

## Bugs fixed — root causes (each is a clean story)

- **CUDA out-of-memory on upscale** → the pixel budget was computed on the **input** image, but
  the GPU blows up on the **output** tensor (2M input × scale 2 = 8M px ≈ 5.7 GiB). Fixed to
  budget the **output**, with retries, a Clarity fallback, and a `softFail` that returns the
  original instead of crashing the whole pipeline. *(Upscale is no longer a jewelry step, but the
  fix lives on in the module.)*
- **Topos, candongas and sets always failed (HTTP 400)** → the on-model route's `VALID_TYPES`
  list was missing `studs`, `hoops` and `set`. Hidden because necklace and ring passed. Added all.
- **A grey square under the jewel** → it wasn't Flux or a bad alpha; it was the piece's **own
  contact shadow**, painted as a full rectangle because the alpha mask wasn't clipping. Fixed the
  masking + reconstructed transparency the image proxy had flattened.
- **A necklace asked to pose *on a finger*** → the "scale" photo forced type `ring`, whose prompt
  says *put it on the finger*, so Kontext invented a ring. Fixed the **sub-type routing** so each
  piece goes to the right placement, and "held, not worn" is a separate instruction.
- **The reel could take down the carousel** → requesting both together timed out. Now the carousel
  ships and the step completes first; the reel is a separate, time-boxed call that can fail
  without breaking the gallery.
- **Cleaning erased the engraved label** → the clean step is scoped to text/price/watermark
  overlays only, the engraved text is a preserved Vision field, and an anti-duplication guard
  forbids dropping any element that was in the input.

**Say:** *"Jewelry taught me sub-type routing — a ring, a necklace and an earring need different
on-model placement — and reinforced composite-first: never let the model redraw the piece."*

---

## Honest limits (own these)

- **On-model can't be composited** — the piece has to bend to the body, so that step still relies
  on the prompt + the quality gate. Documented failure: an on-model run turned a beaded bracelet
  into a **watch** — the gate is there exactly for this.
- **Kontext can mirror/duplicate** — it once returned the rosary with two crucifixes. Mitigated by
  moving the catalogue shots to composition + an anti-duplication guard.
- **The ffmpeg reel is unverified on Windows/production** — the binary is Linux-ELF (correct for
  Vercel, not runnable on the Windows dev machine). It's treated as a droppable extra behind a
  time budget, so it never blocks the carousel.

💡 ES: reconocer estos límites **con la mitigación al lado** te hace ver honesta y madura, no
insegura. "El gate existe justo para ese caso" convierte una debilidad en una decisión de diseño.
