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
    this._draining = false
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

  // Drop just the oldest record from disk. enqueue() only ever appends, so as
  // long as at most one drain runs at a time (guarded by _draining below),
  // the oldest record on disk is always the one drain() just confirmed
  // delivered — this re-reads current state rather than trusting drain()'s
  // snapshot from when it started, so a concurrent enqueue() is never
  // clobbered by a stale wholesale rewrite.
  #dropOldest() {
    const current = this.#readAll()
    const remainder = current.slice(1)
    writeFileSync(this.path, remainder.map((r) => JSON.stringify(r)).join('\n') + (remainder.length ? '\n' : ''))
  }

  // Try to deliver every queued record in order. `send` returns/throws per
  // record; each delivered record is removed from disk immediately (not
  // batched at the end), so a record enqueued while this drain is still
  // running survives instead of being lost when the drain finishes.
  // Returns { delivered, remaining }.
  async drain(send) {
    if (this._draining) {
      // A drain is already in flight on this instance; let it finish rather
      // than racing two drains against the same file from the front.
      return { delivered: 0, remaining: this.size() }
    }
    this._draining = true
    try {
      const records = this.#readAll()
      let delivered = 0
      for (let i = 0; i < records.length; i++) {
        try {
          await send(records[i])
          delivered += 1
          this.#dropOldest()
        } catch {
          // Stop on first failure; this record and everything after it (plus
          // anything enqueued meanwhile) stays on disk for the next attempt.
          break
        }
      }
      return { delivered, remaining: this.size() }
    } finally {
      this._draining = false
    }
  }
}
