# Listener spike — on-device fingerprinting + MQTT + offline buffer

A proof-of-concept for the capture-pipeline redesign in the platform audit
(§1 Olaf, §2 data pipeline, §8 catalogue). It is **not wired into production** and
is not deployed anywhere; it is a runnable reference for the target architecture.

## Why

Today's real path streams **raw audio** to ACRCloud on every identification
(`demo-server/server.js`, `demo-app/.../IdentifyPanel.jsx`). That is a per-request
cost, a bandwidth cost, and a privacy/compliance liability, and it contradicts our
own "never raw recordings" copy. The redesign:

```
  capture ─▶ fingerprint LOCALLY ─▶ publish {hash,offset} over MQTT ─▶ ingest bridge
              (Olaf on the device)     (tiny, never audio; buffered      (match against OUR
                                        offline, flushed on reconnect)    catalogue, Task 1)
```

Raw audio never leaves the device; it is discarded the instant fingerprints are
extracted. Only compact hashes travel, over MQTT (built for many low-power,
intermittently-connected devices sending small messages).

## Run the demo (no broker, no database, no native deps)

```bash
cd listener-spike
node src/demo.js
```

It seeds an in-memory catalogue, runs a listener through an in-process transport
into the bridge, and shows, deterministically:

1. **Local fingerprinting + hash-only transport.** Captured clips of two known
   works match; random noise does not. The wire message has keys
   `v, deviceId, venueSbpRef, capturedAt, fpVersion, fp` — **no audio field**.
2. **Shift-invariance.** Captures start at arbitrary, non-aligned offsets and
   still match, because landmarks are content-defined (see the stub note below).
3. **Bandwidth win.** A ~320 KB raw clip (10 s of mono 16 kHz 16-bit PCM) becomes
   an ~12 KB JSON message (~27×), or ~3.6 KB binary-packed (~90×).
4. **Durable offline buffer.** With the link down, captures are appended to an
   on-disk queue and nothing reaches the bridge; on reconnect the buffer flushes
   and the plays land. QoS-1 semantics: at-least-once, so the ingest side must be
   idempotent.

## Files

| File | Role |
|---|---|
| `src/fingerprint.js` | Pluggable fingerprinter: `olafFingerprint()` (production, shells out to the Olaf CLI) + `stubFingerprint()` (runnable placeholder). |
| `src/transport.js` | `MqttTransport` (real broker, QoS 1, last-will, lazy-loads `mqtt`) + `LoopbackTransport` (in-process, for the demo/tests). |
| `src/buffer.js` | `OfflineBuffer`: append-only disk queue, drains in order on reconnect. |
| `src/listener.js` | The device agent: capture → fingerprint → publish/buffer. |
| `src/bridge.js` | Ingest side: subscribe → match. `InMemoryCatalog` mirrors the SQL landmark-vote for the demo. |
| `src/demo.js` | End-to-end runnable demo (above). |

## What is real vs. stubbed (be honest about this)

- **Real:** the data flow, message shape, MQTT topic design, QoS-1 + last-will
  wiring, the durable offline buffer, and the landmark-vote match (identical in
  spirit to `match_catalog_fingerprints` from the Task-1 migration).
- **Stubbed:** `stubFingerprint` is a **content-defined rolling hash over raw
  bytes**, not an acoustic fingerprint. It is shift-invariant and mildly
  noise-tolerant *by construction*, which lets the pipeline be demonstrated, but
  it has **none of Olaf's real robustness** to room noise, EQ, pitch/tempo drift,
  or codec artefacts. Real recognition is Olaf's job.

## Going to production

1. **Fingerprinter:** replace `stubFingerprint` with `olafFingerprint` (Olaf on
   the Pi; ESP32 firmware for the cheap tier). Set `fpVersion` from `olaf version`
   and store it with every message so the catalogue can be re-indexed on upgrades.
2. **Broker:** stand up Mosquitto (or a hosted MQTT); swap `LoopbackTransport` for
   `MqttTransport`. Use per-device credentials and the last-will for fleet
   liveness (a device going quiet marks itself offline).
3. **Bridge:** point `Bridge` at `POST /api/catalog/match` (Task 1) instead of the
   in-memory catalogue; on a confirmed play, append to the evidence ledger
   (`submit-evidence`). Make ingest **idempotent** (dedupe on
   `deviceId + capturedAt + fp-hash`) because QoS 1 can redeliver.
4. **Catalogue:** grow it via the consented artist-onboarding funnel (Task 1,
   audit §8): fingerprint clean masters, `POST /api/catalog/ingest`.

## Licensing note (do not skip)

Olaf is **AGPL-3.0** (network copyleft). Keep it as an arm's-length component
(a separate process/binary the listener invokes), keep our catalogue and business
logic in separate code, and get a licence read before shipping anything
Olaf-derived. This is a real constraint ACRCloud does not impose.

## Dependencies

`mqtt` (for the real broker path only) is declared in `package.json` but is
lazy-loaded; the demo runs on plain Node with nothing installed.
