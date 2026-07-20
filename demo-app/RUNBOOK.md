# Demo runbook — PAVRISK meeting

## Start the demo

```bash
cd sautify
npm run demo        # starts demo-server (:5177) + demo-app (http://localhost:5175)
```

Open **http://localhost:5175** in Chrome. Press **F** for fullscreen, **?** for the
shortcut overlay (1–6 switch tabs, P pauses the simulated feed).

## Before anything else: ACRCloud keys (one-time)

```bash
cp demo-server/.env.example demo-server/.env
# edit demo-server/.env → fill ACR_HOST, ACR_ACCESS_KEY, ACR_ACCESS_SECRET
# make sure ACR_MOCK=0 (mock matches are labelled as mock and must not be shown as real)
```

Restart `npm run demo` after editing. The header chip must read **"recognition
ready"** (green). If it reads "recognition MOCK", ACR_MOCK is still 1 — fix it.

## Viewing on a phone

1. Phone and laptop on the **same Wi-Fi** (or connect the laptop to the phone's hotspot).
2. `npm run demo` — Vite now prints a **Network:** line, e.g. `http://192.168.1.23:5175`.
3. Open that address in the phone's browser. macOS may ask to allow incoming
   connections for node — click Allow.
4. Caveat: the **mic** button won't work on the phone (browsers only allow
   microphone access on HTTPS or localhost). The simulated feed, all six tabs,
   and file-upload identify work fine. Do the live-mic moment on the laptop.
5. If the venue Wi-Fi blocks device-to-device traffic (hotel/office guest
   networks often do), use the phone-hotspot route from step 1 instead.

## Offline / fallback procedure

The demo needs **zero network** to run in simulated mode:

- If ACRCloud or the network dies mid-demo, the identify button shows
  "Recognition service unreachable — running simulated feed." and the header chip
  flips to "simulated only". Nothing crashes; carry on with the simulated feed.
- If the **mic** fails (room acoustics, permission denied), use the
  **Upload audio file** button or drag an MP3/WAV into the drop zone — same
  pipeline, same LIVE MATCH row.
- If the whole app fails, the backup slides are in `/meeting-pack`
  (full-page PNGs of all six tabs, plus the ledger animation as .webm).

## Mic-permission pre-check

1. Chrome → padlock icon on `localhost:5175` → Microphone → **Allow**.
2. macOS: System Settings → Privacy & Security → Microphone → Chrome **on**.
3. Click "Identify live", confirm the waveform animates when you speak.
   (localhost is a secure context, so getUserMedia works without HTTPS.)

## The three things to test at 1:30 PM

1. **Real identify end-to-end**: play a commercially released song from your
   phone next to the laptop → "Identify live" → a green
   **LIVE MATCH — real detection** row must appear at the top of the feed.
   Also test the upload path once with an MP3.
2. **Offline mode**: turn Wi-Fi off → confirm the calm inline notice + the feed
   keeps running → turn Wi-Fi back on.
3. **Projector sweep**: press F (fullscreen), walk tabs 1→6 with number keys,
   let the Evidence ledger chain draw in (tab 5 is the signature moment), and
   confirm the "Live demo · simulated data" badge and footer disclaimer are
   visible on the projector's resolution.

## Claims discipline (do not improvise past this)

Everything on screen is simulated except rows explicitly badged
"LIVE MATCH — real detection". Safe phrasing: "NRR-compatible",
"built for eCitizen reconciliation", "designed around published CMO licence
conditions". Do not say: integrated with NRR/eCitizen, KECOBO-approved,
official, or partnered with PAVRISK/KAMP/KECOBO.
