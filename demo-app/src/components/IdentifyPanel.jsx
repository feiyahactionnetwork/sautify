import { useEffect, useRef, useState } from 'react'

const RECORD_SECONDS = 10

async function postAudio(blob) {
  const res = await fetch('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || 'Identification failed.')
    err.code = data.error
    throw err
  }
  return data
}

export default function IdentifyPanel({ onMatch, svc }) {
  const [phase, setPhase] = useState('idle') // idle | recording | sending | error | matched | nomatch
  const [message, setMessage] = useState(null)
  const [countdown, setCountdown] = useState(RECORD_SECONDS)
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef(null)
  const stopRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => () => stopRef.current?.(), [])

  const serviceDown = svc.state === 'down' || svc.state === 'unconfigured'

  async function send(blob, source) {
    setPhase('sending')
    setMessage(null)
    try {
      const match = await postAudio(blob)
      setPhase('matched')
      setMessage(`Matched: ${match.title} — ${match.artist} (score ${match.score})`)
      onMatch({ ...match, source })
    } catch (err) {
      if (err.code === 'no_match') {
        setPhase('nomatch')
        setMessage('No match found — try holding the mic closer to the speaker, or use file upload.')
      } else {
        setPhase('error')
        setMessage('Recognition service unreachable — running simulated feed.')
      }
    }
  }

  async function startRecording() {
    setMessage(null)
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setPhase('error')
      setMessage('Microphone unavailable or permission denied — use file upload below instead.')
      return
    }

    setPhase('recording')
    setCountdown(RECORD_SECONDS)

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const freq = new Uint8Array(analyser.frequencyBinCount)

    let raf
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      analyser.getByteFrequencyData(freq)
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const bars = 48
      const step = Math.floor(freq.length / bars)
      for (let i = 0; i < bars; i++) {
        const v = freq[i * step] / 255
        const bh = Math.max(2, v * h * 0.9)
        ctx.fillStyle = v > 0.72 ? '#FFB224' : '#3ECF8E'
        ctx.fillRect((i * w) / bars + 1, h - bh, w / bars - 2, bh)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)

    const finished = new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }))
    })

    let secs = RECORD_SECONDS
    const timer = setInterval(() => {
      secs -= 1
      setCountdown(secs)
      if (secs <= 0) stop()
    }, 1000)

    let stopped = false
    function stop() {
      if (stopped) return
      stopped = true
      clearInterval(timer)
      cancelAnimationFrame(raf)
      if (rec.state !== 'inactive') rec.stop()
      stream.getTracks().forEach((t) => t.stop())
      audioCtx.close()
    }
    stopRef.current = stop

    rec.start()
    const blob = await finished
    stopRef.current = null
    send(blob, 'microphone')
  }

  function cancelRecording() {
    stopRef.current?.()
    stopRef.current = null
    setPhase('idle')
    setMessage(null)
  }

  function handleFiles(files) {
    const f = files?.[0]
    if (!f) return
    if (!/audio|mpeg|wav|mp3|m4a|flac|ogg/i.test(f.type + f.name)) {
      setPhase('error')
      setMessage('Please drop an audio file (MP3 or WAV).')
      return
    }
    send(f, 'upload')
  }

  const busy = phase === 'recording' || phase === 'sending'

  return (
    <div className="panel">
      <div className="panel-title">
        Identify live
        <span className="spacer" />
        {svc.mock && <span className="pill amber">mock mode — matches are not real</span>}
        {serviceDown && <span className="pill">offline — simulated feed only</span>}
      </div>

      <div className="identify-actions">
        {phase !== 'recording' ? (
          <button className="btn primary" onClick={startRecording} disabled={busy}>
            {phase === 'sending' ? 'Identifying…' : `● Identify live (${RECORD_SECONDS}s mic)`}
          </button>
        ) : (
          <button className="btn danger" onClick={cancelRecording}>
            ■ Stop ({countdown}s)
          </button>
        )}
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          Upload audio file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
          hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {phase === 'recording' && (
        <div style={{ marginTop: 12 }}>
          <canvas ref={canvasRef} className="waveform" width={640} height={56} aria-label="Microphone level" />
        </div>
      )}

      <div
        className={`drop ${dragOver ? 'over' : ''}`}
        style={{ marginTop: 12 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      >
        …or drag an MP3/WAV here — the fallback if room acoustics defeat the mic
      </div>

      {message && (
        <div
          className={`notice ${phase === 'matched' ? 'ok' : phase === 'error' ? (serviceDown ? 'warn' : 'err') : 'warn'}`}
          style={{ marginTop: 12 }}
          role="status"
        >
          {message}
        </div>
      )}
    </div>
  )
}
