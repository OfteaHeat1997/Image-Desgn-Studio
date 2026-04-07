# Project Rules — UniStudio

## Git Push Rule (MANDATORY)
- **ALWAYS commit and push to GitHub after every set of changes** — do not wait for the user to ask.
- After fixing bugs, adding features, or making any code modifications: `git add` → `git commit` → `git push origin main`.
- Never leave uncommitted changes at the end of a task.
- If you've been working for a while without pushing, push immediately.

## Build Rule (MANDATORY)
- **NEVER run `next build` on init or automatically** — it may already be running (e.g. Vercel, another terminal).
- Only run `next build` when the user explicitly asks to build.
- If you must build, first check for a lock file: `ls unistudio/.next/lock 2>/dev/null` — if it exists, do NOT build.

## Vercel Deployment
- After pushing to GitHub, redeploy to Vercel production: `cd unistudio && vercel --prod --yes`
- Live URL: https://unistudio.vercel.app

## Project Structure
- Next.js app is inside `unistudio/` subdirectory (not the repo root)
- All code changes happen in `unistudio/src/`
- Build command: `cd unistudio && npx next build`

## Language
- All user-facing text must be in Spanish
- Code comments can be in English

## Key Conventions
- Database is optional (null guards on all prisma usage)
- Flux Kontext Pro uses `input_image` parameter (NOT `image`)
- All API routes are in `unistudio/src/app/api/`
- 18 modules, 29 API routes, 9 pages
