# Resume Generator

A multilingual resume builder. Pick a language and a template, then watch your CV
render live as you type. Optional AI polishing rewrites your entries with stronger
phrasing (requires a backend — see note below).

## Run locally (2 minutes)

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Features

- Language picker (EN / FR / ES / AR / DE) — drives UI labels, generated content, and RTL for Arabic
- 5 templates: Classic, Modern, Minimal, Bold, Elegant
- Live preview that updates as you type
- Copy-to-clipboard
- "Generate" AI polish button (see note)

## Note on the AI "Generate" button

The AI polish calls the Anthropic API. Running locally or on static hosting (GitHub
Pages), there is no API key available, so the button gracefully falls back to showing
your raw entries. To make it work for real:

1. Add a small serverless function (Vercel / Netlify / Cloudflare Workers) that holds
   your `ANTHROPIC_API_KEY` as a secret and forwards the request.
2. Point the `fetch` in `src/ResumeGenerator.jsx` at that function instead of
   `https://api.anthropic.com/v1/messages`.

Never put your API key in front-end code — it would be public.

## Deploy to GitHub Pages

```bash
npm run build
# commit the project, then either:
#  - use the GitHub Actions Pages workflow, or
#  - push the dist/ folder to a gh-pages branch
```

`vite.config.js` already sets `base: "./"` so assets resolve correctly on Pages.
