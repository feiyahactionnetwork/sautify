// Runnable demonstration of the Virtual Wallet guardrails (spec §4.2).
//
// SIMULATED — no chain, no keys, no network. The seller and signer are stubs so
// this runs anywhere with `node agent/demo.js`. What is real is the guardrail
// logic and the client's payment flow: those are the same modules used against a
// live endpoint. Only the transport and the signature are faked.

import { VirtualWallet } from './virtualWallet.js'
import { createX402Client } from './x402Client.js'
import { RESOURCES, toBaseUnits, formatKesReference } from '../netlify/functions/_shared/pricing.js'

const ORIGIN = 'https://sautify.co.ke'

// ---- stub seller -----------------------------------------------------------
// Answers 402 with real-shaped PaymentRequirements, then 200 once paid.

function stubResponse(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  }
}

function makeStubSeller() {
  return async function stubFetch(url, options = {}) {
    const path = new URL(url).pathname
    const key = path.startsWith('/api/ledger/') && path.endsWith('/export.dsr') ? '/api/ledger/export.dsr' : path
    const pricing = RESOURCES[key]
    if (!pricing) return stubResponse(404, { error: 'No such resource' })

    if (!options.headers?.['X-PAYMENT']) {
      return stubResponse(402, {
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: 'base-sepolia',
            maxAmountRequired: toBaseUnits(pricing.priceUsdc),
            resource: url,
            description: pricing.description,
            mimeType: pricing.mimeType,
            payTo: '0x0000000000000000000000000000000000000dEmO',
            maxTimeoutSeconds: 300,
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            extra: { name: 'USDC', version: '2' },
          },
        ],
        error: 'X-PAYMENT header is required',
      })
    }

    const settlement = Buffer.from(
      JSON.stringify({ success: true, transaction: '0xsimulated', network: 'base-sepolia' }),
    ).toString('base64')
    return stubResponse(200, { simulated: true, resource: key }, { 'x-payment-response': settlement })
  }
}

const stubSigner = {
  address: '0x0000000000000000000000000000000000000A9e7',
  async sign(requirements) {
    return {
      x402Version: 1,
      scheme: requirements.scheme,
      network: requirements.network,
      payload: { signature: '0xsimulated', authorization: { to: requirements.payTo } },
    }
  },
}

// ---- demo ------------------------------------------------------------------

async function attempt(client, label, url) {
  const { paid, blocked } = await client(url, { method: 'GET' })
  if (blocked) {
    console.log(`  ✗ ${label}\n      blocked: ${blocked.detail.reason} — ${blocked.message}`)
    return
  }
  console.log(`  ✓ ${label}${paid ? ' — paid' : ' — no payment required'}`)
}

async function main() {
  console.log('\nSautify x402 buying agent — SIMULATED (no chain, no keys, no network)\n')

  const wallet = new VirtualWallet({
    label: 'catalogue-research-agent',
    handle: 'research.sautify.cloudflare.pay',
    allowanceUsdc: 0.01,
    maxTransactionUsdc: 0.02,
    allowlist: ['sautify.co.ke'],
  })

  console.log(
    `Allowance ${wallet.remainingUsdc} USDC · per-call cap ${0.02} USDC · allowlist ${wallet.allowlist.join(', ')}`,
  )
  console.log(`Handle: ${wallet.handle} (advisory only — proves nothing)\n`)

  const client = createX402Client({ wallet, signer: stubSigner, fetchImpl: makeStubSeller() })

  console.log('1. Buying catalogue matches at 0.002 USDC each')
  for (let i = 1; i <= 3; i++) {
    await attempt(client, `match #${i}`, `${ORIGIN}/api/catalog/match`)
  }

  console.log('\n2. A DSR export at 0.05 USDC — over the per-call cap')
  await attempt(client, 'export.dsr', `${ORIGIN}/api/ledger/42/export.dsr`)

  console.log('\n3. An endpoint on a host that is not allowlisted')
  await attempt(client, 'evil-sautify.co.ke', 'https://evil-sautify.co.ke/api/catalog/match')

  console.log('\n4. Spending the remaining allowance down to zero')
  for (let i = 1; i <= 4; i++) {
    await attempt(client, `match #${i}`, `${ORIGIN}/api/catalog/match`)
  }

  const s = wallet.summary()
  console.log('\n─── wallet summary ───')
  console.log(`  spent      ${s.spentUsdc} USDC  (${s.spentKes})`)
  console.log(`  remaining  ${s.remainingUsdc} USDC`)
  console.log(`  calls      ${s.calls.settled} settled, ${s.calls.blocked} blocked`)
  console.log(
    `\nPrice reference — catalogue match 0.002 USDC = ${formatKesReference(0.002)}\n` +
      'Display-only FX conversion. Not a licence tariff.\n',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
