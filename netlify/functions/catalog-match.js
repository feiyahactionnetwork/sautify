import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'

// Match a batch of query fingerprints against the catalogue (audit §8, and the
// read-path that the §1/§2 on-device pipeline will call instead of ACRCloud).
// The device fingerprints ambient audio locally and posts only { hash, offset }
// pairs; this endpoint returns candidate works ranked by aligned-hash votes.

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

const MAX_QUERY = 50000

function validate(p) {
  if (!p || typeof p !== 'object') return 'Request body must be a JSON object'
  if (!Array.isArray(p.query) || p.query.length === 0) {
    return 'query must be a non-empty array of { hash, offset }'
  }
  if (p.query.length > MAX_QUERY) return `query exceeds the ${MAX_QUERY} cap`
  for (let i = 0; i < p.query.length; i++) {
    const f = p.query[i]
    if (!f || typeof f.hash !== 'number' || !Number.isInteger(f.hash)) {
      return `query[${i}].hash must be an integer`
    }
    if (typeof f.offset !== 'number' || !Number.isInteger(f.offset) || f.offset < 0) {
      return `query[${i}].offset must be a non-negative integer`
    }
  }
  if (p.minVotes !== undefined && (!Number.isInteger(p.minVotes) || p.minVotes < 1)) {
    return 'minVotes must be a positive integer'
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

  const query = payload.query.map((f) => ({ hash: f.hash, offset: f.offset }))
  const minVotes = payload.minVotes ?? 5

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('match_catalog_fingerprints', {
      p_query: query,
      p_min_votes: minVotes,
    })

    if (error) return json(500, { error: error.message })

    const candidates = (data || []).map((row) => ({
      workId: row.work_id,
      votes: Number(row.votes),
      timeDelta: row.t_delta,
    }))

    // Enrich the top candidate with work metadata so the caller gets a usable
    // "this is what played" answer, not just an id.
    let best = null
    if (candidates.length > 0) {
      const top = candidates[0]
      const { data: work } = await supabase
        .from('catalog_works')
        .select('id, isrc, title, artist_name')
        .eq('id', top.workId)
        .maybeSingle()
      best = work
        ? { workId: work.id, isrc: work.isrc, title: work.title, artistName: work.artist_name, votes: top.votes }
        : null
    }

    return json(200, { matched: Boolean(best), best, candidates })
  } catch (err) {
    return json(500, { error: err.message })
  }
}
