# Production Dockerfile for Coolify (and any Docker host).
# Multi-stage build: install deps -> build Next.js -> run with `next start`.
# We keep the full node_modules in the runner (instead of Next standalone)
# because this app ships native deps — sharp, ffmpeg-static, the Prisma query
# engine, and the @imgly/background-removal WASM — that are most reliable when
# their real files are present. Image is larger but deployments don't break.
#
# For local hot-reload development use Dockerfile.dev (see docker-compose.yml).

# ---- Base ----
FROM node:22-slim AS base
# openssl is required by the Prisma query engine at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
# prisma schema must be present before `npm ci` because the postinstall hook
# runs `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A dummy DATABASE_URL lets `prisma generate` and `next build` run without a
# live database. Real values are injected at runtime by Coolify.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
# Next.js binds to 0.0.0.0:3000 inside the container; Coolify maps it.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
