# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Layout Quirk

The Next.js app lives in the `unistudio/` subdirectory — **not** the repo root. All code changes, commands, and relative paths below assume you are in `unistudio/` unless stated otherwise. The repo root only holds `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/`, and `scripts/`.

## Mandatory Rules

### Git push after every change
After any code modification (bug fix, feature, refactor): `git add` → `git commit` → `git push origin main`. Do not wait for the user to ask, and do not leave uncommitted changes at the end of a task.

### Build / deploy only when the machine is clear
Build and deploy are allowed, but NEVER start one while another is already running — that collides with Vercel or with another terminal and breaks. Before `next build` or `vercel --prod`, run these checks and abort if any is non-empty:

```bash
ls unistudio/.next/lock 2>/dev/null         # local build in progress
pgrep -af "next build"                       # other next build running
pgrep -af "vercel.*--prod|vercel.*deploy"    # other vercel deploy running
```

- If all three are clear → proceed.
- If any has output → stop and tell the user what's already running.
- On "init" or generic exploration, do NOT build — only build/deploy when the user explicitly asks.
- Deploys must run from the repo root (`vercel --prod --yes`). The repo-root `.vercelignore` keeps the upload under Vercel's 10MB limit.

### Language
All user-facing text must be in Spanish. Code comments can be in English.

### Track every request — never drop work on the floor
When the user asks for multiple things in a session, you MUST:

1. **Keep a running list** of every request made in the chat (not just the current message). Scan back through the conversation at the start of each turn to confirm nothing is lost.
2. **Before writing code**, reply with a concise status table — one row per request — with ✅ done / 🟡 in progress / ❌ pending / ❓ blocked (with the blocker). The user has said she feels work gets left behind; this table is the cure.
3. **At the end of each session**, post an honest recap: what was shipped, what was deployed, what's still pending, and for pending items the next concrete step. If a request is blocked (needs an error message, needs a design decision, needs external access), say so explicitly instead of silently skipping.
4. **Never say "done" for a request that was only partially delivered.** If you shipped the backend but not the UI, say so. If you shipped a fix but haven't tested it, say so.
5. **When a new deploy lands, update `CHANGELOG.md`** with a dated entry covering commits since the last entry (see the "Changelog + docs stay current" memory rule).

## Commands

Run from `unistudio/` unless noted.

```bash
# Dev
npm run dev                    # Next.js dev server on :3000
npm run lint                   # ESLint on src/
npm run lint:strict            # ESLint with --max-warnings 0
npm run lint:fix               # Auto-fix

# Tests
npm test                       # Jest unit tests
npm test -- path/to/file.test.ts    # Single test file
npm test -- -t "test name"          # Single test by name
npm run test:coverage          # Unit tests + coverage
npm run test:integration       # Jest with jest.integration.config.ts
npm run test:e2e               # Playwright (e2e/ folder)
npm run test:e2e:ui            # Playwright UI mode
npm run test:all               # integration + e2e

# DB (Prisma 7, PostgreSQL)
npm run db:migrate             # prisma migrate dev
npm run db:push                # prisma db push (first-time / schema sync)
npm run db:studio              # Prisma Studio

# Docker (local BG-removal service, optional)
npm run docker:up / docker:down

# Smoke test against production
npm run smoke-test             # Hits https://unistudio.vercel.app

# Build (DO NOT run unless user asks — see Mandatory Rules)
npx next build
```

Health check: after `npm run dev`, hit `http://localhost:3000/api/health` to verify connected providers.

## Architecture

### High-Level Shape

Next.js 16 App Router app. UI pages in `src/app/*/page.tsx`, backend in `src/app/api/*/route.ts` (29 routes). No auth — single-user by design. PostgreSQL is **optional**: every Prisma call must be null-guarded because `DATABASE_URL` may be unset. The app is a unified replacement for several SaaS image/video tools; each of the 18 modules wraps one or more external AI providers.

### Request Flow

```
Page/Module Panel (src/components/modules/*)
  → hook (src/hooks/* — e.g. useAgentPipeline, useProcessingState)
  → fetch() to /api/<module>
  → route.ts handler
  → src/lib/processing/<module>.ts (business logic + validation)
  → src/lib/api/<provider>.ts (replicate/fal/fashn/withoutbg)
  → response → optional save via src/lib/db/ → update Zustand store (src/stores/)
```

The four provider clients (`fal.ts`, `replicate.ts`, `fashn.ts`, `withoutbg.ts`) are the only place that reads API keys from env, and each one calls `.trim()` on the key — trailing `\n` from `vercel env pull` previously caused 401s, so preserve the trim.

### Vercel Timeouts

Long-running routes have per-route `maxDuration` in `vercel.json`. When adding a new slow route (anything invoking video/avatar/model generation), register it there or it will time out at Vercel's 60s default. Current entries: `video`, `avatar`, `model-create`, `tryon`, `ad-create`, `batch` → 300s; `upscale` → 120s.

### AI Model Identifiers

Claude model IDs are centralized in `src/lib/utils/constants.ts` (`CLAUDE_HAIKU`, `CLAUDE_SONNET`). Do not hard-code them in route files — update constants.ts when model versions change.

### State

Six Zustand stores in `src/stores/`. Three persist to `localStorage`. `brand-store` uses `partialize` to exclude base64 payloads from persistence (localStorage quota). `gallery-store.addImage` is sync; thumbnail generation is async — don't re-introduce the race condition. `video-store` wraps localStorage writes to swallow `QuotaExceededError`.

### AI Agent (Module 18)

`src/hooks/useAgentPipeline.ts` (~800 lines) is the agent execution engine. Pipeline: Upload → Auto Analysis (Sharp + Claude Vision via `/api/analyze-image`) → Planning (Claude Haiku via `/api/ai-agent/plan`) → Plan Editor → Parallel Execution → Quality Validation → Results. Independent steps (e.g. bg-remove + model-create) run in parallel.

### Global Error Handling & Toast

Global error boundary lives at `src/app/error.tsx` + `global-error.tsx`. All 13 module panels emit toasts via `use-toast.ts` (Zustand-based). Memory leaks from blob URLs are a recurring issue — revoke them in cleanup effects (`useAgentPipeline`, `UpscalePanel`, `EnhancePanel` already do this; match the pattern).

## Provider-Specific Gotchas

These are non-obvious and have bitten us before — preserve them exactly:

- **Flux Kontext Pro**: uses `input_image` parameter (NOT `image`). Does NOT support `output_format` — do not pass it (jewelry, shadows).
- **Replicate community models**: must include the version hash `owner/name:sha256…`. Official models use plain `owner/name`.
- **wan-2.1**: has NO `num_frames`, uses `aspect_ratio` instead.
- **wan-2.2-fast**: requires `num_frames >= 81`, `guidance_scale: 3.0`, and `negative_prompt` to prevent product duplication.
- **Inpaint (flux-fill-pro/dev)**: `negative_prompt` must be passed through to the API call (it was previously computed but dropped).
- **Upscale (Clarity)**: `resemblance: 0.85`, `creativity: 0.25`; use `replicateUrl` helper for model references.
- **Avatar**: validate script length, provider, and TTS provider at the route boundary before calling fal.
- **Video results**: save to gallery via the URL flow (not `toPersistentThumbnail`, which fails on `.mp4`).

## Deployment

`main` auto-deploys to Vercel at https://unistudio.vercel.app. The user handles deploys themselves — see Mandatory Rules.

## Useful Reference Docs

- `docs/architecture.md` — full API route + DB schema reference
- `docs/guia-completa.md` — Spanish walkthrough
- `docs/ai-agent-analysis.md` — agent design + roadmap
- `docs/inventory.md` — Unistyles product catalog (486 products)
