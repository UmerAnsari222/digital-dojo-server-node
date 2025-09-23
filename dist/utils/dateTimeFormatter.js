"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTodayInChallengeWeek = isTodayInChallengeWeek;
exports.getRelativeDayIndex = getRelativeDayIndex;
exports.normalizeUTC = normalizeUTC;
const date_fns_1 = require("date-fns");
function isTodayInChallengeWeek(startDateStr) {
    const startDate = (0, date_fns_1.startOfDay)(new Date(startDateStr)); // strip time
    const today = (0, date_fns_1.startOfDay)(new Date()); // strip time
    const endDate = (0, date_fns_1.addDays)(startDate, 6); // 7 days total
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
