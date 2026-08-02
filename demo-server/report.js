// Reads listener-log.jsonl (written only for real ACRCloud matches, never
// mock) and prints a summary. Run: node report.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_PATH = path.join(__dirname, 'listener-log.jsonl')

if (!fs.existsSync(LOG_PATH)) {
  console.log('No listener-log.jsonl yet — no real detections logged so far.')
  console.log('Run the Listener page for a while, then re-run this report.')
  process.exit(0)
}

const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean)
const entries = lines.map((l) => JSON.parse(l))

if (entries.length === 0) {
  console.log('Log file exists but is empty — no real detections yet.')
  process.exit(0)
}

const byVenue = {}
const uniqueTracks = new Set()
for (const e of entries) {
  byVenue[e.venue] = (byVenue[e.venue] || 0) + 1
  uniqueTracks.add(`${e.title} — ${e.artist}`)
}

const first = entries[0].at
const last = entries[entries.length - 1].at

console.log(`Real detections logged: ${entries.length}`)
console.log(`Unique tracks identified: ${uniqueTracks.size}`)
console.log(`First detection: ${first}`)
console.log(`Last detection:  ${last}`)
console.log('')
console.log('By venue:')
for (const [venue, count] of Object.entries(byVenue)) {
  console.log(`  ${venue}: ${count}`)
}
console.log('')
console.log('Most recent 10:')
for (const e of entries.slice(-10)) {
  console.log(`  ${e.at}  [${e.venue}]  ${e.title} — ${e.artist}  (score ${e.score})`)
}
