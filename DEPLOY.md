# cordon.aifrontier.tech

Static site. Serve this folder as the web root; no build step on the host.

- `/` picks a language and redirects to `/ru/` or `/en/` (`route.js`).
- Text: edit `template.html` (Russian) and `locales/en.json` (English, keyed by the Russian text), then `python3 build-locales.py`.
- Scripts: `main.ts` → `app.js`, `route.ts` → `route.js` with esbuild (`--bundle --format=esm --target=es2022`).
- `shared/` holds the hero image, the mark, the fonts (with their licenses) and `social-preview.jpg`.
- Canonical and og URLs point to https://cordon.aifrontier.tech (set in `build-locales.py` and `template.html`).
- The demo shows decisions recorded from Cordon 0.11.0 (`scenarios.json`, `verified-results.json`, `reproduce.mjs`, `PROOF.md`); no agent runs on the page.
