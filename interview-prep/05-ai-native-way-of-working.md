# 05 — Your "AI-Native Way of Working" (Part 2 of the interview)

> TomTom explicitly wants to see **how you work with AI.** The good news: **this project IS the
> proof.** You didn't read about AI-assisted development — you *did* it, on a real product, and
> stayed in control. Tell it in the **first person**: *"I found… I decided… I rejected… I verified…"*

---

## The one message they should walk away with

> "I work with AI as a **pair-programmer**, but I stay the **engineer**. The AI writes faster;
> **I decide what's correct.** I read the real output, I question its first answer, I reject
> fixes that look right but aren't, and I own the trade-offs."

💡 ES: esta es LA frase. Si te preguntan "¿cómo trabajas con IA?", empieza aquí.

---

## The loop you ran hundreds of times (this is your method)

Describe it as a repeatable loop — that's what makes it a *way of working*, not luck:

1. **Observe the real output.** Not the logs — the actual images. "Is that a fake label? Is there
   a second bottle behind the real one?"
2. **Diagnose *with* the AI, but direct it.** "This isn't the image, it's the code." "SUPIR is
   inventing text." "Why does Flux add bottles even when I say 'no bottles'?"
3. **Reject wrong fixes.** ⭐ This is the most important one. When a fix caused a grey box, or when
   the AI blamed my source photos but the real bug was a **payload limit**, I **pushed back** and
   we found the true cause.
4. **Test — a lot.** Same product, many runs. Before/after side by side. I only accepted a fix
   when I *saw* it work, on real inventory (a rosary, 8 real products, a nude bra).
5. **Decide the trade-offs.** Faithful over fake. Correctness over speed. Remove Photoroom.
   Composition over generation. These were *my* calls.
6. **Keep the docs in sync.** Every change was documented in the CHANGELOG in the same commit.

💡 ES: el paso **#3 (rechazar fixes)** es el que más impresiona. Prueba que no eres copia-pega —
que **entiendes** y que la IA no te manda a ti, tú la mandas a ella.

---

## Concrete moments where YOU were in control (use 2–3 of these)

- **"The AI blamed my photos; the real bug was infrastructure."** When outputs failed, the easy
  answer was "your source images are bad." I checked and found a **`FUNCTION_PAYLOAD_TOO_LARGE`**
  — a 3.7 MB base64 string exceeding Vercel's request limit. I moved images to object storage. *The
  AI's first explanation was wrong; I verified against the real error.*
- **"The fix that looked sharper was actually inventing."** A generative upscaler produced a
  crisper image — but it **hallucinated the label text.** I rejected it for the faithful model.
  *Sharper ≠ correct.*
- **"Naming the problem caused the problem."** I told the model "no bottles" and it drew bottles.
  I recognized the negation limitation and rewrote the prompts positively. *I understood the
  model's behavior instead of fighting it.*
- **"I measured instead of guessing."** For background removal I **benchmarked 6 tools on my real
  product** and picked the one that won *on my data* — even though it loses the general ranking.
- **"I built a gate that rejects the AI's own bad output."** The jewelry pipeline runs an
  identity-check and turns a step **red** if the AI changed the product. *The system refuses to
  ship a wrong result.*

---

## How to talk about the AI tools themselves (if asked)

- **Be honest and specific:** *"I used an AI coding agent (Claude Code) as a pair-programmer — it
  proposed code and explanations fast. My job was to feed it the real evidence (the actual output
  images, the exact error strings), challenge its first hypothesis, and decide the trade-offs. The
  best example is when it wanted to blame my inputs and I traced it to a platform payload limit."*
- **The framing that lands:** AI made me **faster at writing**, but the **judgment stayed mine** —
  which model to trust, what "correct" means for a catalogue, when to reject a plausible fix.
- 💡 ES: no digas "la IA hizo el proyecto". Di "la IA escribió rápido; **yo decidí qué era
  correcto**". Esa distinción es TODO lo que ellos quieren oír.

---

## Why this is exactly what an "AI-native" company wants

TomTom is putting AI into its products (a TomTom **AI Agent**, an **MCP server** for feeding live
map data to AI agents). They want people who can **build on top of imperfect AI models and stay in
control of correctness** — orchestrate providers, handle non-determinism, verify outputs, own
trade-offs. That is *literally* what you did across 486 products and 3 pipelines.

> "AI-native, to me, isn't 'let the model do it.' It's building a system *around* imperfect models
> so the output is reliable anyway — composite the real product so the AI can't ruin it, gate the
> results, pick providers by measured correctness, and keep a human decision at every trade-off."
