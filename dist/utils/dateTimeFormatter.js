"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTodayInChallengeWeek = isTodayInChallengeWeek;
exports.getRelativeDayIndex = getRelativeDayIndex;
exports.normalizeUTC = normalizeUTC;
exports.getChallengeTimeForToday = getChallengeTimeForToday;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
// export function isTodayInChallengeWeek(startDateStr: string): boolean {
//   const startDate = startOfDay(new Date(startDateStr)); // strip time
//   const today = startOfDay(new Date()); // strip time
//   const endDate = addDays(startDate, 6); // 7 days total
//   return isWithinInterval(today, { start: startDate, end: endDate });
// }
function isTodayInChallengeWeek(startDateStr, userTimeZone) {
    // Convert start date to user's timezone and strip time
    const startDate = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(new Date(startDateStr), userTimeZone));
    // Get today in user's timezone
    const today = (0, date_fns_1.startOfDay)((0, date_fns_tz_1.toZonedTime)(new Date(), userTimeZone));
    // 7-day week starting from startDate
    const endDate = (0, date_fns_1.addDays)(startDate, 6);
    return (0, date_fns_1.isWithinInterval)(today, { start: startDate, end: endDate });
}
function getRelativeDayIndex(startDateStr, todayStr) {
    const startDate = (0, date_fns_1.startOfDay)(new Date(startDateStr));
    const today = (0, date_fns_1.startOfDay)(todayStr ? new Date(todayStr) : new Date());
    const diff = (0, date_fns_1.differenceInCalendarDays)(today, startDate);
    if (diff < 0 || diff > 6) {
        return null; // today is not inside the 7-day window
    }
    return diff; // 0..6
}
function normalizeUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function getChallengeTimeForToday(timeStr, userTimeZone) {
    const now = new Date();
    const todayInTZ = (0, date_fns_tz_1.toZonedTime)(now, userTimeZone);
    const timeDate = new Date(timeStr); // e.g., 1970-01-01T16:00:00Z
    // Set today’s date but keep the hours/minutes/seconds from timeDate
    const combined = (0, date_fns_1.setMilliseconds)((0, date_fns_1.setSeconds)((0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(todayInTZ, timeDate.getUTCHours()), timeDate.getUTCMinutes()), timeDate.getUTCSeconds()), timeDate.getUTCMilliseconds());
    return combined;
}
