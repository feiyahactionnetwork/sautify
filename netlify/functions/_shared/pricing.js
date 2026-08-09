// Pricing for agent-payable endpoints (spec §3).
//
// Prices are denominated in USDC because that is what x402 settles in. The KSh
// figures this module produces are a DISPLAY-ONLY conversion at a stated
// reference rate — they are not licence tariffs, and must never be presented as
// such. The published KECOBO tariff figures used in site copy are unrelated to
// anything here.

export const USDC_DECIMALS = 6

// Commercial reference rate, not a live oracle price (spec §3.1). Deliberately
// conservative against recent KES/USD levels so FX drift between quote and
// settlement works in our favour. One definition, one place.
export const KES_PER_USDC = normaliseRate(process.env.SAUTIFY_KES_PER_USDC)

function normaliseRate(raw) {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 135
}

// The sellable resources. Keyed by the public path an agent calls.
//
// submit-evidence is deliberately absent: the write path stays authenticated
// and is never payable, because letting anonymous agents buy their way into the
// evidence chain would destroy the integrity property that is the product.
export const RESOURCES = {
  '/api/catalog/match': {
    priceUsdc: 0.002,
    description: 'Fingerprint match against the Sautify reference catalogue',
    mimeType: 'application/json',
  },
  '/api/ledger': {
    priceUsdc: 0.005,
    description: 'Verified play-log evidence ledger query',
    mimeType: 'application/json',
  },
  '/api/ledger/export.dsr': {
    priceUsdc: 0.05,
    description: 'DDEX-DSR settlement-grade usage report for one ledger entry',
    mimeType: 'text/tab-separated-values',
  },
}

// Decimal-exact conversion to token base units. Goes via a fixed-point string
// rather than multiplying floats, so 0.002 USDC is always exactly "2000" and
// never "1999.9999999999998".
export function toBaseUnits(amount, decimals = USDC_DECIMALS) {
  const text = typeof amount === 'number' ? amount.toFixed(decimals) : String(amount ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Invalid amount: ${amount}`)
  }

  const [whole, fraction = ''] = text.split('.')
  if (fraction.length > decimals) {
    // More precision than the token can represent — refuse rather than silently
    // truncating someone's price.
    throw new Error(`Amount ${text} exceeds ${decimals} decimal places`)
  }

  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')).toString()
}

export function fromBaseUnits(base, decimals = USDC_DECIMALS) {
  const value = BigInt(base)
  const divisor = 10n ** BigInt(decimals)
  const whole = value / divisor
  const fraction = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export function usdcToKes(priceUsdc, rate = KES_PER_USDC) {
  return Math.round(priceUsdc * rate * 100) / 100
}

// Always rendered with the rate inline, so a KSh figure from this module can
// never be mistaken for a fixed price in shillings (spec §3.1).
export function formatKesReference(priceUsdc, rate = KES_PER_USDC) {
  return `KSh ${usdcToKes(priceUsdc, rate).toFixed(2)} (at KSh ${rate.toFixed(2)}/USDC)`
}

export function priceFor(resourcePath) {
  return RESOURCES[resourcePath] || null
}
