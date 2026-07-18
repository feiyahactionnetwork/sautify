import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { formatEntry } from './_shared/formatEntry.js'
import { computeTariff, splitSeventyThirty, TariffError } from './_shared/tariffEngine.js'

const DEFAULT_INVOICE_KES = 5000
const MS_PER_DAY = 1000 * 60 * 60 * 24

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

  // event.path reflects the original request path (/api/ledger/:id/settle),
  // not the rewritten function path, even though the netlify.toml redirect
  // is what routed this request here. The id is the segment before "settle".
  const pathSegments = event.path.split('/').filter(Boolean)
  const id = Number(pathSegments[pathSegments.length - 2])
  if (!Number.isInteger(id) || id <= 0) {
    return json(400, { error: 'A valid numeric ledger entry id is required' })
  }

  let body = {}
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

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

    // Invoice amount precedence: explicit amount in the request body, then a
    // gazetted-tariff computation prorated to the entry's reporting period,
    // then the legacy flat demo default.
    let invoiceAmountKes
    if (typeof body.invoiceAmountKes === 'number') {
      invoiceAmountKes = body.invoiceAmountKes
    } else if (body.userCategory && body.venueClass) {
      const periodMs =
        new Date(existing.reporting_period_end).getTime() - new Date(existing.reporting_period_start).getTime()
      const periodDays = Math.min(366, Math.max(1, Math.round(periodMs / MS_PER_DAY)))
      try {
        const tariff = computeTariff({
          userCategory: body.userCategory,
          venueClass: body.venueClass,
          grossRevenueKes: body.grossRevenueKes,
          units: body.units ?? 1,
          periodDays,
        })
        invoiceAmountKes = tariff.proratedTariffKes
      } catch (err) {
        if (err instanceof TariffError) return json(400, { error: err.message })
        throw err
      }
    } else {
      invoiceAmountKes = DEFAULT_INVOICE_KES
    }

    const { artistAmountKes, adminAmountKes } = splitSeventyThirty(invoiceAmountKes)
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
