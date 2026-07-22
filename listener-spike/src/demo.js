// End-to-end, broker-free demo of the redesigned pipeline (audit §1/§2/§8).
//
//   run:  node src/demo.js
//
// It seeds a catalogue, then runs a Listener through the LoopbackTransport into
// the Bridge and shows: (1) only hashes cross the wire, never audio; (2) captures
// match the right catalogue work even when they start at arbitrary offsets
// (shift-invariance); (3) a connectivity drop buffers messages durably and
// reconnect flushes them. No broker, no database, no native Olaf. Deterministic:
// all "noise" comes from a seeded RNG so the run is reproducible.

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { stubFingerprint, STUB_FP_VERSION } from './fingerprint.js'
import { OfflineBuffer } from './buffer.js'
import { LoopbackTransport } from './transport.js'
import { Listener, TOPIC_ROOT } from './listener.js'
import { Bridge, InMemoryCatalog } from './bridge.js'

const log = (m) => console.log(m)
const line = () => console.log('-'.repeat(72))

// A 10 s clip of mono 16 kHz 16-bit PCM is ~320 KB; size the synthetic audio to
// match so the bandwidth comparison against raw-audio egress is honest.
const CLIP_BYTES = 320_000

// Seeded PRNG (mulberry32) so noise and the "unknown" clip are reproducible.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A synthetic "clean master": deterministic, well-distributed bytes standing in
// for decoded PCM. Uses the seeded PRNG (not a raw LCG, whose low byte is
// periodic) so the byte stream has enough entropy to trigger landmarks at the
// expected density.
function makeTrack(seed, lengthBytes) {
  const rng = mulberry32(seed)
  const buf = Buffer.alloc(lengthBytes)
  for (let i = 0; i < lengthBytes; i++) buf[i] = (rng() * 256) & 0xff
  return buf
}

// A venue "capture": a contiguous slice of a track (what actually played), from
// an arbitrary (deliberately non-aligned) start, with a little byte noise.
function captureFrom(track, start, rng, len = CLIP_BYTES, noise = 0.005) {
  const clip = Buffer.from(track.subarray(start, start + len))
  for (let i = 0; i < clip.length; i++) {
    if (rng() < noise) clip[i] = clip[i] ^ 0xff
  }
  return clip
}

function randomClip(rng, len = CLIP_BYTES) {
  const buf = Buffer.alloc(len)
  for (let i = 0; i < len; i++) buf[i] = (rng() * 256) & 0xff
  return buf
}

async function main() {
  const rng = mulberry32(42)

  // --- Seed the catalogue (Task-1 equivalent, in memory) -------------------
  const trackA = makeTrack(1, 480_000)
  const trackB = makeTrack(2, 480_000)
  const catalog = new InMemoryCatalog()
  catalog.add(1, { title: 'Sura Yako', artist: 'Sauti Sol', isrc: 'KEA1P2600123' }, stubFingerprint(trackA))
  catalog.add(2, { title: 'Mwaki', artist: 'Zerb & Sofiya Nzau', isrc: 'KEA2B2600456' }, stubFingerprint(trackB))
  log('Seeded catalogue with 2 works (fingerprints only, no audio stored).')

  const plays = []
  const bridge = new Bridge({
    catalog,
    minVotes: 20,
    onPlay: ({ match, message }) => plays.push({ isrc: match.meta.isrc, venue: message.venueSbpRef }),
    log,
  })

  // --- Wire listener -> loopback transport -> bridge ------------------------
  const transport = new LoopbackTransport()
  transport.subscribe(TOPIC_ROOT, bridge.handleMessage)

  const buffer = new OfflineBuffer(join(mkdtempSync(join(tmpdir(), 'sfy-listener-')), 'queue.jsonl'))
  const listener = new Listener({
    deviceId: 'SFY-DEMO-01',
    venueSbpRef: 'SBP-2026-00412',
    transport,
    buffer,
    fingerprinter: stubFingerprint,
    fpVersion: STUB_FP_VERSION,
    log,
  })

  line()
  log('1) ONLINE captures — a clip of A (start 40000), a clip of B (start 12345,')
  log('   deliberately non-aligned to prove shift-invariance), and random noise:')
  const capA = await listener.captureAndReport(captureFrom(trackA, 40_000, rng))
  await listener.captureAndReport(captureFrom(trackB, 12_345, rng))
  await listener.captureAndReport(randomClip(rng)) // unknown -> no match

  line()
  log('2) What actually crossed the wire (proof: hashes only, no audio field):')
  log('   message keys: ' + Object.keys(capA.msg).join(', '))
  log('   fp sample (first 3 [hash, offset] pairs): ' + JSON.stringify(capA.msg.fp.slice(0, 3)))
  log(`   has "audio"/"pcm"/"sample" field? ${['audio', 'pcm', 'sample'].some((k) => k in capA.msg)}`)
  const packed = capA.msg.fp.length * 6 // 4-byte hash + 2-byte offset if binary-packed
  log(
    `   bandwidth: ${capA.rawBytes} B raw clip vs ${capA.bytes} B JSON message ` +
      `(${(capA.rawBytes / capA.bytes).toFixed(0)}x); ~${packed} B if hashes were binary-packed ` +
      `(${(capA.rawBytes / packed).toFixed(0)}x).`,
  )

  line()
  log('3) Connectivity DROPS — two captures should buffer, bridge sees nothing:')
  const playsBefore = plays.length
  transport.setOnline(false)
  await listener.captureAndReport(captureFrom(trackA, 99_000, rng))
  await listener.captureAndReport(captureFrom(trackB, 150_001, rng))
  log(`   buffered on disk: ${buffer.size()} message(s); plays matched while offline: ${plays.length - playsBefore}`)

  line()
  log('4) RECONNECT — buffer flushes automatically, plays now land:')
  transport.setOnline(true)
  await new Promise((r) => setTimeout(r, 20)) // let the onConnect drain settle
  log(`   buffered remaining: ${buffer.size()}`)

  line()
  log(`RESULT: ${plays.length} confirmed plays -> ` + JSON.stringify(plays))
  const ok =
    plays.length === 4 &&
    plays.filter((p) => p.isrc === 'KEA1P2600123').length === 2 &&
    plays.filter((p) => p.isrc === 'KEA2B2600456').length === 2 &&
    buffer.size() === 0 &&
    !['audio', 'pcm', 'sample'].some((k) => k in capA.msg)
  log(ok ? '\n✓ PASS: local fingerprinting, hash-only transport, offline buffer, and matching all work.' : '\n✗ FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
