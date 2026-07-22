// On-device fingerprinting (audit §1/§2).
//
// The whole point of the redesign: fingerprint ambient audio ON the device and
// transmit only compact hashes, never raw recordings. This module exposes a
// pluggable fingerprinter with two implementations:
//
//   olafFingerprint(wavPath)  — the PRODUCTION path. Shells out to the Olaf CLI
//                               (github.com/JorenSix/Olaf), which emits landmark
//                               hashes. Requires the `olaf` binary on the device
//                               (Pi) or the ESP32 firmware build. Not exercised
//                               in the demo (needs the native binary + real
//                               audio). AGPL-3.0 — keep Olaf as an arm's-length
//                               component and get a licence read before shipping.
//
//   stubFingerprint(buffer)   — a runnable DATA-FLOW placeholder so the pipeline
//                               (capture -> fingerprint -> MQTT -> match) can be
//                               demonstrated end to end without native deps. It
//                               is a windowed rolling hash over raw bytes, NOT an
//                               acoustic fingerprint: it has none of Olaf's noise
//                               robustness. Its only job is to produce stable,
//                               overlapping (hash, offset) pairs so the transport
//                               and the landmark-vote match can be shown working.
//
// Both return the same shape: Array<{ hash: int32, offset: int }>.

import { spawn } from 'node:child_process'

export const STUB_FP_VERSION = 'stub/v1'
export const OLAF_FP_VERSION = 'olaf/v1' // set from `olaf version` in production

// --- Stub fingerprinter -----------------------------------------------------
//
// Content-defined landmarks, so the fingerprint is SHIFT-INVARIANT the way a real
// acoustic fingerprint is: a landmark is emitted wherever a rolling hash over the
// preceding bytes hits a boundary condition, and its offset is the landmark's
// absolute byte position. A slice of a track therefore yields the same landmark
// hashes as the full track, at positions shifted by a constant delta, which is
// exactly what the landmark-vote match keys on. A local byte change (noise) only
// disturbs landmarks whose window covers it; it does not cascade. This mirrors
// WHY real fingerprints are robust, without being one: it still keys on raw bytes,
// not spectral peaks, so it has none of Olaf's true acoustic noise tolerance.

const ROLL_K = 8 // rolling-hash window used to detect landmark boundaries
const BOUNDARY_MASK = 0x1ff // ~1 landmark per 512 bytes (roughly Olaf-like density)
const LANDMARK_WIN = 16 // bytes hashed at each landmark

// FNV-1a 32-bit over a byte slice -> a stable, well-distributed int32 hash.
function fnv1a(buf, start, end) {
  let h = 0x811c9dc5
  for (let i = start; i < end; i++) {
    h ^= buf[i]
    // h *= 16777619, kept in 32-bit via Math.imul
    h = Math.imul(h, 0x01000193)
  }
  return h | 0 // force int32
}

export function stubFingerprint(buffer) {
  const out = []
  for (let i = ROLL_K; i + LANDMARK_WIN <= buffer.length; i++) {
    const roll = fnv1a(buffer, i - ROLL_K, i) >>> 0
    if ((roll & BOUNDARY_MASK) === 0) {
      // offset is the absolute byte position of the landmark, so matching is
      // shift-invariant and noise stays local rather than renumbering the rest.
      out.push({ hash: fnv1a(buffer, i, i + LANDMARK_WIN), offset: i })
    }
  }
  return out
}

// --- Olaf adapter (production) ----------------------------------------------

// Parse Olaf's CSV match/print output into {hash, offset} pairs. Olaf's exact
// columns depend on the subcommand/version; adjust the indices to the build in
// use. Kept here so the production wiring is explicit even though the demo does
// not run it.
export function parseOlafCsv(csv) {
  const rows = []
  for (const line of csv.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const cols = t.split(',')
    if (cols.length < 2) continue
    const hash = Number.parseInt(cols[0], 10)
    const offset = Number.parseInt(cols[1], 10)
    if (Number.isInteger(hash) && Number.isInteger(offset)) rows.push({ hash, offset })
  }
  return rows
}

export function olafFingerprint(wavPath, { olafBin = 'olaf', subcommand = 'print' } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(olafBin, [subcommand, wavPath])
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => (out += d))
    proc.stderr.on('data', (d) => (err += d))
    proc.on('error', reject) // e.g. binary not found
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`olaf exited ${code}: ${err.trim()}`))
      resolve(parseOlafCsv(out))
    })
  })
}
