import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { getEvidenceStore } from './_shared/blobStore.js'
import { canonicalStringify, sha256Hex, GENESIS_HASH } from './_shared/hash.js'
import { formatEntry } from './_shared/formatEntry.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

function validate(payload) {
  if (!payload || typeof payload !== 'object') return 'Request body must be a JSON object'
  if (!payload.venue?.name || !payload.venue?.sbpReference) return 'venue.name and venue.sbpReference are required'
  if (!payload.reportingPeriod?.start || !payload.reportingPeriod?.end) {
    return 'reportingPeriod.start and reportingPeriod.end are required'
  }
  if (!Array.isArray(payload.plays)) return 'plays must be an array'
  if (typeof payload.playCountSummary?.totalPlays !== 'number' || typeof payload.playCountSummary?.uniqueTracks !== 'number') {
    return 'playCountSummary.totalPlays and playCountSummary.uniqueTracks must be numbers'
  }
  if (typeof payload.nrrCrossCheck?.matched !== 'number' || typeof payload.nrrCrossCheck?.unmatched !== 'number') {
    return 'nrrCrossCheck.matched and nrrCrossCheck.unmatched must be numbers'
  }
  return null
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const validationError = validate(payload)
  if (validationError) {
    return json(400, { error: validationError })
  }

  try {
    const supabase = getSupabaseAdmin()

    const payloadHash = sha256Hex(canonicalStringify(payload))

    const store = getEvidenceStore()
    await store.set(payloadHash, JSON.stringify(payload))

    const { data: latest, error: latestError } = await supabase
      .from('ledger_entries')
      .select('chain_hash')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) {
      return json(500, { error: latestError.message })
    }

    const prevHash = latest?.chain_hash ?? GENESIS_HASH
    const chainHash = sha256Hex(prevHash + payloadHash)

    const { data: inserted, error: insertError } = await supabase
      .from('ledger_entries')
      .insert({
        venue_name: payload.venue.name,
        venue_sbp_reference: payload.venue.sbpReference,
        reporting_period_start: payload.reportingPeriod.start,
        reporting_period_end: payload.reportingPeriod.end,
        total_plays: payload.playCountSummary.totalPlays,
        unique_tracks: payload.playCountSummary.uniqueTracks,
        nrr_matched: payload.nrrCrossCheck.matched,
        nrr_unmatched: payload.nrrCrossCheck.unmatched,
        payload_hash: payloadHash,
        blob_key: payloadHash,
        prev_hash: prevHash === GENESIS_HASH ? null : prevHash,
        chain_hash: chainHash,
      })
      .select('*')
      .single()

    if (insertError) {
      return json(500, { error: insertError.message })
    }

    return json(201, formatEntry(inserted))
  } catch (err) {
    return json(500, { error: err.message })
  }
}
