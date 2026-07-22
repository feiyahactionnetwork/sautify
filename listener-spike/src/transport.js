// Transport (audit §2): lightweight hash messages over MQTT.
//
// Two implementations behind one interface { publish(topic, obj), onConnect(cb),
// connected }:
//
//   MqttTransport      — real broker (e.g. Mosquitto). QoS 1. Lazily requires the
//                        `mqtt` package so the loopback demo needs no install.
//   LoopbackTransport  — in-process, for the runnable demo and tests. Delivers
//                        straight to a subscriber; `online` can be toggled to
//                        simulate a connectivity drop so offline buffering shows.
//
// MQTT is the right fit for the fleet: many low-power, intermittently-connected
// devices publishing tiny messages, with QoS + last-will for liveness. Raw audio
// never travels this path — only { hash, offset } pairs.

export class LoopbackTransport {
  constructor() {
    this.online = true
    this.subscribers = new Map() // topicPrefix -> handler
    this._connectCbs = []
  }

  get connected() {
    return this.online
  }

  subscribe(topicPrefix, handler) {
    this.subscribers.set(topicPrefix, handler)
  }

  onConnect(cb) {
    this._connectCbs.push(cb)
    if (this.online) cb()
  }

  // Simulate the link going down / coming back. Coming back fires onConnect,
  // which is what triggers the listener to drain its offline buffer.
  setOnline(v) {
    const was = this.online
    this.online = v
    if (v && !was) this._connectCbs.forEach((cb) => cb())
  }

  async publish(topic, obj) {
    if (!this.online) throw new Error('offline')
    for (const [prefix, handler] of this.subscribers) {
      if (topic.startsWith(prefix)) await handler(topic, obj)
    }
  }
}

export class MqttTransport {
  constructor(url, { clientId, will } = {}) {
    this.url = url
    this.clientId = clientId
    this.will = will
    this.client = null
    this._connectCbs = []
  }

  get connected() {
    return Boolean(this.client?.connected)
  }

  async connect() {
    // Lazy import so the demo/tests don't require the dependency.
    const { default: mqtt } = await import('mqtt')
    this.client = mqtt.connect(this.url, {
      clientId: this.clientId,
      clean: false, // persistent session so QoS-1 messages survive brief drops
      reconnectPeriod: 2000,
      will: this.will, // last-will marks the device offline for fleet liveness
    })
    this.client.on('connect', () => this._connectCbs.forEach((cb) => cb()))
    return new Promise((resolve) => this.client.once('connect', resolve))
  }

  onConnect(cb) {
    this._connectCbs.push(cb)
    if (this.connected) cb()
  }

  publish(topic, obj) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new Error('offline'))
      this.client.publish(topic, JSON.stringify(obj), { qos: 1 }, (err) =>
        err ? reject(err) : resolve(),
      )
    })
  }
}
