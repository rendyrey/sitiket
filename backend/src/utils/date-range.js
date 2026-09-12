/**
 * Turns `startDate`/`endDate` "YYYY-MM-DD" query bounds into inclusive `Date`
 * bounds for a `created_at` range filter — `endDate` is pushed to the end of
 * that day so a single-day range still matches everything created on it.
 * Shared by the merch-order and ticket-order Excel export listings.
 * @param {{ startDate?: string, endDate?: string }} [input]
 * @returns {{ start?: Date, end?: Date }}
 */
export const toDateRange = ({ startDate, endDate } = {}) => ({
  start: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
  end: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
});
