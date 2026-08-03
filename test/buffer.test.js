import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OfflineBuffer } from '../listener-spike/src/buffer.js'

function tmpBuffer() {
  const dir = mkdtempSync(join(tmpdir(), 'sfy-buf-'))
  return { buffer: new OfflineBuffer(join(dir, 'q.jsonl')), dir }
}

test('enqueue increases size and drain delivers in FIFO order', async () => {
  const { buffer, dir } = tmpBuffer()
  try {
    buffer.enqueue({ n: 1 })
    buffer.enqueue({ n: 2 })
    buffer.enqueue({ n: 3 })
    assert.equal(buffer.size(), 3)

    const seen = []
    const { delivered, remaining } = await buffer.drain(async (rec) => seen.push(rec.n))
    assert.deepEqual(seen, [1, 2, 3])
    assert.equal(delivered, 3)
    assert.equal(remaining, 0)
    assert.equal(buffer.size(), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('drain stops on first failure and preserves order of the remainder', async () => {
  const { buffer, dir } = tmpBuffer()
  try {
    for (const n of [1, 2, 3, 4]) buffer.enqueue({ n })

    // Fail when we reach n === 3.
    const seen = []
    const res = await buffer.drain(async (rec) => {
      if (rec.n === 3) throw new Error('offline')
      seen.push(rec.n)
    })
    assert.deepEqual(seen, [1, 2])
    assert.equal(res.delivered, 2)
    assert.equal(res.remaining, 2) // 3 and 4 kept
    assert.equal(buffer.size(), 2)

    // A second drain (now "online") flushes the rest in order.
    const rest = []
    await buffer.drain(async (rec) => rest.push(rec.n))
    assert.deepEqual(rest, [3, 4])
    assert.equal(buffer.size(), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a fresh buffer reports size 0', () => {
  const { buffer, dir } = tmpBuffer()
  try {
    assert.equal(buffer.size(), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a record enqueued while a drain is in flight survives the drain', async () => {
  const { buffer, dir } = tmpBuffer()
  try {
    buffer.enqueue({ n: 1 })
    buffer.enqueue({ n: 2 })

    // A slow drain, standing in for a flush whose network calls take a while.
    const drainPromise = buffer.drain(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    // A new detection arrives mid-flush (the scenario a real capture loop
    // would hit): enqueue must not be clobbered when the drain finishes.
    await new Promise((r) => setTimeout(r, 10))
    buffer.enqueue({ n: 3 })

    const result = await drainPromise
    assert.equal(result.delivered, 2)
    assert.equal(buffer.size(), 1)

    const rest = []
    await buffer.drain(async (rec) => rest.push(rec.n))
    assert.deepEqual(rest, [3])
    assert.equal(buffer.size(), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a second concurrent drain on the same instance is a no-op, not a race', async () => {
  const { buffer, dir } = tmpBuffer()
  try {
    for (const n of [1, 2, 3]) buffer.enqueue({ n })

    const seen = []
    const first = buffer.drain(async (rec) => {
      await new Promise((r) => setTimeout(r, 20))
      seen.push(rec.n)
    })
    const second = buffer.drain(async (rec) => seen.push(`should-not-run-${rec.n}`))

    const [firstResult, secondResult] = await Promise.all([first, second])
    assert.deepEqual(seen, [1, 2, 3])
    assert.equal(firstResult.delivered, 3)
    assert.equal(secondResult.delivered, 0)
    assert.equal(buffer.size(), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
