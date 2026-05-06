/**
 * "Due today" window for SRS.
 *
 * When `User.timezone` is null, we use the UTC calendar for both due queries and SM-2
 * anchoring (see `sm2.ts`).
 *
 * When timezone is set (IANA), today's date is derived with `Intl.DateTimeFormat` and
 * compared to `nextReviewAt` (PostgreSQL DATE) as calendar dates.
 */

import type { PrismaClient } from "@prisma/client";

type UserFetcher = Pick<PrismaClient, "user">;

/** YYYY-MM-DD in the given IANA timezone, evaluated at `now`. */
export function formatYmdInTimeZone(now: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/** UTC calendar today as YYYY-MM-DD (used when user timezone is unset). */
export function utcTodayYmd(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Returns exclusive upper bound for "today" comparisons in Prisma:
 * we treat a card as due if `nextReviewAt <= today` where today is a DATE.
 * So we need today's date as `Date` at UTC midnight for the user's (or UTC) calendar day.
 */
export async function todayDateForUser(
  prisma: UserFetcher,
  userId: string,
  now: Date = new Date(),
): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  const tz = user?.timezone?.trim();
  if (!tz) {
    const [y, m, d] = utcTodayYmd(now).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  const ymd = formatYmdInTimeZone(now, tz);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
