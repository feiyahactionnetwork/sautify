import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  toBaseUnits,
  fromBaseUnits,
  usdcToKes,
  formatKesReference,
  priceFor,
  RESOURCES,
  KES_PER_USDC,
} from '../netlify/functions/_shared/pricing.js'

test('toBaseUnits converts USDC prices to exact 6dp base units', () => {
  assert.equal(toBaseUnits(0.002), '2000')
  assert.equal(toBaseUnits(0.005), '5000')
  assert.equal(toBaseUnits(0.05), '50000')
  assert.equal(toBaseUnits(1), '1000000')
  assert.equal(toBaseUnits(0), '0')
})

test('toBaseUnits avoids binary floating-point drift', () => {
  // 0.1 + 0.2 style drift is exactly what would produce "1999.9999999999998"
  // if this went through a float multiply.
  assert.equal(toBaseUnits(0.1 + 0.2), '300000')
  assert.equal(toBaseUnits('0.000001'), '1')
})

test('toBaseUnits rejects malformed and over-precise amounts', () => {
  assert.throws(() => toBaseUnits('abc'), /Invalid amount/)
  assert.throws(() => toBaseUnits('-1'), /Invalid amount/)
  assert.throws(() => toBaseUnits(''), /Invalid amount/)
  // Silently truncating someone's price is worse than refusing it.
  assert.throws(() => toBaseUnits('0.0000001'), /exceeds 6 decimal places/)
})

test('fromBaseUnits round-trips and trims trailing zeros', () => {
  assert.equal(fromBaseUnits('2000'), '0.002')
  assert.equal(fromBaseUnits('1000000'), '1')
  assert.equal(fromBaseUnits('0'), '0')
  assert.equal(fromBaseUnits(toBaseUnits(0.05)), '0.05')
})

test('KSh conversion uses the 135 reference rate', () => {
  assert.equal(KES_PER_USDC, 135)
  assert.equal(usdcToKes(0.002), 0.27)
  assert.equal(usdcToKes(0.05), 6.75)
  assert.equal(usdcToKes(1), 135)
})

test('usdcToKes accepts an override rate', () => {
  assert.equal(usdcToKes(1, 140), 140)
})

test('formatKesReference always states the rate inline', () => {
  // The rate must travel with the figure so a KSh amount from this module can
  // never be read as a fixed price in shillings.
  assert.equal(formatKesReference(0.002), 'KSh 0.27 (at KSh 135.00/USDC)')
  assert.match(formatKesReference(0.05), /at KSh 135\.00\/USDC/)
})

test('the evidence write path is never payable', () => {
  assert.equal(priceFor('/api/evidence'), null)
  assert.equal(priceFor('/api/ledger/evidence'), null)
  assert.ok(!Object.keys(RESOURCES).some((k) => k.includes('evidence')))
})

test('priced resources all carry a price and description', () => {
  for (const [path, r] of Object.entries(RESOURCES)) {
    assert.ok(r.priceUsdc > 0, `${path} must have a positive price`)
    assert.ok(r.description, `${path} must have a description`)
    assert.doesNotThrow(() => toBaseUnits(r.priceUsdc), `${path} price must be representable`)
  }
})
