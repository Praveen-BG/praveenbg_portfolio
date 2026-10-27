# GitHub and Vercel deployment

This is a buildless static portfolio. Files in `dist/` are the authoritative website source and the deployable output. `npm run build` validates the FAQ dataset, both HTML entry points, and every referenced local asset; it does not rewrite `dist/`.

## Vercel project settings

- Framework Preset: **Other**
- Root Directory: **`.`** (repository root)
- Build Command: **`npm run build`**
- Output Directory: **`dist`**
- Install Command: Vercel default (`npm install`); the project currently has no runtime dependencies.

No environment variables are required for the static portfolio or deterministic Ask Praveen FAQ.

## Optional local server configuration

The Node development server is not part of the static Vercel output. It recognises these optional local-only names:

- `PORT`
- `CHAT_STORAGE`
- `CHAT_RETENTION_DAYS`
- `CHAT_RATE_LIMIT_PER_MINUTE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASK_PRAVEEN_AI_ENABLED`

Chat recording and live AI endpoints are intentionally disabled in the current application. Supabase is therefore not required. Deploying a future backend would require a separately configured Vercel Function or another server runtime; never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Pre-push checks

```bash
npm run build
npm test
```

Secrets, local environment files, dependencies, Vercel state, editor environments, and `.data/chat-records.json` are excluded by `.gitignore`.
