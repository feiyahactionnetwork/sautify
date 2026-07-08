import { getStore } from '@netlify/blobs'

// This site's Netlify site ID (not secret, already visible in dashboard URLs).
// Used as a fallback since automatic siteID injection has proven unreliable on
// this account (see the token fallback below for the same reason).
const FALLBACK_SITE_ID = '06553080-815b-43a1-bb86-32a52c0a7d94'

// Netlify's automatic siteID/token injection for Blobs is intermittently broken
// (a known issue per Netlify's own support forums), so configure explicitly.
export function getEvidenceStore() {
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID || FALLBACK_SITE_ID
  const token = process.env.NETLIFY_BLOBS_TOKEN

  if (token) {
    return getStore({ name: 'ledger-evidence', siteID, token })
  }
  return getStore({ name: 'ledger-evidence' })
}
