// EIP-3009 signing for the buyer side (spec §2.2).
//
// This is the only place in the repo that touches a private key. The seller side
// deliberately has no equivalent — it only ever knows a receiving address.
//
// transferWithAuthorization is a gasless meta-transaction: we sign an
// authorisation off-chain, and whoever redeems it pays the gas. That is what
// lets an agent transact without holding native currency or having an account
// anywhere.

import { privateKeyToAccount } from 'viem/accounts'
import { randomBytes } from 'node:crypto'

const CHAIN_IDS = {
  base: 8453,
  'base-sepolia': 84532,
}

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

export function createSigner(privateKey) {
  if (!privateKey) throw new Error('SAUTIFY_AGENT_PRIVATE_KEY is required to sign payments')
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)

  return {
    address: account.address,

    /**
     * Sign an authorisation matching a PaymentRequirements from a 402 response.
     * Returns the PaymentPayload that goes, base64-encoded, in X-PAYMENT.
     */
    async sign(requirements) {
      const chainId = CHAIN_IDS[requirements.network]
      if (!chainId) throw new Error(`Unknown network: ${requirements.network}`)

      const validAfter = 0n
      // Stay inside the seller's stated window, with a small margin for the
      // round trip. Signing for longer than the seller will honour just leaves
      // a redeemable authorisation lying around.
      const lifetime = Math.min(requirements.maxTimeoutSeconds ?? 300, 300)
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + lifetime)
      const nonce = `0x${randomBytes(32).toString('hex')}`

      const authorization = {
        from: account.address,
        to: requirements.payTo,
        value: BigInt(requirements.maxAmountRequired),
        validAfter,
        validBefore,
        nonce,
      }

      const signature = await account.signTypedData({
        domain: {
          name: requirements.extra?.name ?? 'USDC',
          version: requirements.extra?.version ?? '2',
          chainId,
          verifyingContract: requirements.asset,
        },
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message: authorization,
      })

      return {
        x402Version: 1,
        scheme: requirements.scheme,
        network: requirements.network,
        payload: {
          signature,
          // Stringified because the wire format is JSON and these are uint256.
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce,
          },
        },
      }
    },
  }
}
