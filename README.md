# Sautify — Marketing Website & Attribution Prototype

Kenya's infrastructure for music royalty attribution. This repo holds the public marketing site (React + Vite + Tailwind CSS) plus a working prototype of the Kenya-specific attribution layer as Netlify Functions:

- **Tamper-evident ledger** (`/api/ledger`, `/api/ledger/evidence`): hash-chained, append-only evidence batches with NRR-compatible cross-check fields (Supabase + Netlify Blobs).
- **Gazetted tariff engine** (`/api/tariff`): computes the applicable KECOBO Consolidated Tariff from user category (broadcaster, venue, PSV, telco) + class, with proration and the mandated 70/30 artist/admin split. Figures are indicative pending line-by-line verification against the Kenya Gazette schedule — every response says so via `scheduleStatus`.
- **Settlement simulation** (`/api/ledger/:id/settle`): demo eCitizen-style settlement using tariff-derived invoice amounts and 70/30 distribution fields.

Calls-to-action on the site use `mailto:` links.

## Tests

```bash
npm test
```

Runs the `node --test` suite (auto-discovers `tests/`; currently covers the tariff engine).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default [http://localhost:5173](http://localhost:5173)).

## Build for production

```bash
npm run build
```

Static output is written to `dist/`. Preview it locally with `npm run preview`.

## Deploy to Netlify

**Option A — Connect the GitHub repo (recommended)**

1. Push this project to GitHub.
2. In Netlify: **Add new site → Import an existing project**, then pick the repo.
3. Netlify reads `netlify.toml` automatically — build command `npm run build`, publish directory `dist`. No manual config needed.
4. Click **Deploy site**.

**Option B — Drag and drop**

1. Run `npm run build` locally.
2. Drag the generated `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).

The included `netlify.toml` also adds an SPA redirect (`/* → /index.html`) so client-side routes never 404 on refresh.

## Stack

- React 18 + Vite
- Tailwind CSS
- Zero backend — every CTA opens a pre-filled `mailto:` to `hamed.nalle@sautify.com`

## SEO

Canonical URL, robots meta, OG/Twitter tags, and Organization JSON-LD are set in `index.html` for `https://sautify.co.ke/`. `public/robots.txt` and `public/sitemap.xml` are included for Google Search Console submission — update the domain in both if it ever changes.

## License

All Rights Reserved. See [LICENSE](./LICENSE). This is proprietary code, not open source.

## Contact

hamed.nalle@sautify.com
