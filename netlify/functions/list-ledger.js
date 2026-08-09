import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { formatEntry } from './_shared/formatEntry.js'
import { withX402 } from './_shared/x402.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

const listHandler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from('ledger_entries').select('*').order('id', { ascending: true })

    if (error) {
      return json(500, { error: error.message })
    }

    return json(200, { entries: data.map(formatEntry) })
  } catch (err) {
    return json(500, { error: err.message })
  }
}

export const handler = withX402(listHandler, { resourcePath: '/api/ledger' })
