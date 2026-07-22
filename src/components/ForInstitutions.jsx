import Reveal from './Reveal'
import AnimatedText from './AnimatedText'
import { mailto } from '../constants'

const evidencePackage = [
  'Verified play logs, keyed on ISRC, for every reporting period',
  'Catalogue match rates cross-checked against publicly registered NRR works data',
  'A hash-chained audit trail any party can independently recompute and verify',
  'Usage exports mapped to the DDEX DSR standard, ready to ingest',
]

export default function ForInstitutions() {
  return (
    <section id="for-institutions" className="py-24 md:py-32 px-6 bg-ink border-y border-line scroll-mt-16">
      <div className="max-w-4xl mx-auto">
        <AnimatedText
          as="h2"
          stagger={30}
          className="text-3xl md:text-5xl font-bold text-center text-fg leading-tight"
          segments={[
            { text: 'How Sautify Works ' },
            { text: 'for Institutions', className: 'text-gold' },
          ]}
        />

        {/* Shared intro (audit §5.1) — establishes the bounded, vendor role up front. */}
        <AnimatedText
          as="p"
          stagger={12}
          baseDelay={200}
          className="mt-8 max-w-3xl mx-auto text-center text-lg text-muted leading-relaxed"
          text="Sautify is an independent music-compliance data layer for Kenya. We produce verified, tamper-evident evidence of which songs are actually played in licensed venues, and hand that evidence to the licensed Collective Management Organisations who collect and distribute royalties. Sautify does not set tariffs and does not collect or pay royalties. We make the data honest; the licensed CMO does the rest."
        />

        {/* Institutional track — for PAVRISK, advertisers, labels. Professional
            Kenyan business English (audit §5.2). */}
        <Reveal delay={200}>
          <div className="mt-16 rounded-2xl border border-line bg-card p-8 md:p-12">
            <h3 className="text-xl md:text-2xl font-bold text-fg">
              For CMOs, advertisers, and rights holders
            </h3>

            <div className="mt-6 space-y-5 text-muted leading-relaxed">
              <p>
                Today, distribution of public-performance royalties in Kenya relies substantially on surveys and
                estimates, because there has been no mechanism to record what is genuinely played on the ground.
                Sautify closes that gap. We deploy low-cost, locked-down listening devices in licensed premises,
                not personal phones, so that the resulting play data remains independent and verifiable. Each
                device is bound to the venue's Single Business Permit reference, ensuring every detection is
                attributable to a specific licensed premises.
              </p>
              <p>
                For each reporting period, Sautify delivers an evidence package to the licensed CMO: verified play
                logs, catalogue match rates cross-checked against publicly registered National Rights Registry
                works data, and a hash-chained audit trail that any party, whether the CMO, an artist, or an
                external auditor, can independently recompute and verify. Our reporting is NRR-compatible, built for
                eCitizen reconciliation, and designed around published CMO licence conditions (KECOBO Consolidated
                Tariffs 2026&ndash;28). Play-usage exports map to the DDEX DSR usage-reporting standard, keyed on
                ISRC, so the data can be ingested into existing royalty-processing workflows rather than re-keyed by
                hand.
              </p>
              <p>
                Sautify's role is deliberately bounded. We do not license music, set tariffs, hold funds, or
                disburse royalties. We provide the independent, auditable evidence that allows a licensed CMO to
                distribute what is genuinely owed, replacing estimates with proof, and turning payment disputes into
                a shared, verifiable record.
              </p>
              <p>
                For advertisers and labels, the same evidence base answers a different question: where, how often,
                and in what context a given work is actually being played across the venue network, measurement
                grounded in verified detections rather than self-reported estimates.
              </p>
            </div>

            <ul className="mt-8 grid sm:grid-cols-2 gap-3">
              {evidencePackage.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-fg">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <a
              href={mailto('Institutional enquiry — evidence sample')}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-gold px-7 py-3.5 text-base font-semibold text-ink transition-all duration-200 ease-out hover:bg-gold/90 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              Request an evidence sample
            </a>

            <p className="mt-6 text-xs text-muted leading-relaxed">
              Sautify is not integrated with, approved by, official to, or partnered with KECOBO, eCitizen, PAVRISK,
              KAMP, or any CMO. Our reporting is NRR-compatible, built for eCitizen reconciliation, and designed
              around published CMO licence conditions. Sample figures shown elsewhere on this site are illustrative.
            </p>
          </div>
        </Reveal>

        {/*
          ARTIST- / VENUE-FACING SECTION — Kiswahili / Sheng version to be authored here.
          Do NOT ship English body copy in this block. It is rendered below only as a
          short "coming soon" teaser. The localized copy, reviewed by a native speaker
          before publishing, should convey (audit §5.3):
            • Tone: warm, plain, first-person to the artist and the venue owner. Not legalese.
            • Artist message: "Every time your song plays in a bar, hotel or club, Sautify
              records it — so when your CMO pays out, it's based on what you actually played,
              not a guess. You can see every play." Emphasise visibility and fairness, NOT
              "we pay you" (we don't).
            • Venue message: "Plug in the device and forget it. It runs itself, works offline,
              and gives you proof of what you played for licence renewals." Emphasise zero
              hassle and proof for compliance.
            • Must still carry a short plain-language version of the "Sautify doesn't collect
              or pay — your CMO does" line.
        */}
        <Reveal delay={150}>
          <div className="mt-8 rounded-2xl border border-dashed border-emerald/40 bg-[#0E1712] p-8 md:p-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 text-xs font-medium text-emeraldLight">
              Kwa wasanii na kumbi &middot; in Kiswahili &amp; Sheng
            </span>
            <h3 className="mt-4 text-xl md:text-2xl font-bold text-fg">For artists &amp; venues</h3>
            <p className="mt-3 max-w-xl mx-auto text-muted leading-relaxed">
              A plain-language walkthrough for artists and venue owners is on the way, in Kiswahili and Sheng.
              In the meantime, see{' '}
              <a href="#for-artists" className="text-emeraldLight hover:text-emerald transition-colors">
                For Artists
              </a>{' '}
              and{' '}
              <a href="#for-venues" className="text-emeraldLight hover:text-emerald transition-colors">
                For Venues
              </a>
              .
            </p>
          </div>
        </Reveal>

        {/* Shared compliance footer (audit §5.4) — mirrors the demo console disclaimer. */}
        <Reveal delay={200}>
          <p className="mt-12 max-w-3xl mx-auto text-center text-sm text-muted leading-relaxed">
            Sautify does not set tariffs or collect on KECOBO's behalf. We provide the verified play-log evidence
            that CMOs and the National Rights Registry use to calculate what each artist is owed. Distribution
            decisions remain with the licensed CMO.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
