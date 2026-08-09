// x402 seller layer (spec §2, §4.1) — makes a Netlify function payable per call.
//
// Two properties worth stating up front, because they drive the whole design:
//
//   1. We hold NO private key. The seller side only ever knows a receiving
//      address, so compromising this environment cannot drain funds.
//   2. We never verify signatures ourselves. The facilitator does signature
//      recovery, balance, nonce and expiry checks, then broadcasts. That is why
//      this file has zero dependencies — it is HTTP and base64, nothing more.

import { priceFor, toBaseUnits, formatKesReference, KES_PER_USDC } from './pricing.js'

export const X402_VERSION = 1

const NETWORKS = {
  'base-sepolia': {
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    extra: { name: 'USDC', version: '2' },
  },
  base: {
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    extra: { name: 'USDC', version: '2' },
  },
}

const DEFAULT_FACILITATOR = 'https://x402.org/facilitator'
const DEFAULT_NETWORK = 'base-sepolia'
const MAX_TIMEOUT_SECONDS = 300
const FACILITATOR_TIMEOUT_MS = 15000

export function getConfig(env = process.env) {
  const network = env.SAUTIFY_X402_NETWORK || DEFAULT_NETWORK
  const known = NETWORKS[network]
  return {
    payTo: env.SAUTIFY_X402_PAY_TO || '',
    network,
    facilitator: (env.SAUTIFY_X402_FACILITATOR || DEFAULT_FACILITATOR).replace(/\/$/, ''),
    asset: env.SAUTIFY_X402_ASSET || known?.asset || '',
    extra: known?.extra,
    origin: env.SAUTIFY_PUBLIC_ORIGIN || '',
  }
}

// Unset payTo disables x402 entirely and the wrapper becomes a pass-through.
// Merging this branch therefore changes nothing until it is switched on.
export function isEnabled(env = process.env) {
  const { payTo, asset } = getConfig(env)
  return Boolean(payTo && asset)
}

export function resourceUrl(event, config) {
  if (config.origin) return `${config.origin.replace(/\/$/, '')}${event.path || ''}`
  const headers = event.headers || {}
  const host = headers['x-forwarded-host'] || headers.host || 'sautify.co.ke'
  const proto = headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}${event.path || ''}`
}

export function buildPaymentRequirements({ resource, priceUsdc, description, mimeType, config }) {
  return {
    scheme: 'exact',
    network: config.network,
    maxAmountRequired: toBaseUnits(priceUsdc),
    resource,
    description,
    mimeType: mimeType || 'application/json',
    payTo: config.payTo,
    maxTimeoutSeconds: MAX_TIMEOUT_SECONDS,
    asset: config.asset,
    extra: config.extra,
  }
}

// The 402 body (spec §2.1). `accepts` is an array so we can offer additional
// rails later — an M-Pesa-settled scheme slots in here without touching callers.
export function challengeBody(requirements, error) {
  return {
    x402Version: X402_VERSION,
    accepts: [requirements],
    error: error || 'X-PAYMENT header is required',
  }
}

export function decodePaymentHeader(raw) {
  if (!raw || typeof raw !== 'string') return { error: 'X-PAYMENT header is required' }

  let parsed
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  } catch {
    return { error: 'X-PAYMENT header is not valid base64-encoded JSON' }
  }

  if (!parsed || typeof parsed !== 'object') return { error: 'X-PAYMENT payload must be an object' }
  if (parsed.x402Version !== X402_VERSION) {
    return { error: `Unsupported x402Version: ${parsed.x402Version}` }
  }
  if (parsed.scheme !== 'exact') return { error: `Unsupported scheme: ${parsed.scheme}` }
  if (!parsed.payload?.signature || !parsed.payload?.authorization) {
    return { error: 'X-PAYMENT payload is missing signature or authorization' }
  }

  return { payload: parsed }
}

async function callFacilitator(path, body, config) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FACILITATOR_TIMEOUT_MS)
  try {
    const res = await fetch(`${config.facilitator}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, reason: data?.invalidReason || data?.error || `Facilitator returned ${res.status}` }
    }
    return { ok: true, data }
  } catch (err) {
    const timedOut = err?.name === 'AbortError'
    return { ok: false, reason: timedOut ? 'Facilitator timed out' : 'Facilitator unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

export async function verifyPayment(paymentPayload, paymentRequirements, config) {
  const result = await callFacilitator(
    '/verify',
    { x402Version: X402_VERSION, paymentPayload, paymentRequirements },
    config,
  )
  if (!result.ok) return { valid: false, reason: result.reason }
  return { valid: result.data?.isValid === true, reason: result.data?.invalidReason || 'Payment rejected' }
}

export async function settlePayment(paymentPayload, paymentRequirements, config) {
  const result = await callFacilitator(
    '/settle',
    { x402Version: X402_VERSION, paymentPayload, paymentRequirements },
    config,
  )
  if (!result.ok) return { success: false, reason: result.reason }
  return {
    success: result.data?.success === true,
    transaction: result.data?.transaction,
    network: result.data?.network,
    payer: result.data?.payer,
    reason: result.data?.errorReason,
  }
}

function encodeSettlementHeader(settlement) {
  return Buffer.from(
    JSON.stringify({
      success: settlement.success,
      transaction: settlement.transaction,
      network: settlement.network,
      payer: settlement.payer,
    }),
  ).toString('base64')
}

function challengeResponse(requirements, error, priceUsdc) {
  return {
    statusCode: 402,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT, X-Agent-Handle',
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
    body: JSON.stringify({
      ...challengeBody(requirements, error),
      // Not part of the spec — a convenience for human operators reading the
      // response by hand. Agents use maxAmountRequired.
      priceReference: { usdc: priceUsdc, kes: formatKesReference(priceUsdc), rate: KES_PER_USDC },
    }),
  }
}

/**
 * Wrap a Netlify handler so it requires an x402 payment.
 *
 * Order is verify -> run handler -> settle (spec §2.3). Settling first would
 * charge for an answer we might fail to produce; verifying binds the funds
 * without moving them, which protects both sides.
 */
export function withX402(handler, { resourcePath }) {
  return async (event, context) => {
    const config = getConfig()
    const pricing = priceFor(resourcePath)

    // Fail open on configuration, closed on payment.
    if (!isEnabled() || !pricing) return handler(event, context)

    // Preflight must not be charged.
    if (event.httpMethod === 'OPTIONS') return handler(event, context)

    const resource = resourceUrl(event, config)
    const requirements = buildPaymentRequirements({
      resource,
      priceUsdc: pricing.priceUsdc,
      description: pricing.description,
      mimeType: pricing.mimeType,
      config,
    })

    const headers = event.headers || {}
    const decoded = decodePaymentHeader(headers['x-payment'])
    if (decoded.error) return challengeResponse(requirements, decoded.error, pricing.priceUsdc)

    const verification = await verifyPayment(decoded.payload, requirements, config)
    if (!verification.valid) return challengeResponse(requirements, verification.reason, pricing.priceUsdc)

    const result = await handler(event, context)

    // Never settle for a response the caller cannot use. An agent that pays for
    // a 500 has been robbed; the verified authorization simply goes unused and
    // expires.
    if (result.statusCode >= 400) return result

    const settlement = await settlePayment(decoded.payload, requirements, config)
    if (!settlement.success) {
      // The answer is already produced and the payment was verified. Withholding
      // it now would penalise the buyer for our settlement problem — log and
      // return. Recovering the payment is an operational concern.
      console.error('[x402] settlement failed after delivery', {
        resource,
        reason: settlement.reason,
        handle: headers['x-agent-handle'] || null,
      })
      return result
    }

    return {
      ...result,
      headers: {
        ...(result.headers || {}),
        'X-PAYMENT-RESPONSE': encodeSettlementHeader(settlement),
        'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
      },
    }
  }
}
