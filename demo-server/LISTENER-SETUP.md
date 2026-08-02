# Getting a real prototype running this week

No Raspberry Pi required to start. This turns any laptop with a browser and a
mic into a real, unattended detection device today. Migrating the same logic
onto an actual Pi later is a mechanical follow-on step, not a blocker.

## What this actually is

`listener.html` is a page that loops forever: record 10 seconds of real
audio from the mic, send it to ACRCloud through the already-working
`/identify` proxy, show the result, wait 50 seconds, repeat. Every real
match (never mock, never simulated) gets appended to
`demo-server/listener-log.jsonl` on disk. That file, once it has real
entries in it, is your proof: real timestamps, real track titles, real
confidence scores, accumulated while nobody was touching the laptop.

## Start it (5 minutes)

1. Make sure `demo-server/.env` has your real ACRCloud keys and `ACR_MOCK=0`
   (or the line removed). Confirm by checking `npm run demo` output says
   "configured" not "MOCK MODE."
2. From the repo root: `npm run demo`
3. Open **http://localhost:5175/listener.html** in Chrome
4. Grant microphone permission when asked
5. Type a venue/location label (for this week, just where the laptop is
   physically sitting is fine, e.g. "Home desk" or a real venue's name if
   you've got one)
6. Click **Start listening**
7. Leave the tab open and visible. Do not close it, do not put the laptop
   to sleep. Plug in the charger.

## Where to point the mic

Easiest today: play a real radio station or a real playlist from a speaker
near the laptop for a few hours. That is genuinely real ambient audio, not
staged, and it proves the pipeline end to end without needing anyone's
permission.

Better, if you can arrange it this week: ask one venue you already know for
a few hours to leave a laptop running on a counter. That is the actual
pitch, demonstrated for real, not simulated.

## Checking progress

Anytime, from the `demo-server` directory: `node report.js`

Prints total real detections, unique tracks, first and last timestamp, and
a breakdown by venue label. If it says "No listener-log.jsonl yet," nothing
real has been detected yet, either the mic isn't hearing music or the tab
got closed.

## Cost note

Every cycle is one ACRCloud request, about 60 requests/hour if left running
continuously. Your actual ACRCloud rate is behind a console login and may
differ, but public reseller pricing puts it around $0.004 to $0.005 per
request, so roughly $0.25 to $0.30/hour. Run it 8 hours a day for a week
and that is in the neighborhood of $15. Leave it running 24/7 for a week
and it is closer to $45. Not free, not scary, but check your actual
ACRCloud plan and usage dashboard partway through the week rather than
finding out at the end. If you want to cut the rate, open
`demo-app/public/listener.html` and increase `GAP_MS` (currently 50000,
i.e. 50 seconds between cycles).

## Moving to an actual Raspberry Pi later

Nothing about this week's proof is wasted. The Pi version is the same
concept, arecord instead of a browser mic, running as a background service
instead of a browser tab, but the server side, the ACRCloud signing, the
logging, all of it stays identical. Get the laptop version producing real
logged detections first. The hardware migration is real engineering work,
but it is no longer the thing standing between you and a working prototype.
