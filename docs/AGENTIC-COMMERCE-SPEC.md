# Sautify Agentic Commerce — x402 Specification

**Status:** design + reference implementation (this branch)
**Scope:** make Sautify's compliance-data endpoints purchasable by AI agents, per call, without a human in the loop.
**Default posture:** testnet. Mainnet is an environment-variable flip, gated on the legal review in §7.

---

## 1. Why this exists, and what is actually real

Cloudflare announced *Cloudflare Wallets* and `cloudflare.pay` on 4 August 2026. Read the
announcement carefully and almost every capability is future tense. As of today:

| Capability | Status |
| --- | --- |
| Reserving a `cloudflare.pay` handle | **Live** |
| Account Wallet funding / on-ramp | Announced, not shipped |
| Virtual Wallets + API keys for agents | Announced, not shipped |
| Spending policies (allowance, allowlist, max tx) | Announced, not shipped |
| Monetization Gateway (seller side) | Announced, not shipped |

**There is no Cloudflare Wallets API to build against.** Anything we ship that depends on one
would be vapour.

What *is* real is the protocol underneath: **x402**. It is an open standard (originally Coinbase,
now stewarded by the x402 Foundation), it has processed ~119M transactions on Base and ~35M on
Solana, it charges zero protocol fees, and it has working server middleware and a public test
facilitator today.

So the design rule for this whole workstream:

> Build on **x402**, the open protocol. Treat Cloudflare Wallets as *one future client* of that
> protocol, not as a dependency. If Cloudflare ships as described, our endpoints already accept
> their agents' payments on day one, with no code change.

This also keeps us honest under the claims rules in `CLAUDE.md`: we are **x402-compatible**. We are
not "partnered with Cloudflare", not "integrated with Cloudflare Wallets", and must never say so.

### 1.1 Which side of the market we are on

The Cloudflare post is written for *buyers* — agents spending money. Sautify's commercial
opportunity is the **opposite side**. We already produce exactly the kind of narrow, verifiable,
machine-readable data that an agent would pay cents for and that is annoying to obtain any other
way: fingerprint matches, evidence records, DDEX-DSR exports.

We build both sides in this repo, but for different reasons:

- **Seller side — the product.** Revenue. Runs in front of our Netlify functions.
- **Buyer side — the proof.** A reference agent that pays our own endpoints, demonstrating the
  guardrail model end to end. Also the thing we demo to CMOs and investors.

---

## 2. Protocol reference (x402)

The full exchange is four HTTP messages. No accounts, no API keys, no OAuth.

```
1. GET /api/catalog/match                          →  402 Payment Required
                                                       { x402Version, accepts[], error }

2. (agent signs an EIP-3009 transferWithAuthorization off-chain — gasless)

3. GET /api/catalog/match                          →  200 OK
   X-PAYMENT: base64(PaymentPayload)                   X-PAYMENT-RESPONSE: base64({ txHash, ... })
```

### 2.1 The 402 response body

```jsonc
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",              // fixed price; "upto" exists for metered use
      "network": "base-sepolia",      // or "base" on mainnet
      "maxAmountRequired": "2000",    // BASE UNITS. USDC has 6dp → 2000 = $0.002
      "resource": "https://sautify.co.ke/api/catalog/match",
      "description": "Fingerprint match against the Sautify reference catalogue",
      "mimeType": "application/json",
      "payTo": "0x…",                 // our receiving address
      "maxTimeoutSeconds": 300,
      "asset": "0x036CbD…",           // USDC contract on the chosen network
      "extra": { "name": "USDC", "version": "2" }
    }
  ],
  "error": "X-PAYMENT header is required"
}
```

`accepts` is an **array** — we may offer the same resource on several networks or assets and let
the agent pick. That is the extension point for a future M-Pesa-denominated rail (§6).

### 2.2 The `X-PAYMENT` header

Base64 of:

```jsonc
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-sepolia",
  "payload": {
    "signature": "0x…",              // 65-byte EIP-3009 signature
    "authorization": {
      "from":        "0x…",          // agent wallet
      "to":          "0x…",          // must equal payTo
      "value":       "2000",         // must be ≥ maxAmountRequired
      "validAfter":  "0",
      "validBefore": "1786290000",   // expiry
      "nonce":       "0x…32 bytes"   // replay prevention
    }
  }
}
```

The `resource` URL is bound into what the agent signs, which is what stops a payment for a cheap
endpoint being replayed against an expensive one.

### 2.3 Verification and settlement

**We never verify signatures ourselves.** The facilitator does. This is the single most important
implementation fact, because it means *the seller side needs no crypto library and holds no keys*:

| Call | Body | Returns |
| --- | --- | --- |
| `POST {facilitator}/verify` | `{ x402Version, paymentPayload, paymentRequirements }` | `{ isValid, invalidReason }` |
| `POST {facilitator}/settle` | same | `{ success, transaction, network, payer }` |

The facilitator checks signature recovery, balance, nonce reuse, expiry, and that the payment
matches the requirements — then broadcasts `transferWithAuthorization` and returns the tx hash.

Order of operations matters: **verify → do the work → settle.** Settling before we have produced
the answer means charging for a response we might fail to generate. Verifying binds the funds
without moving them, so the agent is protected too.

Public test facilitator: `https://x402.org/facilitator` (Base Sepolia, Solana devnet).

---

## 3. Resource catalogue and pricing

Prices are set in **USDC** because that is what the protocol settles in. The KSh column is a
**display-only conversion at a stated reference rate**, not a tariff.

**Reference rate: KSh 135.00 = 1 USDC** (`SAUTIFY_KES_PER_USDC`, configurable).

| Endpoint | Method | Price (USDC) | KSh at 135 | Rationale |
| --- | --- | --- | --- | --- |
| `/api/catalog/match` | POST | $0.002 | KSh 0.27 | High volume, cheap per call — the "try it" endpoint |
| `/api/ledger` | GET | $0.005 | KSh 0.68 | Aggregated evidence query |
| `/api/ledger/:id/export.dsr` | GET | $0.050 | KSh 6.75 | The valuable artefact: a settlement-grade DDEX-DSR file |
| `/api/evidence` | POST | — | — | **Write path. Stays authenticated, never x402.** |

Three deliberate choices:

1. **`submit-evidence` is never payable.** Letting anonymous agents write into the evidence chain
   for money would destroy the integrity property that is the entire product. Payment buys reads.
2. **`export.dsr` is priced ~25× the match endpoint.** The match is a commodity lookup; the DSR
   export is the regulated-format artefact a CMO would otherwise pay a consultant to assemble.
3. **KSh figures here are pure FX arithmetic on new USD prices.** They are not, and must not be
   presented as, licence tariffs. The published KECOBO tariff figures used elsewhere in the site
   copy are a separate thing and are not touched by this document.

### 3.1 On the reference rate

KSh 135/USDC is a **commercial reference rate we set**, not a live oracle price. It is deliberately
conservative relative to recent KES/USD levels so that FX drift works in our favour rather than
against us between quote and settlement.

It lives in exactly one place (`_shared/pricing.js`) and is always rendered with the rate stated
inline — "KSh 0.27 (at KSh 135.00/USDC)" — so it can never be mistaken for a fixed price in
shillings. If we ever want a live rate, replace the constant with an oracle read; nothing else
changes.

---

## 4. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  BUYER  (agent/)            │         │  SELLER  (netlify/functions) │
│                             │         │                              │
│  VirtualWallet              │  402    │  withX402(handler, resource) │
│   ├ allowance               │ ──────► │   ├ build 402 envelope       │
│   ├ allowlist               │         │   ├ decode X-PAYMENT         │
│   ├ maxTransaction          │ X-PAY   │   ├ facilitator /verify      │
│   └ spend ledger            │ ──────► │   ├ run wrapped handler      │
│                             │         │   └ facilitator /settle      │
│  signs EIP-3009 (viem)      │ ◄────── │       → X-PAYMENT-RESPONSE   │
└─────────────────────────────┘  200    └──────────────────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │   facilitator   │
                                              │ verify + settle │
                                              └─────────────────┘
```

### 4.1 Seller: `netlify/functions/_shared/x402.js`

A `withX402(handler, { resource })` wrapper. Zero dependencies — `fetch` and `Buffer` only.

Design constraints:

- **Fail open on config, closed on payment.** If x402 is not configured (no `payTo`), the wrapper
  is a pass-through and the endpoints behave exactly as they do today. This keeps the existing
  demo working and means merging this branch changes nothing until it is switched on.
- **Never hold keys.** The seller holds a *receiving address*. There is no private key anywhere in
  the seller path, so a compromise of our Netlify environment cannot drain anything.
- **Settlement failure must not fail the response** once work is done and verified — log it, return
  the answer. The verify step is what protects us; a settle retry is an operational concern, not a
  reason to deny a paid-for answer.

### 4.2 Buyer: `agent/`

`VirtualWallet` implements the three guardrails Cloudflare describes, because they are the right
model regardless of who ships them:

| Guardrail | Meaning |
| --- | --- |
| `allowanceUsdc` | Total spend ceiling for the wallet's lifetime/period |
| `allowlist` | Hostnames (or exact resources) the agent may pay |
| `maxTransactionUsdc` | Per-call ceiling — blocks a single catastrophic payment |

Every decision is recorded in an append-only spend ledger with a reason, so an operator can answer
"what did my agent buy and why was this blocked" without instrumenting anything else.

The guardrail check runs **before** signing. An over-budget payment is never signed, so it can
never be broadcast even if the transport is compromised.

---

## 5. Agent identity

Cloudflare's `research.example.cloudflare.pay` idea is a human-readable alias for a keypair —
explicitly analogous to DNS. We support the *concept* without depending on their implementation:

- Agents MAY send `X-Agent-Handle: <handle>` alongside `X-PAYMENT`.
- We record it against the settled payment for attribution and rate-limiting.
- It is **advisory, never authenticating** — a handle proves nothing on its own. The payment
  signature is the only thing we trust for authorisation. A handle is a *label*, and we treat it
  with exactly the suspicion that implies.
- If Web Bot Auth signatures or an x402 Foundation identity schema become standard, that is the
  layer that would make handles verifiable, and we adopt it then.

Practical value today: known agents can be given rate-limit headroom or volume pricing, and we
learn which organisations are buying. That is worth having even unauthenticated.

---

## 6. M-Pesa — settlement design (not built)

The open question is: USDC arrives on Base, but Sautify's costs, staff and CMO counterparties are
all in KES on M-Pesa. Four routes, with an honest read on each.

**Option A — Licensed VASP off-ramp partner.**
USDC → CBK/CMA-licensed Kenyan exchange → bank → M-Pesa B2C.
*Highest compliance clarity, slowest, partner-dependent, T+1 or worse.*

**Option B — Stablecoin→M-Pesa API provider** (Kotani Pay, Yellow Card, Onramp Money and similar
Africa-focused rails, several of which expose a direct stablecoin-to-M-Pesa payout API).
*Fastest to integrate, near-instant payout. Concentration risk on one provider; their licence
status must be diligenced, not assumed.*

**Option C — Merchant-of-record / PSP fronts the whole thing. ← recommended first step**
A payment processor accepts x402 on our behalf and settles to us in **fiat KES**. Sautify never
custodies, converts, or transmits a virtual asset.
*Lowest regulatory burden by a wide margin — we are a merchant receiving fiat, which is a
category we already occupy. Costs a processor margin. Almost certainly the right way to start,
and it can be swapped for A or B later without touching the endpoints.*

**Option D — Dual rail, M-Pesa inbound for humans.**
Orthogonal to the above and worth doing regardless: humans pay via M-Pesa Daraja STK Push, agents
pay via x402, both hit the same metering and entitlement logic. This is the version that serves
actual Kenyan customers, who overwhelmingly are not going to hold USDC.

Under x402 this is expressible *inside the protocol*: add a second entry to `accepts[]` describing
an M-Pesa-settled scheme. Agents that understand it use it; agents that do not fall through to
USDC. Nothing about the seller wrapper needs to change.

**Recommendation:** Option C for revenue, plus Option D for domestic reach. Defer A and B until
volume justifies the compliance work.

---

## 7. Kenya regulatory position — read before going live

Kenya now has a live virtual-asset regime, and it changed *recently*:

- **Virtual Asset Service Providers Act, 2025** — presidential assent October 2025.
- **VASP Regulations, 2026** — gazetted July 2026 (Legal Notice 134 of 2026).
- **CBK** supervises virtual-asset-to-fiat conversion and stablecoin issuance. **CMA** supervises
  exchanges, token issuance and tokenisation.
- Minimum paid-up capital of **KSh 300 million** applies to *stablecoin issuers*.

How this maps to us:

- We would **not** be an issuer, so the KSh 300M floor is not aimed at Sautify.
- But **accepting stablecoins for services and converting them to KES is conversion activity**, and
  conversion is expressly CBK-supervised. Whether Sautify needs its own licence or can rely on a
  licensed counterparty (§6 Option C) is exactly the question to put to Kenyan counsel.
- Testnet work carries **no** such exposure. No real asset moves. Nothing in this branch changes
  that until the mainnet variables are deliberately set.

**Gate:** do not set `SAUTIFY_X402_NETWORK=base` in production until there is a written counsel
opinion on file. The code will happily do it; that is a business decision, not a technical one.

---

## 8. Rollout

| Phase | Content | Gate |
| --- | --- | --- |
| 1 | Seller wrapper + buyer agent, Base Sepolia, feature-flagged off | — |
| 2 | Demo panel showing the live handshake, "simulated data" badge retained | Claims review |
| 3 | Option C processor integration; price discovery with 2–3 pilot buyers | Commercial |
| 4 | Mainnet enable | **Counsel opinion (§7)** |
| 5 | M-Pesa inbound rail (Option D) | Daraja production credentials |

---

## 9. Deep-research prompt

Reusable prompt for the next research pass. Written to be pasted into a research agent as-is.

```text
You are researching the technical and regulatory design of an agent-payable API
for Sautify, a Kenyan music-royalty compliance-data company that sells verified
play-log evidence, catalogue fingerprint matches, and DDEX-DSR exports.

Sautify is the SELLER. Assume no Cloudflare Wallets API exists.

Answer these, citing primary sources (protocol specs, gazetted regulations,
official API docs) and dating every claim. Flag anything you cannot verify
rather than inferring it.

A. PROTOCOL
 1. Current x402 version. Has anything after v1 shipped, and what changed?
 2. Exact current JSON schema for PaymentRequirements, PaymentPayload, and the
    facilitator /verify and /settle request+response bodies. Note any field
    added or deprecated since the original Coinbase release.
 3. The "exact" vs "upto" schemes: is "upto" production-ready? It would let us
    meter by result-set size rather than charging a flat fee per call.
 4. Which facilitators are production-grade on Base mainnet, what do they
    charge, and what are their uptime/settlement-latency characteristics?
 5. Replay/abuse surface: given `resource` is bound into the signature, what
    attacks remain? Specifically consider a malicious facilitator, and a seller
    that verifies but never settles.
 6. What does the x402 Foundation's identity work actually specify today, and
    how does it relate to Web Bot Auth keypairs?

B. DISCOVERY — the commercially decisive question
 7. How does a buying agent DISCOVER an x402 endpoint exists? Registries,
    .well-known, MCP tool listings, crawler conventions?
 8. What is the current state of x402 + MCP integration? If agents find paid
    tools through MCP servers, should Sautify ship an MCP server as the primary
    distribution channel rather than a bare REST endpoint?
 9. Empirically, what categories of x402 endpoint are actually earning revenue,
    and at what price points? Distinguish measured data from vendor claims.

C. KENYA REGULATORY
10. Under the VASP Act 2025 and VASP Regulations 2026 (Legal Notice 134/2026),
    does a company that ACCEPTS stablecoins as payment for non-financial
    services, then converts to KES via a licensed third party, require its own
    CBK or CMA licence? Quote the operative definitions.
11. What are the tax consequences — VAT treatment, the digital service tax, and
    income recognition on a stablecoin-denominated receivable?
12. Are there CMO/KECOBO-specific constraints on how a compliance-data provider
    may be remunerated that would be disturbed by crypto settlement?

D. M-PESA
13. Which providers offer a production stablecoin→M-Pesa payout API today?
    For each: licence status in Kenya, settlement latency, fees, and the actual
    counterparty risk of holding a balance with them.
14. Daraja specifics for the inbound rail: STK Push and B2C constraints,
    settlement timing, per-transaction limits, sandbox-to-production process.
15. Can an M-Pesa-settled scheme be expressed as an `accepts[]` entry within
    x402 without violating the spec, or does it require an extension?

E. STRATEGIC
16. Steelman the case that this is premature for Sautify — that agent demand for
    Kenyan royalty compliance data is ~zero today and the effort is better spent
    on CMO contracts. Then give your honest assessment of which is right.

Deliverable: a decision memo. Lead with what changes our plan. Separate
"verified fact" from "informed inference" throughout.
```

---

## 10. Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `SAUTIFY_X402_PAY_TO` | *(unset)* | Receiving address. **Unset ⇒ x402 disabled entirely** |
| `SAUTIFY_X402_NETWORK` | `base-sepolia` | `base` for mainnet — see §7 gate |
| `SAUTIFY_X402_FACILITATOR` | `https://x402.org/facilitator` | Verify/settle service |
| `SAUTIFY_X402_ASSET` | network default USDC | Token contract |
| `SAUTIFY_KES_PER_USDC` | `135` | Display-only FX reference rate |

Buyer agent only:

| Variable | Meaning |
| --- | --- |
| `SAUTIFY_AGENT_PRIVATE_KEY` | Agent wallet key. **Never commit. Testnet keys only.** |
