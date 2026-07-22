// The on-device Listener agent (audit §1/§2).
//
// Flow per capture: take a short PCM clip -> fingerprint it locally -> build a
// compact hash-only message -> publish over MQTT. If the transport is offline,
// the message goes to the durable buffer and is flushed on reconnect. Raw audio
// is never buffered or transmitted; it is discarded the instant fingerprints are
// extracted.

export const TOPIC_ROOT = 'sautify/v1/listener'

export function fingerprintTopic(deviceId) {
  return `${TOPIC_ROOT}/${deviceId}/fp`
}

export class Listener {
  /**
   * @param {object} o
   * @param {string} o.deviceId
   * @param {string} o.venueSbpRef  Single Business Permit reference of the premises.
   * @param {object} o.transport    { publish, onConnect, connected }
   * @param {object} o.buffer       OfflineBuffer
   * @param {(pcm:Buffer)=>Array<{hash,offset}>} o.fingerprinter
   * @param {string} o.fpVersion
   * @param {(msg:string)=>void} [o.log]
   */
  constructor({ deviceId, venueSbpRef, transport, buffer, fingerprinter, fpVersion, log = () => {} }) {
    this.deviceId = deviceId
    this.venueSbpRef = venueSbpRef
    this.transport = transport
    this.buffer = buffer
    this.fingerprinter = fingerprinter
    this.fpVersion = fpVersion
    this.log = log
    this.topic = fingerprintTopic(deviceId)

    // Flush anything buffered whenever the link (re)connects.
    this.transport.onConnect(() => this.flush())
  }

  buildMessage(fp, capturedAt) {
    return {
      v: 1,
      deviceId: this.deviceId,
      venueSbpRef: this.venueSbpRef,
      capturedAt: capturedAt.toISOString(),
      fpVersion: this.fpVersion,
      // Compact wire form: array of [hash, offset] pairs, not objects, to keep
      // the message tiny. Never any audio.
      fp: fp.map((p) => [p.hash, p.offset]),
    }
  }

  // Capture -> fingerprint -> publish (or buffer). Returns the sent message and
  // a byte-size comparison so callers can show the bandwidth win over raw audio.
  async captureAndReport(pcm, capturedAt = new Date()) {
    const fp = this.fingerprinter(pcm) // local fingerprinting; pcm is discarded after
    const msg = this.buildMessage(fp, capturedAt)
    const bytes = Buffer.byteLength(JSON.stringify(msg))

    let status
    try {
      await this.transport.publish(this.topic, msg)
      status = 'published'
    } catch {
      this.buffer.enqueue({ topic: this.topic, msg })
      status = 'buffered'
    }
    this.log(
      `[${this.deviceId}] ${status}: ${fp.length} hashes, ${bytes} B on the wire ` +
        `(raw clip was ${pcm.length} B — ${(pcm.length / bytes).toFixed(0)}x larger)`,
    )
    return { msg, bytes, rawBytes: pcm.length, status }
  }

  async flush() {
    if (!this.transport.connected) return
    const { delivered, remaining } = await this.buffer.drain((rec) =>
      this.transport.publish(rec.topic, rec.msg),
    )
    if (delivered > 0) this.log(`[${this.deviceId}] flushed ${delivered} buffered message(s); ${remaining} remaining`)
  }
}
