import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VirtualWallet, GuardrailError } from '../agent/virtualWallet.js'
import { selectRequirements, decodeSettlement } from '../agent/x402Client.js'

function wallet(overrides = {}) {
  return new VirtualWallet({
    label: 'test-agent',
    allowanceUsdc: 0.01,
    maxTransactionUsdc: 0.005,
    allowlist: ['sautify.co.ke'],
    ...overrides,
  })
}

const MATCH = 'https://sautify.co.ke/api/catalog/match'

test('a payment within every guardrail is allowed', () => {
  const w = wallet()
  assert.deepEqual(w.check({ resource: MATCH, amountBase: '2000' }), { allowed: true })
})

test('the per-call cap blocks an oversized single payment', () => {
  const w = wallet()
  const verdict = w.check({ resource: MATCH, amountBase: '50000' })
  assert.equal(verdict.allowed, false)
  assert.equal(verdict.reason, 'exceeds_max_transaction')
})

test('the allowance blocks cumulative overspend', () => {
  const w = wallet()
  for (let i = 0; i < 5; i++) w.reserve({ resource: MATCH, amountBase: '2000' })
  assert.equal(w.remainingUsdc, '0')

  const verdict = w.check({ resource: MATCH, amountBase: '2000' })
  assert.equal(verdict.allowed, false)
  assert.equal(verdict.reason, 'exceeds_allowance')
})

test('the allowlist matches the exact host and its subdomains', () => {
  const w = wallet()
  assert.ok(w.isAllowedHost('https://sautify.co.ke/x'))
  assert.ok(w.isAllowedHost('https://api.sautify.co.ke/x'))
})

test('the allowlist is not fooled by a lookalike host', () => {
  const w = wallet()
  // The leading dot in the suffix check is what stops this.
  assert.equal(w.isAllowedHost('https://evil-sautify.co.ke/x'), false)
  assert.equal(w.isAllowedHost('https://sautify.co.ke.evil.com/x'), false)
  assert.equal(w.isAllowedHost('not a url'), false)
})

test('an empty allowlist pays nothing', () => {
  const w = wallet({ allowlist: [] })
  assert.equal(w.check({ resource: MATCH, amountBase: '1' }).allowed, false)
})

test('zero and negative amounts are rejected', () => {
  const w = wallet()
  assert.equal(w.check({ resource: MATCH, amountBase: '0' }).reason, 'invalid_amount')
  assert.equal(w.check({ resource: MATCH, amountBase: '-5' }).reason, 'invalid_amount')
})

test('reserve commits immediately, before any signing happens', () => {
  const w = wallet()
  w.reserve({ resource: MATCH, amountBase: '2000' })
  // Optimistic accounting here would let a slow settle open an overspend window.
  assert.equal(w.spentUsdc, '0.002')
  assert.equal(w.remainingUsdc, '0.008')
})

test('reserve throws GuardrailError and records the block without spending', () => {
  const w = wallet()
  assert.throws(
    () => w.reserve({ resource: 'https://elsewhere.example/x', amountBase: '2000' }),
    (err) => err instanceof GuardrailError && err.detail.reason === 'not_allowlisted',
  )
  assert.equal(w.spentUsdc, '0')
  assert.equal(w.ledger.at(-1).status, 'blocked')
})

test('release returns funds exactly once', () => {
  const w = wallet()
  const r = w.reserve({ resource: MATCH, amountBase: '2000' })
  r.release()
  assert.equal(w.spentUsdc, '0')

  r.release() // double-release must not credit the wallet twice
  assert.equal(w.spentUsdc, '0')
})

test('a settled reservation cannot later be released', () => {
  const w = wallet()
  const r = w.reserve({ resource: MATCH, amountBase: '2000' })
  r.settle('0xabc')
  r.release()

  assert.equal(w.spentUsdc, '0.002')
  assert.equal(w.ledger.at(-1).status, 'settled')
  assert.equal(w.ledger.at(-1).transaction, '0xabc')
})

test('summary reports spend in USDC and as a rate-stated KSh reference', () => {
  const w = wallet({ handle: 'research.sautify.cloudflare.pay' })
  w.reserve({ resource: MATCH, amountBase: '2000' }).settle('0x1')
  try {
    w.reserve({ resource: MATCH, amountBase: '50000' })
  } catch {
    /* expected block */
  }

  const s = w.summary()
  assert.equal(s.spentUsdc, '0.002')
  assert.equal(s.spentKes, 'KSh 0.27 (at KSh 135.00/USDC)')
  assert.deepEqual(s.calls, { settled: 1, blocked: 1, total: 2 })
  assert.equal(s.handle, 'research.sautify.cloudflare.pay')
})

// --- client helpers ---------------------------------------------------------

test('selectRequirements picks the first supported scheme and network', () => {
  const accepts = [
    { scheme: 'upto', network: 'base-sepolia' },
    { scheme: 'exact', network: 'solana-devnet' },
    { scheme: 'exact', network: 'base-sepolia', maxAmountRequired: '2000' },
  ]
  assert.equal(selectRequirements(accepts, { networks: ['base-sepolia'] }).maxAmountRequired, '2000')
})

test('selectRequirements returns null when nothing is payable', () => {
  assert.equal(selectRequirements([{ scheme: 'upto', network: 'base' }], { networks: ['base'] }), null)
  assert.equal(selectRequirements(undefined, { networks: ['base'] }), null)
})

test('decodeSettlement tolerates a missing or corrupt header', () => {
  assert.equal(decodeSettlement(null), null)
  assert.equal(decodeSettlement('%%%not-base64%%%'), null)
  const good = Buffer.from(JSON.stringify({ success: true, transaction: '0x1' })).toString('base64')
  assert.equal(decodeSettlement(good).transaction, '0x1')
})
