import crypto from 'node:crypto'

export const GENESIS_HASH = '0'.repeat(64)

export function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`
  }
  const keys = Object.keys(value).sort()
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`)
  return `{${entries.join(',')}}`
}

export function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}
