"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const getDashboardStats = async (req, res, next) => {
    const { userId } = req;
    const { year } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const [total, subscribed, free] = await getStats();
        const graphData = await getYearStats(Number(year));
        return res.status(200).json({
            total,
            subscribed,
            free,
            graph: graphData,
            success: true,
            msg: "Stats fetched successfully",
        });
    }
    catch (error) {
        console.error("[ERROR_GET_DASHBOARD_STATS]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getDashboardStats = getDashboardStats;
async function getStats() {
    return await Promise.all([
        db_1.db.user.count(),
        db_1.db.user.count({
            where: { subscription: { status: "active" } },
        }),
        db_1.db.user.count({
            where: {
                NOT: [
                    { subscription: null },
                    { subscription: { status: { not: "active" } } },
                ],
            },
        }),
    ]);
}
async function getYearStats(year) {
    const subscribedMonthly = {};
    const freeMonthly = {};
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    for (let month = 0; month < 12; month++) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        const subscribedCount = await db_1.db.user.count({
            where: {
                createdAt: { gte: start, lt: end },
                subscription: { isNot: null },
            },
        });
        const freeCount = await db_1.db.user.count({
            where: {
                createdAt: { gte: start, lt: end },
                subscription: null,
            },
        });
        const label = monthNames[month];
        subscribedMonthly[label] = subscribedCount;
        freeMonthly[label] = freeCount;
    }
    return {
        subscribedMonthly,
        freeMonthly,
    };
}
