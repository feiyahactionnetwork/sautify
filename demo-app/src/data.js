// Simulated demo data. Every figure here is illustrative. The only KSh
// figures used anywhere are ones already published in Sautify's public site
// copy (KSh 30,000 sample annual mobile-DJ tariff; 70% minimum artist share
// under the eCitizen royalty directive, KECOBO Consolidated Tariffs 2026–28).

export const VENUES = [
  { id: 'V-001', name: 'Havana Bar & Grill', area: 'Westlands, Nairobi', sbp: 'SBP-2026-00412' },
  { id: 'V-002', name: 'Skylux Rooftop', area: 'Kilimani, Nairobi', sbp: 'SBP-2026-00877' },
  { id: 'V-003', name: 'The Alchemist Nairobi', area: 'Westlands, Nairobi', sbp: 'SBP-2026-01203' },
  { id: 'V-004', name: 'Mombasa Beach Lounge', area: 'Nyali, Mombasa', sbp: 'SBP-2026-01581' },
  { id: 'V-005', name: 'Eldoret Sports Bar', area: 'Eldoret CBD', sbp: 'SBP-2026-01764' },
]

export const TRACKS = [
  { isrc: 'KEA1P2600123', title: 'Sura Yako', artist: 'Sauti Sol' },
  { isrc: 'KEA2B2600456', title: 'Mwaki', artist: 'Zerb & Sofiya Nzau' },
  { isrc: 'KEA3C2600789', title: 'Anguka Nayo', artist: 'Ethic Entertainment' },
  { isrc: 'KEA4D2600231', title: 'Nadékesha', artist: 'Nviiri the Storyteller' },
  { isrc: 'KEA5E2600318', title: 'Kuna Kuna', artist: 'Vic West, Brandy Maina' },
  { isrc: 'KEA6F2600402', title: 'Extra Pressure', artist: 'Bensoul' },
  { isrc: 'KEA7G2600577', title: 'Sipangwingwi', artist: 'Exray Taniua' },
  { isrc: 'KEA8H2600649', title: 'Lenga', artist: 'Wakadinali' },
]

export const DEVICES = [
  { id: 'SFY-0192', venue: 'Havana Bar & Grill', model: 'Listener v2 (software)', status: 'online', uptime: '99.2%', lastSeen: 'now', firmware: '2.4.1' },
  { id: 'SFY-0201', venue: 'Skylux Rooftop', model: 'Listener v2 (software)', status: 'online', uptime: '98.7%', lastSeen: 'now', firmware: '2.4.1' },
  { id: 'SFY-0187', venue: 'The Alchemist Nairobi', model: 'Listener v2 (software)', status: 'online', uptime: '99.6%', lastSeen: 'now', firmware: '2.4.1' },
  { id: 'SFY-0214', venue: 'Mombasa Beach Lounge', model: 'Listener v1 (Pi)', status: 'degraded', uptime: '91.3%', lastSeen: '4 min ago', firmware: '1.9.8' },
  { id: 'SFY-0176', venue: 'Eldoret Sports Bar', model: 'Listener v1 (Pi)', status: 'offline', uptime: '84.0%', lastSeen: '2 h ago', firmware: '1.9.8' },
]

// Illustrative split of ONE published sample tariff (KSh 30,000 annual
// mobile-DJ licence) at the 70% minimum artist share. Pure arithmetic on a
// public figure — no new tariff amounts invented.
export const SAMPLE_TARIFF = { label: 'Sample annual tariff (mobile DJ, Consolidated Tariffs 2026–28)', totalKsh: 30000, artistPct: 70 }

export const DISTRIBUTION_ROWS = TRACKS.slice(0, 6).map((t, i) => ({
  ...t,
  plays: [412, 388, 301, 264, 219, 187][i],
  sharePct: [18.4, 17.3, 13.4, 11.8, 9.8, 8.3][i],
}))

export const RECON_ROWS = [
  { period: '2026-06', venue: 'Havana Bar & Grill', invoice: 'INV-06-0412', logged: 1893, reported: 1893, status: 'reconciled' },
  { period: '2026-06', venue: 'Skylux Rooftop', invoice: 'INV-06-0877', logged: 1461, reported: 1461, status: 'reconciled' },
  { period: '2026-06', venue: 'The Alchemist Nairobi', invoice: 'INV-06-1203', logged: 2210, reported: 2204, status: 'variance' },
  { period: '2026-06', venue: 'Mombasa Beach Lounge', invoice: 'INV-06-1581', logged: 987, reported: 987, status: 'reconciled' },
  { period: '2026-06', venue: 'Eldoret Sports Bar', invoice: 'INV-06-1764', logged: 640, reported: '—', status: 'awaiting' },
]

export const REPORT_SUMMARY = [
  { metric: 'Reporting period', value: 'June 2026' },
  { metric: 'Venues reporting', value: '5 of 5' },
  { metric: 'Total verified plays', value: '7,191' },
  { metric: 'Unique works detected', value: '312' },
  { metric: 'Works matched to registered catalogue data', value: '304 (97.4%)' },
  { metric: 'Unmatched — flagged for manual review', value: '8' },
  { metric: 'Evidence batches hash-chained', value: '6 of 6' },
]

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

let feedSeq = 0
export function makeFeedEvent(now = new Date()) {
  const track = randomOf(TRACKS)
  const venue = randomOf(VENUES.slice(0, 4))
  return {
    id: `sim-${++feedSeq}`,
    at: now,
    title: track.title,
    artist: track.artist,
    isrc: track.isrc,
    venue: venue.name,
    confidence: Math.round((0.88 + Math.random() * 0.11) * 100),
    kind: 'sim',
  }
}

export function initialFeed(count = 8) {
  const out = []
  const now = Date.now()
  for (let i = count - 1; i >= 0; i--) {
    out.push(makeFeedEvent(new Date(now - (i + 1) * (20000 + Math.random() * 40000))))
  }
  return out.reverse()
}

// ---- Simulated hash-chained evidence ledger (client-side, same scheme as the
// public Sautify transparency-ledger prototype: chainHash = sha256(prev + evidence)).
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function buildLedger() {
  const GENESIS = '0'.repeat(64)
  const entries = []
  let prev = GENESIS
  const batches = [
    { venue: 'Havana Bar & Grill', period: '2026-06 W1', plays: 471, matched: 464 },
    { venue: 'Skylux Rooftop', period: '2026-06 W1', plays: 365, matched: 361 },
    { venue: 'The Alchemist Nairobi', period: '2026-06 W2', plays: 552, matched: 549 },
    { venue: 'Mombasa Beach Lounge', period: '2026-06 W2', plays: 247, matched: 246 },
    { venue: 'Havana Bar & Grill', period: '2026-06 W3', plays: 488, matched: 483 },
    { venue: 'Eldoret Sports Bar', period: '2026-06 W3', plays: 160, matched: 158 },
  ]
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i]
    const evidenceHash = await sha256Hex(JSON.stringify(b) + i)
    const chainHash = await sha256Hex(prev + evidenceHash)
    entries.push({ id: i + 1, ...b, evidenceHash, prevHash: prev, chainHash })
    prev = chainHash
  }
  return entries
}

export function truncHash(h) {
  return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : 'genesis'
}
