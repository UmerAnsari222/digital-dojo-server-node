"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTodayInChallengeWeek = isTodayInChallengeWeek;
exports.getRelativeDayIndex = getRelativeDayIndex;
exports.normalizeUTC = normalizeUTC;
exports.convertToUserTime = convertToUserTime;
exports.formatTimeForUser = formatTimeForUser;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
// export function isTodayInChallengeWeek(startDateStr: string): boolean {
//   const startDate = startOfDay(new Date(startDateStr)); // strip time
//   const today = startOfDay(new Date()); // strip time
//   const endDate = addDays(startDate, 6); // 7 days total
//   return isWithinInterval(today, { start: startDate, end: endDate });
// }
// export function isTodayInChallengeWeek(
//   startDateStr: string,
//   userTimeZone: string
// ): boolean {
//   // Convert start date to user's timezone and strip time
//   const startDate = startOfDay(
//     toZonedTime(new Date(startDateStr), userTimeZone)
//   );
//   // Get today in user's timezone
//   const today = startOfDay(toZonedTime(new Date(), userTimeZone));
//   // 7-day week starting from startDate
//   const endDate = addDays(startDate, 6);
//   return isWithinInterval(today, { start: startDate, end: endDate });
// }
// export function getRelativeDayIndex(
//   startDateStr: string,
//   todayStr?: string
// ): number | null {
//   const startDate = startOfDay(new Date(startDateStr));
//   const today = startOfDay(todayStr ? new Date(todayStr) : new Date());
//   const diff = differenceInCalendarDays(today, startDate);
//   if (diff < 0 || diff > 6) {
//     return null; // today is not inside the 7-day window
//   }
//   return diff; // 0..6
// }
// Check if today is within the 7-day challenge starting from startDate
// Helper: Check if today is in the 7-day challenge week
function isTodayInChallengeWeek(startDateStr, userTimeZone) {
    const startDate = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(new Date(startDateStr), userTimeZone));
    const today = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(new Date(), userTimeZone));
    const endDate = (0, date_fns_1.addDays)(startDate, 6);
    return (0, date_fns_1.isWithinInterval)(today, { start: startDate, end: endDate });
}
function getRelativeDayIndex(startDateStr, todayStr) {
    const startDate = (0, date_fns_1.startOfDay)(new Date(startDateStr));
    const today = (0, date_fns_1.startOfDay)(todayStr ? new Date(todayStr) : new Date());
    const diff = (0, date_fns_1.differenceInCalendarDays)(today, startDate);
    if (diff < 0 || diff > 6)
        return null;
    return diff;
}
function normalizeUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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
function convertToUserTime(utcDateStr, timeZone) {
    // Convert UTC to user's timezone
    const zonedDate = (0, date_fns_tz_1.toZonedTime)(new Date(utcDateStr), timeZone);
    // Format nicely
    return (0, date_fns_tz_1.format)(zonedDate, "yyyy-MM-dd HH:mm:ssXXX", { timeZone });
}
function convertToUtc(date, timeZone) {
    const local = (0, date_fns_tz_1.toZonedTime)(date, timeZone);
    return new Date(local.getTime() - local.getTimezoneOffset() * 60 * 1000);
}
/**
 * Converts a UTC date or ISO string to user's timezone and formats as 12-hour time.
 * @param time - Date object or ISO string in UTC
 * @param timeZone - User's timezone, e.g., "Asia/Karachi"
 * @returns Formatted time string like "4:00 PM"
 */
function formatTimeForUser(time, timeZone) {
    // Convert to Date if string
    const date = typeof time === "string" ? new Date(time) : time;
    // Convert UTC date to user's timezone
    const zonedDate = (0, date_fns_tz_1.toZonedTime)(date, timeZone);
    // Format in 12-hour time
    return (0, date_fns_tz_1.format)(zonedDate, "h:mm a");
}
