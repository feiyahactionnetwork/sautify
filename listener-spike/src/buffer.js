// Durable offline buffer (audit §2).
//
// The listener promises "no plays are missed" even when connectivity drops. This
// is an append-only, disk-backed queue: every outbound message is appended as a
// JSON line; on (re)connect the listener drains it, removing entries only after
// the transport confirms delivery (QoS-1 semantics). A crash mid-flush at worst
// re-delivers a message, which the ingest side must treat idempotently.

import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export class OfflineBuffer {
  constructor(path) {
    this.path = path
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    if (!existsSync(path)) writeFileSync(path, '')
  }

  enqueue(record) {
    appendFileSync(this.path, JSON.stringify(record) + '\n')
  }

  size() {
    return this.#readAll().length
  }

  #readAll() {
    const raw = readFileSync(this.path, 'utf8')
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  }

  // Try to deliver every queued record in order. `send` returns/throws per
  // record; delivered records are dropped, the rest are kept for the next drain.
  // Returns { delivered, remaining }.
  async drain(send) {
    const records = this.#readAll()
    const survivors = []
    let delivered = 0
    for (let i = 0; i < records.length; i++) {
      try {
        await send(records[i])
        delivered += 1
      } catch {
        // Stop on first failure and keep this record + everything after it, so
        // ordering is preserved for the next attempt.
        survivors.push(...records.slice(i))
        break
      }
    }
    writeFileSync(this.path, survivors.map((r) => JSON.stringify(r)).join('\n') + (survivors.length ? '\n' : ''))
    return { delivered, remaining: survivors.length }
  }
}
