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
import { toZonedTime } from "date-fns-tz";

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

export function getChallengeTimeForToday(
  challengeTime: Date,
  timeZone: string
): string {
  // 1️⃣ Get today's date in user's timezone
  const now = new Date();
  const todayInTZ = toZonedTime(now, timeZone);

  // 2️⃣ Extract hours and minutes from challengeTime **in local time**
  const hours = challengeTime.getUTCHours(); // challengeTime is in UTC
  const minutes = challengeTime.getUTCMinutes();

  // 3️⃣ Set today's date with challenge hours/minutes in user's timezone
  let challengeDateTime = setHours(todayInTZ, hours);
  challengeDateTime = setMinutes(challengeDateTime, minutes);
  challengeDateTime = setSeconds(challengeDateTime, 0);
  challengeDateTime = setMilliseconds(challengeDateTime, 0);

  // 4️⃣ Return as ISO string in UTC
  return new Date(
    challengeDateTime.getTime() - challengeDateTime.getTimezoneOffset() * 60000
  ).toISOString();
}
