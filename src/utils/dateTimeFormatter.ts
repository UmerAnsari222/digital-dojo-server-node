import {
  addDays,
  differenceInCalendarDays,
  isWithinInterval,
  startOfDay,
} from "date-fns";

export function isTodayInChallengeWeek(startDateStr: string): boolean {
  const startDate = startOfDay(new Date(startDateStr)); // strip time
  const today = startOfDay(new Date()); // strip time

  const endDate = addDays(startDate, 6); // 7 days total

  return isWithinInterval(today, { start: startDate, end: endDate });
}

export function getRelativeDayIndex(
  startDateStr: string,
  todayStr?: string
): number | null {
  const startDate = startOfDay(new Date(startDateStr));
  const today = startOfDay(todayStr ? new Date(todayStr) : new Date());

  const diff = differenceInCalendarDays(today, startDate);
  if (diff < 0 || diff > 6) {
    return null; // today is not inside the 7-day window
  }
  return diff; // 0..6
}

export function normalizeUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}
