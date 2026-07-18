import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeTariff,
  splitSeventyThirty,
  listCategories,
  listClasses,
  TariffError,
  TARIFF_SCHEDULE,
  SCHEDULE_STATUS,
} from '../netlify/functions/_shared/tariffEngine.js'

test('flat annual venue tariff: mobile DJ matches the public KES 30,000 figure', () => {
  const r = computeTariff({ userCategory: 'venue', venueClass: 'mobile_dj' })
  assert.equal(r.annualTariffKes, 30000)
  assert.equal(r.basis, 'flat_annual')
})

test('every result is labelled with schedule version and indicative status', () => {
  const r = computeTariff({ userCategory: 'venue', venueClass: 'bar_small' })
  assert.match(r.scheduleVersion, /Consolidated Tariffs/)
  assert.equal(r.scheduleStatus, SCHEDULE_STATUS)
})

test('broadcaster tariff is percentage of gross revenue', () => {
  const r = computeTariff({ userCategory: 'broadcaster', venueClass: 'radio_national', grossRevenueKes: 100_000_000 })
  assert.equal(r.annualTariffKes, 2_000_000)
})

test('broadcaster tariff floors at the class minimum', () => {
  const r = computeTariff({ userCategory: 'broadcaster', venueClass: 'radio_national', grossRevenueKes: 1_000_000 })
  assert.equal(r.annualTariffKes, 200_000)
})

test('broadcaster tariff without revenue throws TariffError', () => {
  assert.throws(() => computeTariff({ userCategory: 'broadcaster', venueClass: 'radio_national' }), TariffError)
})

test('PSV tariff scales per vehicle', () => {
  const one = computeTariff({ userCategory: 'psv', venueClass: 'psv_14_seater' })
  const fleet = computeTariff({ userCategory: 'psv', venueClass: 'psv_14_seater', units: 12 })
  assert.equal(fleet.annualTariffKes, one.annualTariffKes * 12)
})

test('PSV rejects non-positive or fractional vehicle counts', () => {
  assert.throws(() => computeTariff({ userCategory: 'psv', venueClass: 'psv_bus', units: 0 }), TariffError)
  assert.throws(() => computeTariff({ userCategory: 'psv', venueClass: 'psv_bus', units: 2.5 }), TariffError)
})

test('telco tariff floors at minimum and applies rate above it', () => {
  const below = computeTariff({ userCategory: 'telco', venueClass: 'caller_ringback', grossRevenueKes: 1_000_000 })
  assert.equal(below.annualTariffKes, 500_000)
  const above = computeTariff({ userCategory: 'telco', venueClass: 'caller_ringback', grossRevenueKes: 100_000_000 })
  assert.equal(above.annualTariffKes, 8_500_000)
})

test('proration scales the annual tariff by periodDays/365', () => {
  const r = computeTariff({ userCategory: 'venue', venueClass: 'bar_medium', periodDays: 365 })
  assert.equal(r.proratedTariffKes, r.annualTariffKes)
  const month = computeTariff({ userCategory: 'venue', venueClass: 'bar_medium', periodDays: 30 })
  assert.equal(month.proratedTariffKes, Math.round(((16000 * 30) / 365) * 100) / 100)
})

test('invalid periodDays throws TariffError', () => {
  assert.throws(() => computeTariff({ userCategory: 'venue', venueClass: 'bar_small', periodDays: 0 }), TariffError)
  assert.throws(() => computeTariff({ userCategory: 'venue', venueClass: 'bar_small', periodDays: 400 }), TariffError)
})

test('unknown category and class throw TariffError with valid options listed', () => {
  assert.throws(() => computeTariff({ userCategory: 'casino', venueClass: 'bar_small' }), /Unknown user category/)
  assert.throws(() => computeTariff({ userCategory: 'venue', venueClass: 'stadium' }), /Unknown class/)
})

test('70/30 split sums exactly to the input for awkward amounts', () => {
  for (const amount of [5000, 30000, 1234.56, 0.01, 0]) {
    const { artistAmountKes, adminAmountKes } = splitSeventyThirty(amount)
    assert.equal(Math.round((artistAmountKes + adminAmountKes) * 100) / 100, amount)
    assert.ok(artistAmountKes >= amount * 0.7 - 0.01, `artist share below 70% for ${amount}`)
  }
})

test('70/30 split rejects negative amounts', () => {
  assert.throws(() => splitSeventyThirty(-1), TariffError)
})

test('listCategories/listClasses cover the whole schedule', () => {
  assert.deepEqual(listCategories().sort(), Object.keys(TARIFF_SCHEDULE).sort())
  for (const cat of listCategories()) {
    const classes = listClasses(cat)
    assert.equal(classes.length, Object.keys(TARIFF_SCHEDULE[cat].classes).length)
    for (const c of classes) assert.ok(c.key && c.label && c.basis)
  }
})
