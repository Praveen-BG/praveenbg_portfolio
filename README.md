# Praveen BG portfolio with Ask Praveen

Static portfolio and deterministic FAQ assistant. The chatbot uses approved local data, records no visitor details or transcripts, and requires no AI key or database.

## Project structure

- `dist/` — authoritative static website source and deployment output.
- `dist/index.html` — homepage.
- `dist/explore-work.html` — selected-work case studies; direct refresh is supported.
- `dist/deskbuddy.html`, `dist/atom-desktop.html`, `dist/gain-credit.html`, `dist/idp.html`, and `dist/matrimony.html` — dedicated case-study pages.
- `dist/assets/` — local JavaScript, CSS, and image assets.
- `dist/data/portfolio-faq.json` — approved chatbot questions and answers.
- `server.mjs` and `server/` — local preview server and disabled API compatibility responses.
- `tests/` — FAQ, preference, and local HTTP integration checks.

This is intentionally a buildless site. `npm run build` validates the authoritative `dist/` tree rather than generating a second copy.

## Local development

Requires Node.js 20 or newer.

```bash
npm run dev
```

Open <http://127.0.0.1:4173/>.

## Production checks

```bash
npm run build
npm test
```

The build validates FAQ integrity, every page entry point, and referenced local assets.

## Ask Praveen

- Button questions retrieve approved answers by FAQ ID.
- Typed questions use deterministic local matching.
- Unsupported questions receive an honest fallback.
- No visitor name, company, consent, saving, analytics, or transcript recording flow is active.
- Basic chatbot behavior has no external service dependency.

## Motion and interaction sound

`dist/assets/experience-preferences.js` owns one saved Motion and Sound state for both pages and the chatbot. It respects reduced-motion on a first visit, allows an explicit saved override, unlocks Web Audio only after deliberate interaction, and immediately stops active or queued sound when switched off.

## Atom Private Search Mode AI prototype

The Atom case study works without an AI key. `POST /api/atom-ai` returns a labeled **Quick explanation** when no key is configured or the model is unavailable. With `OPENAI_API_KEY`, the server sends only the submitted question, simulated setting state, and reviewed product facts to the OpenAI Responses API. Raw questions are not written to storage or analytics.

Local setup:

```bash
cp .env.example .env
# Add OPENAI_API_KEY to .env, then run:
npm run dev
```

`ATOM_AI_MODEL` is an optional model override; its default is `gpt-5-mini`.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact GitHub/Vercel settings. The core portfolio and deterministic FAQ require no environment variables. A live Atom AI explanation uses the optional Vercel Function variables documented there.

Do not put secrets in `dist/`, browser storage, screenshots, or client-side JavaScript. `.env`, `.data/`, `node_modules/`, `.vercel/`, and common development environments are ignored by Git.
