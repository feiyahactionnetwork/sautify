import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { getEvidenceStore } from './_shared/blobStore.js'
import { formatEntry } from './_shared/formatEntry.js'
import { buildDsrFlatFile } from './_shared/dsrExport.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  // event.path is the original request path (/api/ledger/:id/export.dsr); the id
  // is the segment before "export.dsr". Same convention as simulate-settlement.
  const segments = event.path.split('/').filter(Boolean)
  const id = Number(segments[segments.length - 2])
  if (!Number.isInteger(id) || id <= 0) {
    return json(400, { error: 'A valid numeric ledger entry id is required' })
  }

  const params = event.queryStringParameters || {}
  const recipient = typeof params.recipient === 'string' ? params.recipient : undefined
  const territory = typeof params.territory === 'string' ? params.territory : undefined

  try {
    const supabase = getSupabaseAdmin()
    const { data: row, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return json(500, { error: error.message })
    if (!row) return json(404, { error: `Ledger entry ${id} not found` })

    const entry = formatEntry(row)

    // The per-play detail (ISRCs) lives in the evidence blob, not the summary
    // row. Fetch it so the export can emit per-ISRC usage lines; fall back to a
    // summary-only file if the blob is missing or unreadable.
    let payload = null
    try {
      const store = getEvidenceStore()
      const raw = await store.get(row.payload_hash)
      if (raw) payload = JSON.parse(raw)
    } catch {
      payload = null
    }

    const file = buildDsrFlatFile(entry, payload, { recipient, territory })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': `attachment; filename="sautify-dsr-${id}.tsv"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: file,
    }
  } catch (err) {
    return json(500, { error: err.message })
  }
}
