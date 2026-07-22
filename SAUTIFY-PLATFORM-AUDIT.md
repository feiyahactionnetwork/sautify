# Sautify — Platform Audit & Proposed Upgrade Plan

**Prepared:** 22 July 2026
**Scope:** Architecture review, data-pipeline risk, positioning/compliance-language audit, DDEX mapping, a proposed public "How It Works" page, and an honest demo-readiness assessment.
**Status:** Findings and proposals only. **No code has been changed.** Awaiting go-ahead before any implementation.

> Note on repository reality vs. narrative: this repo is a **marketing site + two demos**, not a running edge fleet. There is no Raspberry Pi firmware, no device agent, and no MQTT anywhere in the tree. Where the site or deck implies a deployed hardware pipeline, that pipeline does not yet exist in code. This matters for several sections below, especially #1, #2, and #6.

---

## 1. Repo audit — current architecture vs. Olaf

### 1.1 What is actually in the repo today

| Layer | What exists in code | What is only described (no code) |
|---|---|---|
| **Edge / capture** | Browser mic capture + file upload in `demo-app/src/components/IdentifyPanel.jsx` (10 s WebM/Opus clip, or dropped MP3/WAV) | Raspberry Pi / "Listener" device firmware, offline buffer, fleet telemetry, MQTT |
| **Recognition** | `demo-server/server.js` — an Express proxy that HMAC-signs an **ACRCloud `/v1/identify`** request and forwards **raw audio** | Any on-device fingerprinting |
| **Ledger backend** | `netlify/functions/*` on Supabase Postgres + Netlify Blobs; SHA-256 hash-chained evidence via `append_ledger_entry` RPC | — |
| **Public site** | React + Vite + Tailwind static site (`src/`) | — |
| **Operations console** | React demo (`demo-app/`) — one real recognition path, everything else simulated (`demo-app/src/data.js`) | — |

So the "Raspberry Pi + ACRCloud fingerprinting pipeline" is really **ACRCloud identify-by-raw-audio**, with the Pi as an aspirational capture endpoint. Two device rows in `demo-app/src/data.js:29-30` are even labelled `Listener v1 (Pi)` / `Listener v2 (software)` — but that is simulation data, not a client.

### 1.2 Olaf (JorenSix/Olaf) — concrete comparison

Facts from the upstream repo (github.com/JorenSix/Olaf):

- **Language / platforms:** C core (+ Zig build, Python eval). Runs on **ESP32**, Teensy, Arduino, desktop, and **browser via WebAssembly**.
- **Method:** landmark-based acoustic fingerprinting (the same Shazam-style constellation approach ACRCloud uses under the hood). Audio decoded via ffmpeg, resampled to mono 16 kHz.
- **Query-by-microphone:** yes — `olaf microphone` streams the default mic into the matcher and prints CSV matches live.
- **Reference DB:** LMDB on desktop; header-file/in-memory fingerprint sets on embedded. Indexed the 100,000-track FMA set (>340 days of audio) into a 15 GB DB at ~80× real-time query speed.
- **License:** **AGPL-3.0** (quoted exactly from the repo).
- **Stated limits:** single-threaded core; one writer at a time (LMDB); whole files read into memory when indexing; **removing items from the reference DB is not currently supported**.

### 1.3 Is Olaf a viable cheaper/lower-power alternative? — honest verdict

**Partial. It replaces the recognition *engine*, but not the *catalogue*, and it carries a licensing constraint that matters for a commercial venture.**

What Olaf genuinely gives us:

- **Zero per-query API cost.** ACRCloud is billed per recognition request (see 1.4). Olaf is self-hosted; marginal cost per query ≈ electricity.
- **On-device / on-prem fingerprinting.** This is the single most important architectural unlock — it lets us *stop sending audio off-device* (see §2). Olaf can fingerprint at the edge (ESP32) or on the Pi and match locally or against our own server.
- **Lower power / cheaper hardware.** ESP32-class fingerprinting means a "Listener" could cost single-digit dollars in silicon rather than a full Pi, aligning with the "low-cost, locked-down device" story in `src/components/TechStack.jsx:44`.

The hard catches — do not gloss over these:

1. **We would have to build and own the reference catalogue.** ACRCloud's real value is not the algorithm; it is 100M+ pre-fingerprinted tracks. Olaf ships an *engine*, not Kenyan music. To match "Sura Yako" we must obtain and fingerprint the audio ourselves. For a Kenyan-catalogue-first product this is arguably an **advantage** (a curated Kenyan/East-African reference DB is defensible IP and better-matched than a global index), but it is real work: licensing/ingesting audio, building the index, keeping it current. Olaf also can't yet *delete* DB entries, so catalogue churn needs a rebuild strategy.
2. **AGPL-3.0 is network copyleft.** If Olaf (or a derivative) is offered as part of a network service, AGPL requires offering the **complete corresponding source** of the AGPL-covered work to users of that service. For an edge binary this is usually manageable (keep our fingerprint DB and business logic in a separate process/service and treat Olaf as an at-arm's-length component), but it needs a deliberate architecture and a legal read before it ships. This is a genuine constraint ACRCloud (a commercial SaaS) does not impose. **Flag for founder/legal review, not an engineering afterthought.**
3. **Accuracy in noisy bar conditions is unproven for us.** ACRCloud is hardened against real-world venue noise, pitch/tempo drift, and short samples. Olaf is capable but we would need our own accuracy benchmark on Kenyan venue recordings before betting compliance evidence on it.

### 1.4 Licensing-cost tradeoff

- **ACRCloud:** paid API, billed per recognition request, typically with a monthly plan/minimum and a project fee. Public reseller data points put "Song / original-sound recognition" in the region of a few US cents per request at retail (e.g. ~¥320 per 10,000 requests ≈ roughly US$0.004–0.005/request on one reseller's list), but ACRCloud keeps full pricing behind a console login, and continuous ambient monitoring multiplies request volume fast. A single venue fingerprinting continuously (say a query every 10–20 s during opening hours) is on the order of **thousands of requests per venue per day** — at 10 venues that is tens of thousands of paid requests daily, and the bill scales linearly with the fleet. This is the core scaling risk of the current design.
- **Olaf:** software cost **KSh 0 / US$0** (AGPL, self-hosted). Cost moves to (a) one-time catalogue ingestion, (b) our own hosting/edge hardware, and (c) engineering to build and benchmark it. Marginal cost per additional query and per additional venue trends toward zero.

**Recommendation:** treat Olaf not as a like-for-like ACRCloud swap but as the **path to an edge-fingerprinting architecture that removes per-request billing and removes raw-audio egress** (§2). Sequence it: keep ACRCloud for the pilot/accelerator demo (it works today), and run an Olaf spike in parallel — build a small Kenyan reference DB, wire `olaf microphone` on a Pi, and benchmark match accuracy against ACRCloud on the same venue clips. Decide on evidence, and get the AGPL posture reviewed before committing.

---

## 2. Data-pipeline gap — is raw audio leaving the device?

### 2.1 Finding: yes, the working pipeline sends raw audio off-device

The one real recognition path streams **raw audio**, not local hashes:

- `demo-app/src/components/IdentifyPanel.jsx:5-18` — `postAudio()` POSTs the raw recorded `Blob` (or the uploaded MP3/WAV file) to `/api/identify`.
- `demo-server/server.js:17-18` — the proxy accepts a **raw audio body capped at 12 MB** ("10 s mic clips are ~100 KB; uploads are songs") and at `server.js:60-75` forwards that audio as a multipart `sample` to `https://<ACR_HOST>/v1/identify`.

So audio captured "at the venue" leaves the device and transits to a third-party API (ACRCloud) for every identification. That is inherent to ACRCloud's identify-by-audio API — the standard call *is* "send us the audio."

### 2.2 This directly contradicts our own copy

`demo-app/src/components/Sources.jsx:53-58` tells the audience:

> "Sautify is software-first: the Listener runs on commodity hardware at the venue, **fingerprints ambient audio locally, and ships only compact acoustic fingerprints and match metadata — never raw recordings.**"

That claim is **not true of the current pipeline.** The current pipeline ships raw audio. This is both a scalability/cost risk *and* a claims-accuracy problem under the project's own compliance rules (CLAUDE.md: don't overstate; only real matches labelled real). It should be corrected in copy **or** made true in code — ideally the latter.

### 2.3 Why this is a cost/scalability/privacy risk

- **Cost:** every query is a paid ACRCloud request *and* uplink bandwidth. Continuous ambient capture across a fleet multiplies both.
- **Bandwidth:** raw 10 s clips (~100 KB) per query, per device, all day, over Kenyan cellular data is materially more expensive than shipping a few-hundred-byte hash.
- **Privacy / compliance surface:** raw ambient audio from licensed premises is captured and transmitted to a third party. Fingerprints (one-way hashes) are far less sensitive and far easier to defend to a CMO, a venue, or a regulator. "We never transmit recordings, only irreversible fingerprints" is a much stronger compliance posture than the current reality.

### 2.4 Proposed fix (design only — not built)

1. **Move fingerprinting on-device.** Extract acoustic fingerprints at the edge and transmit **only** those + metadata. Two routes:
   - **ACRCloud on-device SDK / file-scan** (their fingerprint-extraction SDK produces fingerprints locally that are sent instead of audio) — smallest change, keeps ACRCloud's catalogue.
   - **Olaf on the Pi/ESP32** (§1) — removes per-request billing entirely, at the cost of owning the catalogue.
2. **Lightweight hash transmission over MQTT.** Replace the per-clip HTTPS raw-audio POST with an MQTT publish of compact messages: `{deviceId, venueSbpRef, ts, fingerprintOrMatchId, confidence}`. MQTT is built for exactly this — many low-power intermittently-connected devices shipping small messages — and pairs naturally with an offline buffer (QoS 1 + local queue) so "no plays are missed" (the promise in `src/components/ForVenues.jsx:8` and `TechStack.jsx:44`) becomes real instead of aspirational.
3. **Offline buffer for real.** Persist unsent fingerprints locally and flush on reconnect. Today this is claimed in copy but implemented nowhere.
4. **Bind every message to the venue's Single Business Permit reference** (already the intent in `Sources.jsx:57` and used as `sbpReference` in the ledger schema) so each detection stays attributable to a licensed premises.

Net effect: no raw audio leaves the venue, per-request API cost drops (or disappears with Olaf), bandwidth collapses to near-nothing, and the "never raw recordings" claim becomes true.

---

## 3. Positioning audit — "royalty collection" vs. "independent compliance-data verification"

Kenya's CMO licensing regime makes it legally risky to appear to **collect or distribute royalties** without a KECOBO licence. Sautify's defensible position is: *independent compliance-data vendor* — we produce verified play-log evidence; the licensed CMO collects and pays. Much of the site already does this well (the demo footer in `demo-app/src/App.jsx:137-146` and `src/components/Compliance.jsx:43-49` are model language). The items below are where the language **drifts toward "we collect / we pay,"** ranked by risk.

### 3.1 High risk — reads as if Sautify pays or disburses money

1. **`index.html:9` and `index.html:52`** (meta description + Organization JSON-LD):
   > "...tracking song plays at venues **and paying artists based on real evidence**, not estimates."

   "Paying artists" says Sautify pays artists. We do not. This is indexed by search engines and embedded as structured data — the most public, most machine-readable claim on the site.
   **Rewrite:** *"...tracking song plays at venues so licensed CMOs can pay artists based on real evidence, not estimates."*

2. **`src/components/HowItWorks.jsx:22-24` (step 4, titled "Pay") and the section heading `:52-54`:**
   > Heading: "From Audio to Artist **Payout: Automatically**"
   > Step 4 "**Pay**": "Royalty reports are generated automatically and handed to your CMO for payout..."

   The step body is fine (hands to the CMO), but labelling the step Sautify performs "**Pay**" and promising "Artist Payout: Automatically" implies Sautify runs the payout. The automation we own ends at *evidence and reporting*.
   **Rewrite:** retitle step 4 **"Report"** (or "Reconcile"); change the body's leading verb to "Evidence-ready royalty **reports** are generated automatically and handed to the licensed CMO, which makes the payout." Change the heading to **"From Audio to Auditable Evidence: Automatically."**

3. **`src/components/TransparencyLedger.jsx` (public site) — the "Simulate eCitizen Settlement" action** (`:291`) and the settlement display `:276-281` showing *"KES X to artists · KES Y admin · ref DEMO-CMO-..."*, backed by `netlify/functions/simulate-settlement.js` which computes a 70/30 split and mints a `cmoDisbursementRef`.

   Even though it is labelled "Simulate," putting a **settlement/disbursement** function that splits money and issues a disbursement reference **on the public marketing site** is the strongest "we run collection" signal on the property. It is defensible as an *illustration of what a CMO would do with our evidence*, but the framing currently makes Sautify look like the settlement engine.
   **Rewrite/reframe:** relabel to **"Simulate CMO Reconciliation"** (or "See how a CMO would settle this evidence"), and add one line: *"Settlement is performed by the licensed CMO on eCitizen. Sautify neither holds nor moves funds; this illustration shows how our evidence would feed that step."* Keep "eCitizen" only in the allowed compatibility framing ("built for eCitizen reconciliation"), never as "integrated with eCitizen."

### 3.2 Medium risk — "royalty collection" framing / implies Sautify holds earnings

4. **`README.md:3`:** "Kenya's infrastructure for music **royalty attribution**." Also `index.html:52` JSON-LD repeats "music royalty attribution." "Attribution" is better than "collection," but paired with "paying artists" it blurs. **Rewrite:** *"Kenya's independent compliance-data layer for music royalties — verified play-log evidence for licensed CMOs."*

5. **`src/components/ForArtists.jsx:16-22, 55-57`:** "**Royalty Tracking** — See your earnings build in **real time**" and "...what **you're owed**, in real time," plus "Track what your CMO has released to you."
   "See your earnings build in real time" can read as Sautify accruing money on the artist's behalf. The last bullet ("what your CMO has released to you") is correctly framed and should be the model. **Rewrite:** *"Play Tracking — see every verified play as it's logged"* and *"...an evidence-based estimate of what you're owed, which your CMO uses to pay you."* Add "estimate" wherever a shilling figure is implied.

6. **`src/components/About.jsx:24`:** "We built the infrastructure that makes **royalty collection** transparent, auditable, and fair." **Rewrite:** *"...that makes royalty **data** transparent, auditable, and fair"* — one word, removes the "we collect" read.

### 3.3 Low risk / on-message (keep as the template for the rewrites)

- `src/components/Problem.jsx:44` — "**Sautify fixes the data layer.**" ✅ exactly right.
- `src/components/Compliance.jsx:43-49` — "Sautify doesn't set tariffs or collect on KECOBO's behalf. We provide the verified play-log evidence that CMOs and the National Rights Registry use to calculate what each artist is owed." ✅ This is the gold-standard sentence — propagate it near the Hero and into the "How It Works" page.
- `demo-app/src/App.jsx:137-146` and `demo-app/src/components/KecoboReport.jsx:27-34` — careful, correct, well-disclaimed. ✅

### 3.4 Two non-positioning cleanups spotted in the same files

- **`src/components/Footer.jsx:42`:** "© **2025** Sautify" — stale; the rest of the project is 2026. Minor, but visible on the public site.
- **Claims consistency:** `Sources.jsx` "fingerprints locally / never raw recordings" (§2.2) is the one place demo copy states something the code does not do. Fix in lockstep with §2.

---

## 4. DDEX compatibility — can our play-log schema map to industry royalty standards?

### 4.1 First, the right standard — a correction worth making

The brief says "DDEX ERN/CWR." For *logging plays*, neither is the target:

- **ERN (Electronic Release Notification):** distributor→DSP *release delivery* (track metadata, artwork, deal terms). Not a usage report. **Not our fit.**
- **CWR (Common Works Registration):** a **CISAC** standard for registering *musical works* (ISWC, writer/publisher splits) with PROs/CMOs. It's about *who owns the work*, not *what got played*. That data belongs to publishers/CMOs, not to us — and we shouldn't try to author it. **Not our fit** (and arguably out of our lane, which is good for positioning).
- **DDEX DSR (Digital Sales / Usage Reporting), Royalty-Reporting profile:** the flat-file standard for reporting, line by line, **every usage event** (ISRC, territory, use type, count) so a rights owner can pay onward royalties. **This is exactly what a Sautify play log is.** ✅

So the accurate statement for the deck/institutional audience is: *"Sautify's evidence exports map to the DDEX DSR usage-reporting standard, keyed on ISRC — the same format DSPs use to report streams to rights holders."* That is both correct and more credible than name-dropping ERN/CWR.

### 4.2 What our current schema already has

From `netlify/functions/submit-evidence.js:14-28` + `_shared/formatEntry.js` + `demo-app/src/data.js`:

```
venue:            { name, sbpReference }
reportingPeriod:  { start, end }
plays[]:          { isrc, title, artist, playedAt, confidence }
playCountSummary: { totalPlays, uniqueTracks }
nrrCrossCheck:    { matched, unmatched }
evidenceHash / prevHash / chainHash
settlement:       { invoiceAmountKes, artistAmountKes, adminAmountKes, cmoDisbursementRef, settledAt }
```

The critical field is already there: **ISRC per play.** DSR is ISRC-keyed, so we are structurally close. `reportingPeriod`, per-outlet (venue) grouping, and a period summary all have DSR analogues.

### 4.3 The gap (what DSR needs that we don't yet carry)

- **Territory** (ISO country, `KE`) per usage/report.
- **Use-type / commercial-model codes** (DSR uses controlled vocabularies, e.g. use type "PublicPerformance"-style, commercial model). Ours is implicitly "public performance at a licensed venue" but never coded.
- **A Release/Resource identity block** — DSR distinguishes the Resource (ISRC/sound recording) from the Release; we only carry the resource (ISRC) + free-text title/artist.
- **Message header identifiers** — sender/recipient (us → the CMO), message ID, profile/version, period, currency.
- **Per-line usage counts** — we store a `playCountSummary.totalPlays` but the per-track play count (needed for pro-rata distribution) lives in the demo's `DISTRIBUTION_ROWS`, not in the submitted evidence payload. To be DSR-real, each play line (or an aggregated per-ISRC line) needs its own count.

### 4.4 Proposed minimal DDEX-DSR export (spec, not built)

A thin adapter that reads a ledger entry (or a period's worth of entries) and emits a DSR-style flat file. Sketch:

```
exportDsr(reportingPeriod, venue, plays[], { sender, recipient, territory = 'KE' }) -> string (TSV/flat)

Header block (HEAD / one per file):
  MessageId, MessageCreated(ISO8601), SenderPartyId(Sautify),
  RecipientPartyId(CMO), Profile="RoyaltyReporting", Version, Territory,
  ReportingPeriodStart, ReportingPeriodEnd

Per-outlet block (one per venue):
  OutletId = venue.sbpReference, OutletName = venue.name

Usage/summary line (one per distinct ISRC in the period):
  ISRC, Title, Artist, UseType="PublicPerformance",
  CommercialModel="LicenceFee", NumberOfUsages(=plays for that ISRC),
  Territory, plus an Evidence reference = ledger chainHash (see below)

Footer block (FOOT):
  NumberOfLines, checksum
```

Two things make this *Sautify's* export rather than a generic one, and both are already in the repo:

- **Aggregate `plays[]` to per-ISRC counts** at export time (group by `isrc`, count) — turns raw plays into the per-work usage lines DSR expects.
- **Attach the `chainHash`** from the evidence ledger to each report as a verifiable evidence pointer. That is the differentiator: a DSR file *plus* a tamper-evident hash anyone can recompute. No incumbent gives a CMO that.

**Effort:** small and self-contained — one pure function + a Netlify endpoint (`/api/ledger/:id/export.dsr`) reusing the existing Supabase read. It does **not** require changing the capture pipeline. Recommend building a v0 that emits the flat file above and validating one sample against DDEX's DSR profile docs before claiming "DDEX-compatible" publicly.

**What we should *not* claim:** CWR/work-registration output. We don't have ISWC or writer/publisher splits, and generating them would push us toward the publishing/CMO role we're deliberately staying out of.

---

## 5. Proposed public "How It Works" page (copy draft — not to be built yet)

**Placement:** a dedicated `/how-it-works` route (the current `#how-it-works` is a 4-step strip; this is the deeper, two-audience explainer the brief asks for). Structure: shared intro → **Institutional** track → **Artists & Venues** track → shared compliance footer.

### 5.1 Shared intro (both audiences)

> **Sautify is an independent music-compliance data layer for Kenya.**
> We produce verified, tamper-evident evidence of which songs are actually played in licensed venues — and hand that evidence to the licensed Collective Management Organisations (CMOs) who collect and distribute royalties. Sautify does not set tariffs and does not collect or pay royalties. We make the data honest; the licensed CMO does the rest.

### 5.2 Institutional section — for PAVRISK, advertisers, labels (professional Kenyan business English, ready to use)

> **For CMOs, advertisers, and rights holders**
>
> Today, distribution of public-performance royalties in Kenya relies substantially on surveys and estimates, because there has been no mechanism to record what is genuinely played on the ground. Sautify closes that gap. We deploy low-cost, locked-down listening devices in licensed premises — not personal phones — so that the resulting play data remains independent and verifiable. Each device is bound to the venue's Single Business Permit reference, ensuring every detection is attributable to a specific licensed premises.
>
> For each reporting period, Sautify delivers an evidence package to the licensed CMO: verified play logs, catalogue match rates cross-checked against publicly registered National Rights Registry works data, and a hash-chained audit trail that any party — the CMO, an artist, or an external auditor — can independently recompute and verify. Our reporting is NRR-compatible, built for eCitizen reconciliation, and designed around published CMO licence conditions (KECOBO Consolidated Tariffs 2026–28). Play-usage exports map to the DDEX DSR usage-reporting standard, keyed on ISRC, so the data can be ingested into existing royalty-processing workflows rather than re-keyed by hand.
>
> Sautify's role is deliberately bounded. We do not license music, set tariffs, hold funds, or disburse royalties. We provide the independent, auditable evidence that allows a licensed CMO to distribute what is genuinely owed — replacing estimates with proof, and turning payment disputes into a shared, verifiable record.
>
> For advertisers and labels, the same evidence base answers a different question: where, how often, and in what context a given work is actually being played across the venue network — measurement grounded in verified detections rather than self-reported estimates.
>
> *[CTA: "Request an evidence sample" / "Talk to us about a data-sharing pilot" — mailto for now.]*

> **Compliance note to keep on this section (non-negotiable):** retain the "Live demo · simulated data" framing wherever sample figures appear, and never state or imply that Sautify is integrated with, approved by, official to, or partnered with KECOBO, eCitizen, PAVRISK, KAMP, or any CMO. Allowed framing only: "NRR-compatible," "built for eCitizen reconciliation," "designed around published CMO licence conditions."

### 5.3 Artists & Venues section — *flag only, per the brief*

> **[ARTIST- / VENUE-FACING SECTION — Swahili / Sheng version to be authored here.]**
>
> Placement and intent (English brief for the eventual Swahili/Sheng copy — **do not ship English here**; this block is where the localized copy goes):
> - **Tone:** warm, plain, first-person to the artist and the venue owner. Not legalese.
> - **Artist message to convey:** "Every time your song plays in a bar, hotel or club, Sautify records it — so when your CMO pays out, it's based on what you actually played, not a guess. You can see every play." Emphasise *visibility and fairness*, not "we pay you" (we don't).
> - **Venue message to convey:** "Plug in the device and forget it. It runs itself, works offline, and gives you proof of what you played for licence renewals." Emphasise *zero hassle* and *proof for compliance*.
> - **Must still carry** a short plain-language version of the "Sautify doesn't collect or pay — your CMO does" line.
>
> *Swahili/Sheng draft to follow in a separate pass, reviewed by a native speaker before publishing.*

### 5.4 Shared footer (both audiences)

Reuse the demo console's disclaimer almost verbatim (`demo-app/src/App.jsx:137-146`) — it is already compliant and battle-tested.

---

## 6. Traction / demo-readiness — honest assessment

Framed for an accelerator application: what you can *truthfully* demo end-to-end today vs. what is mocked. Being straight about this now prevents a credibility hit later.

### 6.1 What genuinely works end-to-end (real, demoable, defensible)

1. **The marketing site** (`src/`) — real, production-quality static site, deployable to Netlify as-is. ✅
2. **The Transparency Ledger — a real, working, tamper-evident evidence ledger.** This is your strongest technical proof point and it is *not* faked:
   - `netlify/functions/submit-evidence.js` → Supabase `append_ledger_entry` RPC (advisory-locked, atomic) writes a hash-chained row; the full payload is stored in Netlify Blobs keyed by its SHA-256.
   - `list-ledger.js` reads the chain; `TransparencyLedger.jsx:61-75` **recomputes the SHA-256 chain in the browser** and verifies genesis→tip.
   - You can genuinely say: "submit evidence → it's hash-chained and persisted → anyone can independently re-verify the chain, live, in their browser." That is real cryptographic tamper-evidence, working today.
   - **Honest caveat:** the *content* of each evidence batch is synthetic (`buildDemoPayload()` generates random venues/plays). The chain is real; the plays in it are not from real venues yet.
3. **Live audio recognition — real ACRCloud detection.** With ACR keys configured, `demo-app` does a true end-to-end identify: 10 s mic capture (or file upload) → HMAC-signed `/v1/identify` → real title/artist/ISRC/score, surfaced as a green **"LIVE MATCH — real detection"** row (`IdentifyPanel.jsx` + `server.js` + `LiveMonitor.jsx:50-65`). Play a released song next to the laptop and it genuinely recognises it. ✅

### 6.2 What is mocked or does not exist (say so plainly)

- **No edge device / no Raspberry Pi firmware.** There is no capture agent, no offline buffer, no fleet management, no MQTT, no on-device fingerprinting anywhere in the repo. The "Listener" devices, uptimes, and firmware versions in `demo-app/src/data.js:25-31` are simulation rows. The only real capture is a **browser tab's microphone**.
- **On-device local fingerprinting is not implemented** and, as noted in §2, the copy that says it is (`Sources.jsx`) is currently inaccurate.
- **The operations console is ~90% simulated.** KPIs, the detection feed, device fleet, distribution table, reconciliation, and the KECOBO report are hardcoded illustrative data (`data.js`). Only the single "LIVE MATCH" path is real.
- **No NRR / eCitizen / CMO integration.** Correctly disclaimed everywhere, but it means "97.4% matched to registered works," reconciliation variances, and settlements are all simulated numbers.
- **No artist or venue dashboards / accounts.** `ForArtists.jsx` says "Log in to your Sautify dashboard" — there is no dashboard and no auth. All CTAs are `mailto:`.
- **The pilot is aspirational.** "Now accepting pilot venues" / "our first 10 venues" — no venues are live; nothing is deployed in the field.
- **"Settlement" moves no money.** `simulate-settlement.js` computes a 70/30 split and a fake `DEMO-CMO-...` reference; nothing is disbursed.

### 6.3 The honest one-paragraph traction narrative (usable in an application)

> "Sautify has two working technical components and a clear integration thesis between them. First, a **live audio-recognition pipeline** that identifies commercially released tracks from a venue microphone in real time (via ACRCloud today; an on-device/Olaf path is under evaluation to remove per-request cost and stop raw-audio egress). Second, a **working tamper-evident evidence ledger** — every play batch is SHA-256 hash-chained, persisted, and independently re-verifiable in the browser, and exportable toward the DDEX DSR usage-reporting standard. What is *not* yet built is the edge-device fleet that connects the two in the field: today the recognition demo and the ledger demo are stitched by simulated middle data, not a single live venue pipeline, and no devices are deployed. Our pilot ask is to close exactly that gap: put real Listeners in real venues and feed real detections into the ledger we already run."

That framing is honest, specific, and still compelling — it leads with two things that genuinely work and is candid about the one thing that doesn't.

---

## 7. Recommended sequence (once you give the go-ahead)

Ordered by leverage-per-effort; each is independent enough to do alone.

1. **Positioning fixes (§3)** — highest risk, lowest effort. Copy-only edits to `index.html`, `HowItWorks.jsx`, `TransparencyLedger.jsx` labels, `ForArtists.jsx`, `About.jsx`, `README.md`, plus the `Sources.jsx`/pipeline claim reconciliation and the 2025→2026 footer fix. No architecture change.
2. **DDEX-DSR v0 export (§4)** — small, self-contained, high credibility for the institutional audience; reuses existing data.
3. **"How It Works" page (§5)** — build the English institutional track; leave the Swahili/Sheng block flagged for a native-speaker pass.
4. **Data-pipeline redesign (§2) + Olaf spike (§1)** — the big one: on-device fingerprinting, MQTT hash transmission, real offline buffer, and an Olaf accuracy/AGPL evaluation. This is what turns the demo into a deployable product and removes the ACRCloud cost/raw-audio risk. Needs a legal read on AGPL before it ships.

**No code, copy, or config has been changed. Tell me which of these to start with and I'll proceed on the `claude/compliance-platform-audit-0m90nm` branch.**
