export function formatEntry(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    venue: { name: row.venue_name, sbpReference: row.venue_sbp_reference },
    reportingPeriod: { start: row.reporting_period_start, end: row.reporting_period_end },
    playCountSummary: { totalPlays: row.total_plays, uniqueTracks: row.unique_tracks },
    nrrCrossCheck: { matched: row.nrr_matched, unmatched: row.nrr_unmatched },
    evidenceHash: row.payload_hash,
    prevHash: row.prev_hash,
    chainHash: row.chain_hash,
    settlementStatus: row.settlement_status,
    settlement:
      row.settlement_status === 'settled'
        ? {
            invoiceAmountKes: row.invoice_amount_kes,
            artistAmountKes: row.artist_amount_kes,
            adminAmountKes: row.admin_amount_kes,
            cmoDisbursementRef: row.cmo_disbursement_ref,
            settledAt: row.settled_at,
          }
        : null,
  }
}
