# GitHub and Vercel deployment

This is a buildless static portfolio. Files in `dist/` are the authoritative website source and the deployable output. `npm run build` validates the FAQ dataset, both HTML entry points, and every referenced local asset; it does not rewrite `dist/`.

## Vercel project settings

- Framework Preset: **Other**
- Root Directory: **`.`** (repository root)
- Build Command: **`npm run build`**
- Output Directory: **`dist`**
- Install Command: Vercel default (`npm install`); the project currently has no runtime dependencies.

No environment variables are required for the static portfolio, deterministic Ask Praveen FAQ, or the Atom prototype's fixed fallback.

## Optional Atom AI endpoint

The repository includes `api/atom-ai.mjs`, which Vercel deploys as a serverless function at `/api/atom-ai`.

- `OPENAI_API_KEY` — optional but required for a live model response. Configure it as a server-side Vercel environment variable. Never use a `VITE_`, `NEXT_PUBLIC_`, or other browser-exposed prefix.
- `ATOM_AI_MODEL` — optional model override. The default is `gpt-5-mini`.

For local testing, copy `.env.example` to `.env` and add the key. The local preview server reads `.env`; `.env` is ignored by Git. When the key is missing, blocked, or the request fails, the UI returns a labeled **Quick explanation** and the preview/apply/reset flow remains available.

The endpoint accepts at most 320 question characters, rate-limits requests, sets `store: false`, and sends only the simulated Private Mode state, selected provider, submitted question, and reviewed product facts. It does not receive browser history or search queries and does not write raw questions to portfolio storage.

## Optional local server configuration

The Node development server is not part of the static Vercel output. It recognises these optional local-only names:

- `PORT`
- `CHAT_STORAGE`
- `CHAT_RETENTION_DAYS`
- `CHAT_RATE_LIMIT_PER_MINUTE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASK_PRAVEEN_AI_ENABLED`

Chat recording and live AI remain disabled for Ask Praveen. The Atom Vercel Function is separate and does not require Supabase. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to browser code.

## Pre-push checks

```bash
npm run build
npm test
```

Secrets, local environment files, dependencies, Vercel state, editor environments, and `.data/chat-records.json` are excluded by `.gitignore`.
