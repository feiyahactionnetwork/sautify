# Sautify — working notes for Claude Code

## Sensitive-content isolation (do not remove)

Sensitive internal docs live in `../sautify-internal-DO-NOT-SHARE/` — never read,
reference, quote, or recreate their content inside `/demo-app`, `/demo-server`,
code comments, commit messages, or any client-facing output for this project.

At isolation time (2026-07-20) this clone contained no such files; the directory
exists as a tripwire and as the designated home for any internal doc that appears
later (due-diligence notes, profitability models, compliance-risk research,
internal runbooks, real `.env` files).

## Claims compliance (blocking, applies to all demo work)

- Keep the persistent "Live demo · simulated data" badge and full footer disclaimer.
- Only real ACRCloud matches may ever be labeled "real".
- Forbidden phrasing anywhere on screen: "integrated with the NRR/eCitizen",
  "KECOBO-approved", "official", "partnered with PAVRISK/KAMP/KECOBO".
- Allowed: "NRR-compatible", "built for eCitizen reconciliation",
  "designed around published CMO licence conditions".
- Never invent new KSh tariff figures; reuse only figures already in public site copy.
- Never commit `.env`.
