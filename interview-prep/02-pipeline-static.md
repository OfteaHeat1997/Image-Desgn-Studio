# 02 — STATIC PRODUCTS Pipeline (perfumes, creams, sunscreen…)

> **This is the pipeline you worked on deepest — it holds your best debugging stories.**
> Verified against the current code (`page.tsx`, `bg-generate.ts`, `upscale/route.ts`).

---

## What it does (say this)

> "You upload a raw product photo. The pipeline **restores it to HD**, removes the
> background, normalizes it to a 2000×2000 canvas, and then generates **four catalogue
> outputs** — a pure-white e-commerce shot, an adaptive styled background, a 4:5 hero for
> feeds, and a 9:16 vertical for Reels. Optionally it adds an upscale, a contact shadow, and
> a short lifestyle video. On every output, the **real product is composited on top** — never
> regenerated."

**The current flow (accurate):**

1. **Upload** + (in parallel, fire-and-forget) **Claude Vision** reads the product's features.
2. **Step 1 — Restore to HD** → **Real-ESRGAN** (faithful upscaler), runs *first*, on the raw photo.
3. **Step 2 — Remove background** → rembg (Replicate).
4. **Step 3 — Normalize** to a 2000×2000 canvas → **Sharp** (free).
5. **Step 4 — Four outputs, generated SEQUENTIALLY:**
   - ⬜ **White** e-commerce → pure `#FFFFFF` via **Sharp** (no AI, no watermark, marketplace-ready).
   - 🎨 **Adaptive** styled background → **Flux Schnell** makes the backdrop, Sharp composites the product.
   - 📸 **Hero 4:5** and 📱 **Vertical 9:16** → same, sharing one **seed** so the whole set looks cohesive.
6. **Optional (opt-in, run in parallel):** upscale (Clarity), contact shadow (Sharp), lifestyle video (wan-2.2-fast).

💡 ES: **son 4 salidas ahora, no 3** (el doc viejo decía 3). La 4ta es el "hero" 4:5. Si
alguien mira una nota vieja, tú sabes la verdad: 4.

---

## ⭐ Fix 1 — "The AI was inventing fake text on the labels" (YOUR BEST STORY)

- **What broke:** on a small source photo, the restore step turned the label into **fake,
  unreadable letters**.
- **Root cause:** Step 1 used **SUPIR**, a *generative* upscaler that **reconstructs** detail.
  On a tiny image there's no real detail to recover, so it **hallucinates** — great for faces
  and textures, **wrong for a product with text**.
- **Fix:** switched Step 1 to **Real-ESRGAN**, a *faithful* upscaler. It enlarges without
  inventing. Softer on a bad source, but the text stays **real**.
- **Say:** *"I learned to pick the model by the job, not by which looks sharper. The generative
  one looked crisper but invented the label — unacceptable for a catalogue. Faithful-but-soft
  beats sharp-but-fake."*
- 💡 ES: esta es tu MEJOR historia de "controlar la IA". Demuestra **criterio de ingeniería**.
  (Detalle honesto: SUPIR sigue existiendo como opción en el módulo, pero el pipeline usa
  Real-ESRGAN — fue una decisión, no un borrado.)

---

## ⭐ Fix 2 — "Ghost bottles kept appearing behind the product"

- **What broke:** the styled backgrounds showed 1–3 **extra perfume bottles** behind the real one.
- **Root cause:** the background model (**Flux Schnell**) **does not support negative prompts.**
  My prompt said *"no bottles, no products"* — and the model **reads the words and draws them.**
  The *"don't think of a pink elephant"* effect.
- **Fix:** removed every "bottle / product / photography" word and rewrote the prompts in **pure
  positive language** — *"abstract studio backdrop, empty set, negative space, flat surface."*
  I also strip the product description out of the background prompt entirely. Ghosts gone.
- **Say:** *"The model doesn't understand negation — naming the thing I didn't want is what made
  it appear. I rewrote the prompts to describe emptiness positively instead of forbidding things."*
- 💡 ES: es una historia de **entender cómo piensa el modelo**, no de fuerza bruta.

---

## Fix 3 — "Unable to extract URL" errors

- **What broke:** the adaptive/hero steps failed with a URL-parsing error.
- **Root cause:** my prompts had grown to ~1,000+ characters; Flux Schnell choked and returned
  a response shape the code couldn't parse.
- **Fix:** kept prompts short **and** added a **safety net** — if the extraction fails, it
  automatically **retries with just the first sentence** of the prompt.
- 💡 ES honesto: el "límite de 380 caracteres" es una *guía* de diseño; lo que de verdad salva
  la corrida es el **reintento automático con prompt corto**. Si preguntan a fondo, di eso — es
  más honesto y suena más senior ("defensive coding, a retry safety-net").

---

## Fix 4 — "The product floated in front of the pedestal"

- **What broke:** the product looked pasted *in front of* the scene, not standing *on* it.
- **Root cause:** the composite centred the product vertically, while the backgrounds had a
  *raised pedestal* — so the product landed below/in front of it.
- **Fix:** **anchored the product to the bottom** of the frame (a 10% bottom margin) and moved
  the backgrounds to **flat surfaces**. Now it sits on the surface.

---

## Fix 5 — "FUNCTION_INVOCATION_TIMEOUT" (nothing finished)

- **What broke:** the coloured outputs failed with a Vercel timeout.
- **Root cause:** the 4 outputs ran **in parallel**, all hitting the AI provider at once → it
  **rate-limited us (429)** → each call backed off and blew past Vercel's 300s limit.
- **Fix:** run the 4 outputs **sequentially**. Slightly slower, but no overload, no timeout.
- **Say:** *"Parallelism looked faster but tripped the provider's rate limit. Sequential was
  slower per run but actually finished — throughput beats theoretical speed when a shared quota
  is the bottleneck."*

---

## ⭐ Fix 6 — "FUNCTION_PAYLOAD_TOO_LARGE" (real infrastructure bug)

- **What broke:** the HD and shadow steps failed with *Request Entity Too Large*.
- **Root cause:** I'd raised output resolution to **2000px**. Images were passed between steps
  as a **base64 data URL (~3.7 MB)** — bigger than Vercel's request-body limit.
- **Fix:** upload each output to **Vercel Blob** (object storage) and pass a **~114-character
  URL** instead of the huge string. The request body went from **3.7 MB → 114 bytes.**
- **Say:** *"Raising quality created a payload bug. I moved images to object storage and passed
  URLs instead of inlining megabytes."*
- 💡 ES: esta demuestra **pensamiento de infraestructura real** (storage, límites de plataforma) —
  la que más impresiona a alguien técnico como Thiago.

---

## Fix 7 — Removed Photoroom

- **Why:** we were only on Photoroom's free *sandbox*, which **stamps a watermark** and doesn't
  restore quality. The white output now always uses **Sharp** — pure `#FFFFFF`, free, no watermark.
  HD comes from Step 1, not from Photoroom.
- **Say:** *"I dropped a dependency that added a watermark and no real value. Sharp gives a clean
  #FFFFFF for free — fewer moving parts, zero cost, marketplace-ready."*

---

## Fix 8 — Small but real UX

- **Dropdowns were white text on a white system menu** (invisible). One global CSS rule (dark
  option background) fixed it across **all 3 pipelines**.
- **Ported the polished Lingerie UI** to Static: brand-gold theme, a transparency **checkerboard**
  behind cut-outs, and a **before/after compare zoom** on every step.
- 💡 ES: menciona esto a I-Chun (la de UX). Un bug de contraste texto-sobre-texto y un
  comparador antes/después son detalles de **usabilidad** que a diseño le importan.

---

## ⭐ The honest limit you MUST be ready to explain (source resolution)

- Many catalogue thumbnails are **~145×145 px (2 KB)** — postage-stamp size.
- **You cannot create HD from that.** HD means *real detail the camera captured.* Enlarging a
  145px image just makes the blur bigger. The only two options — *faithful* (stays soft) or
  *generative* (invents fake detail) — and **neither creates real detail.**
- **Proven live:** the same code gave a **sharp result on a ~1200px photo** and a **mediocre
  one on a 145px photo.** Same pipeline — the difference is the *source.*
- **Say (own it, don't hide it):** *"The bottleneck isn't the pipeline, it's the input. With a
  1000px+ photo — even a phone photo — the output is HD. With a 145px web thumbnail, no tool on
  earth makes real HD without inventing. I chose faithful over fake, and I surface that limit to
  the user in the UI instead of hiding it."*
- 💡 ES: esta honestidad **te hace ver senior.** El código ya le avisa al usuario ("sube fotos
  de al menos 1000px") — o sea, no lo escondiste, lo diseñaste.
