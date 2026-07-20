import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'

// Scheduled function (cron configured in netlify.toml). Its only job is to run a
// tiny query against Supabase every few days so the free-tier project registers
// activity and doesn't auto-pause. A paused database refuses connections, which
// would break the Transparency Ledger demo until manually restored.
export const handler = async () => {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('ledger_entries').select('id').limit(1)

    if (error) {
      console.error('keep-alive ping failed:', error.message)
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, pingedAt: new Date().toISOString() }),
    }
  } catch (err) {
    console.error('keep-alive ping threw:', err.message)
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
