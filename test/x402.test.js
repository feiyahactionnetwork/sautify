import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isEnabled,
  getConfig,
  buildPaymentRequirements,
  challengeBody,
  decodePaymentHeader,
  resourceUrl,
  withX402,
  X402_VERSION,
} from '../netlify/functions/_shared/x402.js'

const PAY_TO = '0x000000000000000000000000000000000000bEEF'

function enabledEnv(overrides = {}) {
  return { SAUTIFY_X402_PAY_TO: PAY_TO, ...overrides }
}

function encode(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function validPayload(overrides = {}) {
  return {
    x402Version: X402_VERSION,
    scheme: 'exact',
    network: 'base-sepolia',
    payload: { signature: '0xsig', authorization: { to: PAY_TO, value: '2000' } },
    ...overrides,
  }
}

// --- configuration ----------------------------------------------------------

test('x402 is disabled unless a receiving address is configured', () => {
  assert.equal(isEnabled({}), false)
  assert.equal(isEnabled({ SAUTIFY_X402_NETWORK: 'base' }), false)
  assert.equal(isEnabled(enabledEnv()), true)
})

test('config defaults to testnet, never mainnet', () => {
  assert.equal(getConfig({}).network, 'base-sepolia')
  assert.equal(getConfig(enabledEnv()).network, 'base-sepolia')
  assert.equal(getConfig(enabledEnv({ SAUTIFY_X402_NETWORK: 'base' })).network, 'base')
})

test('each known network carries its own USDC asset address', () => {
  const testnet = getConfig(enabledEnv())
  const mainnet = getConfig(enabledEnv({ SAUTIFY_X402_NETWORK: 'base' }))
  assert.match(testnet.asset, /^0x[0-9a-fA-F]{40}$/)
  assert.match(mainnet.asset, /^0x[0-9a-fA-F]{40}$/)
  assert.notEqual(testnet.asset, mainnet.asset)
})

// --- envelope ---------------------------------------------------------------

test('buildPaymentRequirements produces a spec-shaped requirement', () => {
  const r = buildPaymentRequirements({
    resource: 'https://sautify.co.ke/api/catalog/match',
    priceUsdc: 0.002,
    description: 'Fingerprint match',
    mimeType: 'application/json',
    config: getConfig(enabledEnv()),
  })
  assert.equal(r.scheme, 'exact')
  assert.equal(r.maxAmountRequired, '2000')
  assert.equal(r.payTo, PAY_TO)
  assert.equal(r.resource, 'https://sautify.co.ke/api/catalog/match')
  assert.equal(r.maxTimeoutSeconds, 300)
  assert.deepEqual(r.extra, { name: 'USDC', version: '2' })
})

test('challengeBody wraps requirements in an accepts array', () => {
  const body = challengeBody({ scheme: 'exact' }, 'nope')
  assert.equal(body.x402Version, X402_VERSION)
  assert.ok(Array.isArray(body.accepts), 'accepts must be an array so more rails can be added')
  assert.equal(body.accepts.length, 1)
  assert.equal(body.error, 'nope')
})

test('resourceUrl prefers the configured origin over request headers', () => {
  const event = { path: '/api/ledger', headers: { host: 'spoofed.example' } }
  assert.equal(
    resourceUrl(event, { origin: 'https://sautify.co.ke' }),
    'https://sautify.co.ke/api/ledger',
  )
  assert.equal(resourceUrl(event, { origin: '' }), 'https://spoofed.example/api/ledger')
})

// --- header decoding --------------------------------------------------------

test('decodePaymentHeader accepts a well-formed payload', () => {
  const { payload, error } = decodePaymentHeader(encode(validPayload()))
  assert.equal(error, undefined)
  assert.equal(payload.scheme, 'exact')
})

test('decodePaymentHeader rejects malformed and unsupported payloads', () => {
  assert.match(decodePaymentHeader(undefined).error, /required/)
  assert.match(decodePaymentHeader('not-base64-json').error, /valid base64/)
  assert.match(decodePaymentHeader(encode({ x402Version: 99 })).error, /Unsupported x402Version/)
  assert.match(
    decodePaymentHeader(encode(validPayload({ scheme: 'upto' }))).error,
    /Unsupported scheme/,
  )
  assert.match(
    decodePaymentHeader(encode({ x402Version: 1, scheme: 'exact', payload: {} })).error,
    /missing signature or authorization/,
  )
})

// --- wrapper behaviour ------------------------------------------------------

function withEnv(env, fn) {
  const saved = { ...process.env }
  Object.assign(process.env, env)
  return (async () => {
    try {
      return await fn()
    } finally {
      for (const k of Object.keys(env)) delete process.env[k]
      Object.assign(process.env, saved)
    }
  })()
}

function withFetch(impl, fn) {
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return (async () => {
    try {
      return await fn()
    } finally {
      globalThis.fetch = saved
    }
  })()
}

const okHandler = async () => ({ statusCode: 200, headers: {}, body: '{"ok":true}' })
const paidEvent = {
  httpMethod: 'GET',
  path: '/api/ledger',
  headers: { host: 'sautify.co.ke', 'x-payment': encode(validPayload()) },
}

test('withX402 is a pass-through when x402 is not configured', async () => {
  const wrapped = withX402(okHandler, { resourcePath: '/api/ledger' })
  const res = await wrapped({ httpMethod: 'GET', path: '/api/ledger', headers: {} })
  assert.equal(res.statusCode, 200)
})

test('withX402 is a pass-through for an unpriced resource', async () => {
  await withEnv(enabledEnv(), async () => {
    const wrapped = withX402(okHandler, { resourcePath: '/api/not-for-sale' })
    const res = await wrapped({ httpMethod: 'GET', path: '/api/x', headers: {} })
    assert.equal(res.statusCode, 200)
  })
})

test('withX402 challenges with 402 when the payment header is absent', async () => {
  await withEnv(enabledEnv(), async () => {
    const wrapped = withX402(okHandler, { resourcePath: '/api/ledger' })
    const res = await wrapped({ httpMethod: 'GET', path: '/api/ledger', headers: { host: 'sautify.co.ke' } })
    assert.equal(res.statusCode, 402)

    const body = JSON.parse(res.body)
    assert.equal(body.accepts[0].maxAmountRequired, '5000')
    assert.equal(body.accepts[0].payTo, PAY_TO)
    assert.equal(body.priceReference.kes, 'KSh 0.68 (at KSh 135.00/USDC)')
    assert.match(res.headers['Access-Control-Expose-Headers'], /X-PAYMENT-RESPONSE/)
  })
})

test('withX402 verifies, runs the handler, then settles — in that order', async () => {
  const calls = []
  const fakeFetch = async (url) => {
    // Last segment only — the configured facilitator base carries its own path.
    calls.push(new URL(url).pathname.split('/').pop())
    return {
      ok: true,
      json: async () =>
        url.endsWith('/verify')
          ? { isValid: true }
          : { success: true, transaction: '0xdeadbeef', network: 'base-sepolia' },
    }
  }

  await withEnv(enabledEnv(), () =>
    withFetch(fakeFetch, async () => {
      const wrapped = withX402(
        async () => {
          calls.push('handler')
          return { statusCode: 200, headers: {}, body: '{"ok":true}' }
        },
        { resourcePath: '/api/ledger' },
      )
      const res = await wrapped(paidEvent)

      assert.equal(res.statusCode, 200)
      assert.deepEqual(calls, ['verify', 'handler', 'settle'])

      const settlement = JSON.parse(Buffer.from(res.headers['X-PAYMENT-RESPONSE'], 'base64').toString())
      assert.equal(settlement.transaction, '0xdeadbeef')
    }),
  )
})

test('withX402 re-challenges when the facilitator rejects the payment', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ isValid: false, invalidReason: 'insufficient_funds' }) })

  await withEnv(enabledEnv(), () =>
    withFetch(fakeFetch, async () => {
      let ran = false
      const wrapped = withX402(
        async () => {
          ran = true
          return { statusCode: 200, headers: {}, body: '{}' }
        },
        { resourcePath: '/api/ledger' },
      )
      const res = await wrapped(paidEvent)

      assert.equal(res.statusCode, 402)
      assert.equal(JSON.parse(res.body).error, 'insufficient_funds')
      assert.equal(ran, false, 'the handler must not run for an unverified payment')
    }),
  )
})

test('withX402 does not settle when the handler errors', async () => {
  const calls = []
  const fakeFetch = async (url) => {
    // Last segment only — the configured facilitator base carries its own path.
    calls.push(new URL(url).pathname.split('/').pop())
    return { ok: true, json: async () => ({ isValid: true, success: true }) }
  }

  await withEnv(enabledEnv(), () =>
    withFetch(fakeFetch, async () => {
      const wrapped = withX402(async () => ({ statusCode: 500, headers: {}, body: '{"error":"boom"}' }), {
        resourcePath: '/api/ledger',
      })
      const res = await wrapped(paidEvent)

      assert.equal(res.statusCode, 500)
      // Charging for an answer the caller cannot use would be theft.
      assert.deepEqual(calls, ['verify'])
      assert.equal(res.headers['X-PAYMENT-RESPONSE'], undefined)
    }),
  )
})

test('withX402 still returns the answer when settlement fails after delivery', async () => {
  const fakeFetch = async (url) =>
    url.endsWith('/verify')
      ? { ok: true, json: async () => ({ isValid: true }) }
      : { ok: false, json: async () => ({ error: 'facilitator down' }) }

  await withEnv(enabledEnv(), () =>
    withFetch(fakeFetch, async () => {
      const wrapped = withX402(okHandler, { resourcePath: '/api/ledger' })
      const res = await wrapped(paidEvent)
      // Verified, work done — withholding it now would penalise the buyer for
      // our settlement problem.
      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['X-PAYMENT-RESPONSE'], undefined)
    }),
  )
})
