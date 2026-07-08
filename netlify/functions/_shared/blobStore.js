import { getStore } from '@netlify/blobs'

export function getEvidenceStore() {
  return getStore({ name: 'ledger-evidence' })
}
