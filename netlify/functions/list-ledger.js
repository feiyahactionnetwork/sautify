import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { formatEntry } from './_shared/formatEntry.js'

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
