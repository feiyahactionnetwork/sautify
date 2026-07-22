import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'

// Artist-onboarding ingest (audit §8). Accepts a track's metadata, an explicit
// fingerprint-licence consent, and the locally computed fingerprints, then
// stores them as a catalogue work. No audio is accepted or stored here: the
// device/onboarding client fingerprints the clean master and sends only hashes.

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

const GRANT_TYPES = new Set(['artist_onboarding', 'label_feed', 'licensed_catalogue'])

// Guard against absurd payloads; a full track is typically a few thousand
// landmark hashes, well under this.
const MAX_FINGERPRINTS = 200000

function validate(p) {
  if (!p || typeof p !== 'object') return 'Request body must be a JSON object'
  if (typeof p.title !== 'string' || !p.title.trim()) return 'title is required'
  if (typeof p.artistName !== 'string' || !p.artistName.trim()) return 'artistName is required'
  if (!GRANT_TYPES.has(p.rightsGrantType)) {
    return 'rightsGrantType must be one of: artist_onboarding, label_feed, licensed_catalogue'
  }
  if (typeof p.rightsGrantedBy !== 'string' || !p.rightsGrantedBy.trim()) {
    return 'rightsGrantedBy is required (the party granting the fingerprint licence)'
  }
  // Explicit, auditable consent gate. We never fingerprint without it.
  if (p.rightsGrantAccepted !== true) {
    return 'rightsGrantAccepted must be true (explicit fingerprint-licence consent)'
  }
  if (!Array.isArray(p.fingerprints) || p.fingerprints.length === 0) {
    return 'fingerprints must be a non-empty array of { hash, offset }'
  }
  if (p.fingerprints.length > MAX_FINGERPRINTS) {
    return `fingerprints exceeds the ${MAX_FINGERPRINTS} cap; split the track into batches`
  }
  for (let i = 0; i < p.fingerprints.length; i++) {
    const f = p.fingerprints[i]
    if (!f || typeof f.hash !== 'number' || !Number.isFinite(f.hash) || !Number.isInteger(f.hash)) {
      return `fingerprints[${i}].hash must be an integer`
    }
    if (typeof f.offset !== 'number' || !Number.isInteger(f.offset) || f.offset < 0) {
      return `fingerprints[${i}].offset must be a non-negative integer`
    }
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

  // Normalise the fingerprint array to exactly { hash, offset } so callers can
  // send richer objects without polluting the stored rows.
  const fingerprints = payload.fingerprints.map((f) => ({ hash: f.hash, offset: f.offset }))

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .rpc('ingest_catalog_work', {
        p_isrc: payload.isrc ?? '',
        p_title: payload.title.trim(),
        p_artist_name: payload.artistName.trim(),
        p_rights_grant_type: payload.rightsGrantType,
        p_rights_granted_by: payload.rightsGrantedBy.trim(),
        p_rights_grant_ref: payload.rightsGrantRef ?? '',
        p_fingerprint_version: payload.fingerprintVersion ?? null,
        p_fingerprints: fingerprints,
      })
      .single()

    if (error) {
      // Unique-violation on an already-catalogued ISRC.
      if (error.code === '23505') {
        return json(409, { error: 'A work with this ISRC is already in the catalogue' })
      }
      return json(500, { error: error.message })
    }

    return json(201, {
      id: data.id,
      isrc: data.isrc,
      title: data.title,
      artistName: data.artist_name,
      fingerprintCount: data.fingerprint_count,
      rights: {
        grantType: data.rights_grant_type,
        grantedBy: data.rights_granted_by,
        grantRef: data.rights_grant_ref,
        grantedAt: data.rights_granted_at,
      },
      status: data.status,
      createdAt: data.created_at,
    })
  } catch (err) {
    return json(500, { error: err.message })
  }
}
