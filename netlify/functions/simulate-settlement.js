import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { formatEntry } from './_shared/formatEntry.js'

const DEFAULT_INVOICE_KES = 5000
const ARTIST_SPLIT = 0.7

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  // The netlify.toml redirect forwards /api/ledger/:id/settle here as
  // /.netlify/functions/simulate-settlement/:id (splat), so the id is the
  // last path segment rather than a query param.
  const pathSegments = event.path.split('/').filter(Boolean)
  const id = Number(pathSegments[pathSegments.length - 1])
  if (!Number.isInteger(id) || id <= 0) {
    return json(400, { error: 'A valid numeric ledger entry id is required' })
  }

  let body = {}
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const invoiceAmountKes = typeof body.invoiceAmountKes === 'number' ? body.invoiceAmountKes : DEFAULT_INVOICE_KES

  try {
    const supabase = getSupabaseAdmin()

    const { data: existing, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return json(500, { error: fetchError.message })
    }
    if (!existing) {
      return json(404, { error: `Ledger entry ${id} not found` })
    }
    if (existing.settlement_status === 'settled') {
      return json(409, { error: `Ledger entry ${id} is already settled` })
    }

    const artistAmountKes = Math.round(invoiceAmountKes * ARTIST_SPLIT * 100) / 100
    const adminAmountKes = Math.round((invoiceAmountKes - artistAmountKes) * 100) / 100
    const cmoDisbursementRef = `DEMO-CMO-${id}-${Date.now()}`

    const { data: updated, error: updateError } = await supabase
      .from('ledger_entries')
      .update({
        settlement_status: 'settled',
        invoice_amount_kes: invoiceAmountKes,
        artist_amount_kes: artistAmountKes,
        admin_amount_kes: adminAmountKes,
        cmo_disbursement_ref: cmoDisbursementRef,
        settled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      return json(500, { error: updateError.message })
    }

    return json(200, formatEntry(updated))
  } catch (err) {
    return json(500, { error: err.message })
  }
}
