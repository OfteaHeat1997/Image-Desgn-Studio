# UniStudio — Developer Setup

## Quick Start

```bash
npm install
cp .env.example .env.local   # Add your API keys
npx prisma generate
npx prisma db push           # First time only
npm run dev                   # http://localhost:3000
```

After starting, visit `http://localhost:3000/api/health` to verify all services.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REPLICATE_API_TOKEN` | Yes | Image processing (Replicate) |
| `FAL_KEY` | Yes | Video generation (fal.ai) |
| `ANTHROPIC_API_KEY` | Optional | AI agent planning (Claude Haiku) |
| `FASHN_API_KEY` | Optional | Premium virtual try-on |
| `HEDRA_API_KEY` | Optional | Premium avatar generation |
| `GOOGLE_TTS_KEY` | Optional | Google Cloud TTS |
| `WITHOUTBG_URL` | Optional | Self-hosted BG removal Docker |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis caching |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token |
| `CLOUDFLARE_R2_*` | Optional | R2 object storage (5 vars) |

## Build & Deploy

```bash
npx next build                # Production build
vercel --prod --yes           # Deploy to Vercel
```

Live URL: https://unistudio.vercel.app

## Important Notes (Apr 2026)

- **Vercel timeouts**: `vercel.json` configured per-route — video/avatar/tryon get 300s, others 60s
- **API keys**: All API clients use `.trim()` — safe against trailing whitespace from `vercel env pull`
- **Error handling**: Global error boundary + toast on all 13 module panels
- **Claude models**: Centralized in `src/lib/utils/constants.ts` — update `CLAUDE_HAIKU`/`CLAUDE_SONNET` when new versions release

## Documentation

For detailed docs, see the [`docs/`](../docs/) folder:

| Document | Description |
|---|---|
| [Architecture & API Reference](../docs/architecture.md) | Project structure, 29 API routes, DB schema, video system, key patterns |
| [Guia Completa (ES)](../docs/guia-completa.md) | Beginner-friendly guide in Spanish — data flow, patterns, testing |
| [AI Agent Analysis](../docs/ai-agent-analysis.md) | Deep analysis + improvement roadmap (Phase 1+2 complete) |
| [Product Inventory](../docs/inventory.md) | Complete Unistyles product catalog (486 products, 9 categories) |
