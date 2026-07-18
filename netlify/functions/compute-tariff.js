import { computeTariff, listCategories, listClasses, splitSeventyThirty, TariffError } from './_shared/tariffEngine.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

// GET  /api/tariff                         → list categories and classes
// GET  /api/tariff?userCategory=venue      → list classes for one category
// POST /api/tariff {userCategory, venueClass, grossRevenueKes?, units?, periodDays?}
//                                          → computed tariff + 70/30 split
export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const userCategory = event.queryStringParameters?.userCategory
      if (userCategory) {
        return json(200, { userCategory, classes: listClasses(userCategory) })
      }
      const schedule = Object.fromEntries(listCategories().map((c) => [c, listClasses(c)]))
      return json(200, { categories: schedule })
    }

    if (event.httpMethod === 'POST') {
      let payload
      try {
        payload = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'Invalid JSON body' })
      }
      const tariff = computeTariff(payload)
      const split = splitSeventyThirty(tariff.proratedTariffKes ?? tariff.annualTariffKes)
      return json(200, { ...tariff, distribution: split })
    }

    return json(405, { error: 'Method not allowed' })
  } catch (err) {
    if (err instanceof TariffError) {
      return json(400, { error: err.message })
    }
    return json(500, { error: err.message })
  }
}
