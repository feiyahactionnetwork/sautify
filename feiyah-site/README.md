# Feiyah Action Network homepage

Static site for feiyahactionnetwork.com, built for Netlify hosting. Plain HTML,
compiled Tailwind CSS, and a small vanilla JS file. No framework, no build step
required to serve it.

## Structure

- `index.html` - the homepage
- `transparency.html` - financial transparency page (linked from the donation module)
- `thanks.html` - form success page (Netlify Forms redirect target)
- `css/styles.css` - compiled Tailwind output (committed, so the site deploys even without a build)
- `js/main.js` - scroll reveal, donation module UI, mobile sticky donate bar
- `src/input.css` + `tailwind.config.js` - Tailwind source

## Deploying

Create a Netlify site from this repo with the **base directory set to
`feiyah-site`** so the `netlify.toml` in this folder applies. The build command
recompiles the CSS; the publish directory is this folder itself.

## Editing styles

```
npm install
npm run build     # or: npm run watch
```

Commit the regenerated `css/styles.css` together with your HTML changes.

## Before launch: placeholders to replace

Search the HTML for `data-placeholder` and `TODO`. Every item below must be
filled in with real information supplied by FAN before the site goes live:

1. **Impact figures** (`index.html`, impact section): girls reached, cases
   prevented, communities covered are `X` placeholders.
2. **Registration number** (`index.html` donation trust box and
   `transparency.html`): insert the CBO registration number and registering
   authority.
3. **Annual report / budget summary** (`transparency.html`): link the real
   documents.
4. **Partner logos** (`index.html`, partners section): replace text lockups
   with official logo files once permission is confirmed.
5. **Founder passage** (`index.html`, impact section): offer Rose the chance
   to replace it with a direct quote in her own words.
6. **Donation tier impact statements** (`index.html`, donation module):
   confirm each statement with the program team.
7. **og:image** (`index.html` head): add a 1200x630 photo when available.

## Donation module

UI only. The submit handler in `js/main.js` (`handleDonationSubmit`) is a stub.
When a payment processor (Stripe or Donorbox) is confirmed, wire it through a
Netlify Function so secret keys stay server side. The donation form must never
use Netlify Forms attributes; only the newsletter and contact forms use
`data-netlify="true"`.
