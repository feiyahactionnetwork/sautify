// Ingest bridge (audit §1/§2/§8).
//
// Subscribes to the listeners' fingerprint topic and, for each message, resolves
// the play by matching the hashes against Sautify's own catalogue. In production
// this POSTs the hashes to /api/catalog/match (the Task-1 endpoint backed by
// match_catalog_fingerprints); matched plays then feed the evidence ledger.
//
// For the runnable demo, an in-memory matcher mirrors the SQL landmark-vote so
// the end-to-end flow can be shown without a database or broker.

// In-memory equivalent of match_catalog_fingerprints(): group shared hashes by
// (candidateWork, t_offset - query_offset) and take the work with the most votes
// at any single consistent delta.
export class InMemoryCatalog {
  constructor() {
    this.works = new Map() // workId -> { meta, hashIndex: Map<hash, offset[]> }
  }

  add(workId, meta, fingerprints) {
    const hashIndex = new Map()
    for (const { hash, offset } of fingerprints) {
      if (!hashIndex.has(hash)) hashIndex.set(hash, [])
      hashIndex.get(hash).push(offset)
    }
    this.works.set(workId, { meta, hashIndex })
  }

  match(query, minVotes = 5) {
    let best = null
    for (const [workId, { meta, hashIndex }] of this.works) {
      const deltaVotes = new Map()
      for (const { hash, offset: qOffset } of query) {
        const hits = hashIndex.get(hash)
        if (!hits) continue
        for (const tOffset of hits) {
          const delta = tOffset - qOffset
          deltaVotes.set(delta, (deltaVotes.get(delta) || 0) + 1)
        }
      }
      for (const [delta, votes] of deltaVotes) {
        if (votes >= minVotes && (!best || votes > best.votes)) {
          best = { workId, meta, votes, delta }
        }
      }
    }
    return best
  }
}

export class Bridge {
  constructor({ catalog, minVotes = 5, onPlay = () => {}, log = () => {} }) {
    this.catalog = catalog
    this.minVotes = minVotes
    this.onPlay = onPlay
    this.log = log
  }

  // Wire this to transport.subscribe(TOPIC_ROOT, bridge.handleMessage).
  handleMessage = async (topic, msg) => {
    const query = (msg.fp || []).map(([hash, offset]) => ({ hash, offset }))
    const match = this.catalog.match(query, this.minVotes)
    if (match) {
      this.log(
        `[bridge] MATCH ${match.meta.title} — ${match.meta.artist} ` +
          `(${match.votes} votes) @ ${msg.venueSbpRef} from ${msg.deviceId}`,
      )
      // A confirmed play. In production this is where the evidence-ledger batch
      // gets appended (submit-evidence), keyed on the matched ISRC.
      await this.onPlay({ match, message: msg })
    } else {
      this.log(`[bridge] no catalogue match for a clip from ${msg.deviceId} (would fall back / queue for review)`)
    }
  }
}
