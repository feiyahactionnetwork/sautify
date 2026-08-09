// Virtual Wallet — spend guardrails for an autonomous buying agent (spec §4.2).
//
// The model is the one Cloudflare describes for Virtual Wallets, implemented
// against the open x402 protocol rather than their unreleased API: an allowance,
// an allowlist, and a maximum transaction size. It is the right shape regardless
// of who ships it, and it is what makes letting an agent spend money tolerable.
//
// Accounting is in USDC base units as BigInt throughout. Money in floats drifts,
// and a guardrail that drifts is not a guardrail.

import { toBaseUnits, fromBaseUnits, formatKesReference } from '../netlify/functions/_shared/pricing.js'

export class GuardrailError extends Error {
  constructor(reason, detail) {
    super(reason)
    this.name = 'GuardrailError'
    this.detail = detail
  }
}

export class VirtualWallet {
  /**
   * @param {object} opts
   * @param {string} opts.label            Human name for the agent, for the ledger.
   * @param {number|string} opts.allowanceUsdc        Lifetime ceiling for this wallet.
   * @param {number|string} opts.maxTransactionUsdc   Per-call ceiling.
   * @param {string[]} opts.allowlist      Hostnames the agent may pay. Empty = pay nothing.
   * @param {string} [opts.handle]         Optional advisory identity (spec §5).
   */
  constructor({ label, allowanceUsdc, maxTransactionUsdc, allowlist = [], handle }) {
    this.label = label
    this.handle = handle
    this.allowance = BigInt(toBaseUnits(allowanceUsdc))
    this.maxTransaction = BigInt(toBaseUnits(maxTransactionUsdc))
    this.allowlist = allowlist.map((h) => h.toLowerCase())
    this.committed = 0n
    this.ledger = []
  }

  get spentUsdc() {
    return fromBaseUnits(this.committed.toString())
  }

  get remainingUsdc() {
    return fromBaseUnits((this.allowance - this.committed).toString())
  }

  isAllowedHost(resource) {
    let host
    try {
      host = new URL(resource).hostname.toLowerCase()
    } catch {
      return false
    }
    // Exact host, or a subdomain of an allowlisted host. Note the leading dot:
    // it stops "evil-sautify.co.ke" matching an allowlisted "sautify.co.ke".
    return this.allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
  }

  /**
   * Decide whether a payment may be made. Pure — records nothing.
   * Checks run cheapest-and-clearest first so denial reasons are useful.
   */
  check({ resource, amountBase }) {
    const amount = BigInt(amountBase)

    if (amount <= 0n) {
      return { allowed: false, reason: 'invalid_amount', message: 'Payment amount must be positive' }
    }
    if (!this.isAllowedHost(resource)) {
      return {
        allowed: false,
        reason: 'not_allowlisted',
        message: `${resource} is not on this wallet's allowlist`,
      }
    }
    if (amount > this.maxTransaction) {
      return {
        allowed: false,
        reason: 'exceeds_max_transaction',
        message: `Payment of ${fromBaseUnits(amount.toString())} USDC exceeds the per-call cap of ${fromBaseUnits(this.maxTransaction.toString())} USDC`,
      }
    }
    if (this.committed + amount > this.allowance) {
      return {
        allowed: false,
        reason: 'exceeds_allowance',
        message: `Payment of ${fromBaseUnits(amount.toString())} USDC exceeds the remaining allowance of ${this.remainingUsdc} USDC`,
      }
    }

    return { allowed: true }
  }

  /**
   * Check and commit in one step, returning a handle the caller can release.
   *
   * Commit happens BEFORE signing, deliberately. Once an EIP-3009 authorization
   * is signed it can be settled by the seller at any point until it expires, so
   * from the wallet's perspective the money is already gone. Optimistic
   * accounting here would let a slow settle open a window to overspend.
   */
  reserve({ resource, amountBase, description }) {
    const verdict = this.check({ resource, amountBase })
    const entry = {
      at: new Date().toISOString(),
      resource,
      description: description || null,
      amountUsdc: fromBaseUnits(BigInt(amountBase).toString()),
      allowed: verdict.allowed,
      reason: verdict.reason || 'ok',
      message: verdict.message || null,
      status: verdict.allowed ? 'reserved' : 'blocked',
    }
    this.ledger.push(entry)

    if (!verdict.allowed) {
      throw new GuardrailError(verdict.message, { reason: verdict.reason, entry })
    }

    this.committed += BigInt(amountBase)
    return {
      settle: (transaction) => {
        entry.status = 'settled'
        entry.transaction = transaction || null
      },
      // Only call this when the request definitively failed with no settlement
      // header — i.e. we know the authorization was never used.
      release: () => {
        if (entry.status !== 'reserved') return
        this.committed -= BigInt(amountBase)
        entry.status = 'released'
      },
    }
  }

  summary() {
    const settled = this.ledger.filter((e) => e.status === 'settled')
    const blocked = this.ledger.filter((e) => e.status === 'blocked')
    return {
      label: this.label,
      handle: this.handle || null,
      spentUsdc: this.spentUsdc,
      remainingUsdc: this.remainingUsdc,
      spentKes: formatKesReference(Number(this.spentUsdc)),
      calls: { settled: settled.length, blocked: blocked.length, total: this.ledger.length },
    }
  }
}
