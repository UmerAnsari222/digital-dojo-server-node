import {
  addDays,
  differenceInCalendarDays,
  isWithinInterval,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";
import { toZonedTime, format } from "date-fns-tz";

// export function isTodayInChallengeWeek(startDateStr: string): boolean {
//   const startDate = startOfDay(new Date(startDateStr)); // strip time
//   const today = startOfDay(new Date()); // strip time

//   const endDate = addDays(startDate, 6); // 7 days total

//   return isWithinInterval(today, { start: startDate, end: endDate });
// }

export function isTodayInChallengeWeek(
  startDateStr: string,
  userTimeZone: string
): boolean {
  // Convert start date to user's timezone and strip time
  const startDate = startOfDay(
    toZonedTime(new Date(startDateStr), userTimeZone)
  );

  // Get today in user's timezone
  const today = startOfDay(toZonedTime(new Date(), userTimeZone));

  // 7-day week starting from startDate
  const endDate = addDays(startDate, 6);

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

// export function getChallengeTimeForToday(
//   challengeTime: Date,
//   timeZone: string
// ): string {
//   // 1️⃣ Get today's date in user's timezone
//   const now = new Date();
//   const todayInTZ = toZonedTime(now, timeZone);

//   // 2️⃣ Extract hours and minutes from challengeTime **in local time**
//   const hours = challengeTime.getUTCHours(); // challengeTime is in UTC
//   const minutes = challengeTime.getUTCMinutes();

//   // 3️⃣ Set today's date with challenge hours/minutes in user's timezone
//   let challengeDateTime = setHours(todayInTZ, hours);
//   challengeDateTime = setMinutes(challengeDateTime, minutes);
//   challengeDateTime = setSeconds(challengeDateTime, 0);
//   challengeDateTime = setMilliseconds(challengeDateTime, 0);

//   // 4️⃣ Return as ISO string in UTC
//   return new Date(
//     challengeDateTime.getTime() - challengeDateTime.getTimezoneOffset() * 60000
//   ).toISOString();
// }

/**
 * Convert any UTC date string to user's local timezone
 * @param utcDateStr UTC date string (ISO)
 * @param timeZone IANA timezone string, e.g., "Asia/Karachi", "America/New_York"
 * @returns formatted local date-time string in that timezone
 */
export function convertToUserTime(
  utcDateStr: string,
  timeZone: string
): string {
  // Convert UTC to user's timezone
  const zonedDate = toZonedTime(new Date(utcDateStr), timeZone);

  // Format nicely
  return format(zonedDate, "yyyy-MM-dd HH:mm:ssXXX", { timeZone });
}

function convertToUtc(date: Date, timeZone: string): Date {
  const local = toZonedTime(date, timeZone);
  return new Date(local.getTime() - local.getTimezoneOffset() * 60 * 1000);
}

/**
 * Converts a UTC date or ISO string to user's timezone and formats as 12-hour time.
 * @param time - Date object or ISO string in UTC
 * @param timeZone - User's timezone, e.g., "Asia/Karachi"
 * @returns Formatted time string like "4:00 PM"
 */
export function formatTimeForUser(
  time: Date | string,
  timeZone: string
): string {
  // Convert to Date if string
  const date = typeof time === "string" ? new Date(time) : time;

  // Convert UTC date to user's timezone
  const zonedDate = toZonedTime(date, timeZone);

  // Format in 12-hour time
  return format(zonedDate, "h:mm a");
}
