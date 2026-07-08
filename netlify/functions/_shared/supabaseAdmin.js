import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

// @supabase/realtime-js requires a global WebSocket implementation and throws at
// client-construction time if one isn't present. Netlify Functions run on a Node
// version without a native WebSocket global, so polyfill it even though this app
// never actually opens a realtime channel.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket
}

let client = null

export function getSupabaseAdmin() {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}
