// x402 buying client (spec §4.2).
//
// Wraps fetch so a 402 is handled transparently: read the requirements, run them
// past the Virtual Wallet's guardrails, sign, retry once.
//
// "Retry once" is load-bearing. An agent that keeps paying in response to
// repeated 402s can drain a wallet against a broken or hostile endpoint, so a
// single payment attempt per call is the only safe policy.

import { GuardrailError } from './virtualWallet.js'

const SUPPORTED_SCHEMES = new Set(['exact'])

export function decodeSettlement(header) {
  if (!header) return null
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

/**
 * Pick a payment requirement we can actually satisfy.
 * `accepts` may offer several rails; we take the first supported one.
 */
export function selectRequirements(accepts, { networks }) {
  if (!Array.isArray(accepts)) return null
  return (
    accepts.find((r) => SUPPORTED_SCHEMES.has(r?.scheme) && networks.includes(r?.network)) || null
  )
}

export function createX402Client({ wallet, signer, networks = ['base-sepolia', 'base'], fetchImpl = fetch }) {
  return async function payingFetch(url, options = {}) {
    const first = await fetchImpl(url, options)
    if (first.status !== 402) return { response: first, paid: false }

    const challenge = await first.json().catch(() => null)
    const requirements = selectRequirements(challenge?.accepts, { networks })
    if (!requirements) {
      throw new Error(
        `No payable option at ${url}: offered ${JSON.stringify(challenge?.accepts ?? null)}`,
      )
    }

    // Guardrails run before signing, so a blocked payment is never signed and
    // therefore can never be broadcast (spec §4.2).
    let reservation
    try {
      reservation = wallet.reserve({
        resource: requirements.resource || url,
        amountBase: requirements.maxAmountRequired,
        description: requirements.description,
      })
    } catch (err) {
      if (err instanceof GuardrailError) return { response: first, paid: false, blocked: err }
      throw err
    }

    let paymentPayload
    try {
      paymentPayload = await signer.sign(requirements)
    } catch (err) {
      reservation.release()
      throw err
    }

    const headers = {
      ...(options.headers || {}),
      'X-PAYMENT': Buffer.from(JSON.stringify(paymentPayload)).toString('base64'),
    }
    // Advisory identity only — proves nothing, and the seller must not treat it
    // as authentication (spec §5).
    if (wallet.handle) headers['X-Agent-Handle'] = wallet.handle

    const second = await fetchImpl(url, { ...options, headers })
    const settlement = decodeSettlement(second.headers.get('x-payment-response'))

    if (settlement?.success) {
      reservation.settle(settlement.transaction)
    } else if (!second.ok && !settlement) {
      // No settlement header and the call failed: the authorisation was never
      // used, so the funds are genuinely still ours.
      reservation.release()
    }
    // Deliberate gap: a 2xx with no settlement header stays *reserved*, not
    // released. We cannot prove the seller did not settle out of band, and
    // assuming in our own favour is how wallets overspend.

    return { response: second, paid: Boolean(settlement?.success), settlement, requirements }
  }
}
