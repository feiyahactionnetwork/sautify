// Sautify demo proxy — signs ACRCloud identify requests server-side so
// credentials never reach the browser. Keys come from local .env only.
import 'dotenv/config'
import express from 'express'
import crypto from 'node:crypto'

const app = express()
const PORT = process.env.PORT || 5177

const ACR_HOST = process.env.ACR_HOST || ''
const ACR_ACCESS_KEY = process.env.ACR_ACCESS_KEY || ''
const ACR_ACCESS_SECRET = process.env.ACR_ACCESS_SECRET || ''
const ACR_MOCK = process.env.ACR_MOCK === '1'

const configured = Boolean(ACR_HOST && ACR_ACCESS_KEY && ACR_ACCESS_SECRET)

// Raw audio body, capped at 12 MB (10 s mic clips are ~100 KB; uploads are songs)
app.use('/identify', express.raw({ type: () => true, limit: '12mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, configured: configured || ACR_MOCK, mock: ACR_MOCK })
})

app.post('/identify', async (req, res) => {
  const audio = req.body
  if (!audio || !audio.length) {
    return res.status(400).json({ error: 'empty_audio', message: 'No audio received.' })
  }

  if (ACR_MOCK) {
    // Pipeline test only — clearly flagged so the UI can label it.
    return res.json({
      mock: true,
      title: 'Pipeline Test Track',
      artist: 'Local Mock (not a real detection)',
      album: 'ACR_MOCK=1',
      acrid: 'mock-' + crypto.randomBytes(6).toString('hex'),
      score: 100,
      play_offset_ms: 0,
    })
  }

  if (!configured) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'ACRCloud keys missing — add them to demo-server/.env (see .env.example).',
    })
  }

  try {
    // HMAC-SHA1 signature per ACRCloud identify API v1
    const httpMethod = 'POST'
    const httpUri = '/v1/identify'
    const dataType = 'audio'
    const signatureVersion = '1'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const stringToSign = [httpMethod, httpUri, ACR_ACCESS_KEY, dataType, signatureVersion, timestamp].join('\n')
    const signature = crypto.createHmac('sha1', ACR_ACCESS_SECRET).update(stringToSign).digest('base64')

    const form = new FormData()
    form.append('sample', new Blob([audio]), 'sample.bin')
    form.append('sample_bytes', String(audio.length))
    form.append('access_key', ACR_ACCESS_KEY)
    form.append('data_type', dataType)
    form.append('signature_version', signatureVersion)
    form.append('signature', signature)
    form.append('timestamp', timestamp)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const acrRes = await fetch(`https://${ACR_HOST}${httpUri}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    clearTimeout(timer)

    const data = await acrRes.json()
    const code = data?.status?.code

    if (code === 0) {
      const m = data.metadata?.music?.[0]
      if (!m) return res.status(502).json({ error: 'no_metadata', message: 'Match reported but no metadata returned.' })
      return res.json({
        title: m.title,
        artist: (m.artists || []).map((a) => a.name).join(', '),
        album: m.album?.name || '',
        acrid: m.acrid,
        score: m.score,
        play_offset_ms: m.play_offset_ms ?? null,
      })
    }
    if (code === 1001) {
      return res.status(404).json({ error: 'no_match', message: 'No match found for this audio.' })
    }
    return res.status(502).json({
      error: 'acr_error',
      message: data?.status?.msg || 'Recognition service returned an error.',
      code,
    })
  } catch (err) {
    const timedOut = err?.name === 'AbortError'
    return res.status(504).json({
      error: timedOut ? 'timeout' : 'unreachable',
      message: timedOut ? 'Recognition service timed out.' : 'Recognition service unreachable.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`[demo-server] listening on :${PORT} — ACRCloud ${ACR_MOCK ? 'MOCK MODE' : configured ? 'configured' : 'NOT configured (add .env)'}`)
})
