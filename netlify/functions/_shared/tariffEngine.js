// Gazetted-tariff engine for Kenya's Consolidated Music & Audio-Visual Tariffs
// (KECOBO, 2026–28 cycle), computing the applicable annual tariff for a licensee
// from user category + class, plus the mandated 70/30 artist/admin split.
//
// IMPORTANT: the figures in TARIFF_SCHEDULE are indicative placeholders and must
// be verified line-by-line against the Kenya Gazette schedule before any figure
// is presented to a licensee, CMO, or regulator as the legal tariff. The one
// anchored public figure is the mobile-DJ annual tariff (KES 30,000). Each
// result therefore carries scheduleStatus: 'indicative'.

export const SCHEDULE_VERSION = 'KECOBO Consolidated Tariffs 2026-28'
export const SCHEDULE_STATUS = 'indicative' // flip to 'gazetted' only after line-by-line verification
export const ARTIST_SHARE = 0.7 // minimum artist share under the eCitizen royalty directive

export const TARIFF_SCHEDULE = {
  broadcaster: {
    basis: 'percentage_of_gross_revenue',
    classes: {
      radio_national: { rate: 0.02, minimumAnnualKes: 200000, label: 'National free-to-air radio' },
      radio_regional: { rate: 0.02, minimumAnnualKes: 80000, label: 'Regional/vernacular radio' },
      radio_community: { rate: 0.01, minimumAnnualKes: 20000, label: 'Community radio' },
      tv_national: { rate: 0.02, minimumAnnualKes: 300000, label: 'National free-to-air TV' },
      tv_regional: { rate: 0.02, minimumAnnualKes: 100000, label: 'Regional TV' },
    },
  },
  venue: {
    basis: 'flat_annual',
    classes: {
      bar_small: { annualKes: 8000, label: 'Bar/pub, small (≤50 patrons)' },
      bar_medium: { annualKes: 16000, label: 'Bar/pub, medium (51–150 patrons)' },
      bar_large: { annualKes: 30000, label: 'Bar/pub, large (>150 patrons)' },
      nightclub: { annualKes: 50000, label: 'Nightclub/discotheque' },
      restaurant: { annualKes: 12000, label: 'Restaurant/café with background music' },
      hotel_town: { annualKes: 40000, label: 'Hotel, town (per star band, base)' },
      hotel_resort: { annualKes: 60000, label: 'Hotel, resort/lodge' },
      retail_small: { annualKes: 6000, label: 'Retail shop, small' },
      retail_supermarket: { annualKes: 25000, label: 'Supermarket/department store' },
      gym_fitness: { annualKes: 15000, label: 'Gym/fitness studio' },
      salon_barbershop: { annualKes: 5000, label: 'Salon/barbershop' },
      mobile_dj: { annualKes: 30000, label: 'Mobile DJ (public source figure)' },
    },
  },
  psv: {
    basis: 'per_vehicle_annual',
    classes: {
      psv_14_seater: { annualKes: 3000, label: 'PSV matatu, up to 14 seats' },
      psv_25_seater: { annualKes: 5000, label: 'PSV, 15–25 seats' },
      psv_bus: { annualKes: 8000, label: 'PSV bus, >25 seats' },
      psv_long_distance: { annualKes: 10000, label: 'Long-distance coach' },
    },
  },
  telco: {
    basis: 'percentage_of_content_revenue',
    classes: {
      caller_ringback: { rate: 0.085, minimumAnnualKes: 500000, label: 'Caller ring-back tunes (e.g. skiza-type services)' },
      streaming_service: { rate: 0.08, minimumAnnualKes: 250000, label: 'Music streaming/download service' },
    },
  },
}

export class TariffError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TariffError'
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}

export function listCategories() {
  return Object.keys(TARIFF_SCHEDULE)
}

export function listClasses(userCategory) {
  const category = TARIFF_SCHEDULE[userCategory]
  if (!category) throw new TariffError(`Unknown user category: ${userCategory}`)
  return Object.entries(category.classes).map(([key, cls]) => ({ key, label: cls.label, basis: category.basis }))
}

/**
 * Compute the applicable annual tariff.
 *
 * @param {object} input
 * @param {string} input.userCategory  broadcaster | venue | psv | telco
 * @param {string} input.venueClass    class key within the category (e.g. bar_medium, radio_national)
 * @param {number} [input.grossRevenueKes]  required for percentage-based categories
 * @param {number} [input.units]       vehicle count for PSV fleets (default 1)
 * @param {number} [input.periodDays]  if given, also returns the tariff prorated to the period
 */
export function computeTariff({ userCategory, venueClass, grossRevenueKes, units = 1, periodDays } = {}) {
  const category = TARIFF_SCHEDULE[userCategory]
  if (!category) {
    throw new TariffError(`Unknown user category: ${userCategory}. Valid: ${listCategories().join(', ')}`)
  }
  const cls = category.classes[venueClass]
  if (!cls) {
    throw new TariffError(
      `Unknown class "${venueClass}" for category "${userCategory}". Valid: ${Object.keys(category.classes).join(', ')}`,
    )
  }

  let annualTariffKes
  if (category.basis === 'flat_annual') {
    annualTariffKes = cls.annualKes
  } else if (category.basis === 'per_vehicle_annual') {
    if (!Number.isInteger(units) || units < 1) throw new TariffError('units must be a positive integer vehicle count')
    annualTariffKes = cls.annualKes * units
  } else {
    if (typeof grossRevenueKes !== 'number' || grossRevenueKes < 0) {
      throw new TariffError(`grossRevenueKes is required for ${category.basis} tariffs`)
    }
    annualTariffKes = Math.max(round2(grossRevenueKes * cls.rate), cls.minimumAnnualKes)
  }

  const result = {
    userCategory,
    venueClass,
    classLabel: cls.label,
    basis: category.basis,
    annualTariffKes: round2(annualTariffKes),
    scheduleVersion: SCHEDULE_VERSION,
    scheduleStatus: SCHEDULE_STATUS,
  }

  if (periodDays !== undefined) {
    if (typeof periodDays !== 'number' || periodDays <= 0 || periodDays > 366) {
      throw new TariffError('periodDays must be a number between 1 and 366')
    }
    result.periodDays = periodDays
    result.proratedTariffKes = round2((annualTariffKes * periodDays) / 365)
  }

  return result
}

/**
 * KECOBO-mandated distribution split: minimum 70% of collections to artists,
 * the remainder to administration. Amounts always sum exactly to the input.
 */
export function splitSeventyThirty(amountKes) {
  if (typeof amountKes !== 'number' || amountKes < 0) {
    throw new TariffError('amountKes must be a non-negative number')
  }
  const artistAmountKes = round2(amountKes * ARTIST_SHARE)
  const adminAmountKes = round2(amountKes - artistAmountKes)
  return { artistAmountKes, adminAmountKes, artistShare: ARTIST_SHARE }
}
