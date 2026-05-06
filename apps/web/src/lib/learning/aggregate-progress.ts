/**
 * Pure helpers for dashboard/stats progress percentages (see `aggregate.ts`).
 */

export function overallPercentFromCounts(
  masteredItems: number,
  totalPublishableItems: number,
): number | null {
  return totalPublishableItems > 0
    ? Math.round((100 * masteredItems) / totalPublishableItems)
    : null;
}
