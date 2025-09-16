"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklyChallengeProgress = exports.getTodayWeeklyChallenge = exports.makePublishWeeklyChallenge = exports.updateWeeklyChallengeById = exports.getAllWeeklyChallenges = exports.createWeeklyChallenge = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const dateTimeFormatter_1 = require("../utils/dateTimeFormatter");
const createWeeklyChallenge = async (req, res, next) => {
    const { userId, role } = req;
    const { title, challengeType } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({
            where: { id: userId, role: client_1.Role.ADMIN },
        });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        if (role !== self.role && role !== client_1.Role.ADMIN) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const challenge = await db_1.db.challenge.create({
            data: {
                title,
                challengeType: challengeType,
            },
        });
        const weeklyChallenges = Array.from({ length: 7 }, (_, i) => ({
            title: `Challenge ${i}`,
            dayOfWeek: i,
            challengeId: challenge.id,
        }));
        await db_1.db.weeklyChallenge.createMany({
            data: weeklyChallenges,
        });
        return res.status(201).json({
            challenge,
            msg: "Challenge Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CREATE_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createWeeklyChallenge = createWeeklyChallenge;
const getAllWeeklyChallenges = async (req, res, next) => {
    const { userId, role } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({
            where: { id: userId, role: client_1.Role.ADMIN },
        });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        if (role !== self.role && role !== client_1.Role.ADMIN) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const weeklyChallenges = await db_1.db.challenge.findMany({
            where: {
                challengeType: "WEEKLY",
            },
            include: {
                weeklyChallenges: {
                    orderBy: {
                        dayOfWeek: "asc",
                    },
                },
            },
        });
        return res.status(200).json({
            challenges: weeklyChallenges,
            msg: "Challenges Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_ALL_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllWeeklyChallenges = getAllWeeklyChallenges;
const updateWeeklyChallengeById = async (req, res, next) => {
    const { userId, role } = req;
    const { weeklyChallengeId } = req.params;
    const { title, description, startTime, endTime, categoryId } = req.body;
    console.log({ startTime, endTime, description });
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    if (!title) {
        return next(new error_1.default("Title is required", 400));
    }
    if (!startTime) {
        return next(new error_1.default("Start Time is required", 400));
    }
    if (!endTime) {
        return next(new error_1.default("End Time is required", 400));
    }
    if (!categoryId) {
        return next(new error_1.default("Category is required", 400));
    }
    try {
        const self = await db_1.db.user.findUnique({
            where: { id: userId, role: client_1.Role.ADMIN },
        });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        if (role !== self.role && role !== client_1.Role.ADMIN) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const weeklyChallenge = await db_1.db.weeklyChallenge.findUnique({
            where: {
                id: weeklyChallengeId,
            },
        });
        if (!weeklyChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const category = await db_1.db.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return next(new error_1.default("Category not found", 404));
        }
        const challenge = await db_1.db.weeklyChallenge.update({
            where: { id: weeklyChallengeId },
            data: {
                title,
                description: description,
                categoryId,
                startTime,
                endTime,
                isChallengeUpdate: true,
            },
        });
        return res.status(200).json({
            challenge: challenge,
            msg: "Challenge Update Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[UPDATE_WEEKLY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateWeeklyChallengeById = updateWeeklyChallengeById;
const makePublishWeeklyChallenge = async (req, res, next) => {
    const { userId, role } = req;
    const { challengeId } = req.params;
    const { startDate } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({
            where: { id: userId, role: client_1.Role.ADMIN },
        });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        if (role !== self.role && role !== client_1.Role.ADMIN) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const challenge = await db_1.db.challenge.findUnique({
            where: { id: challengeId },
            include: {
                weeklyChallenges: true,
            },
        });
        if (!challenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const isDataFilled = challenge.weeklyChallenges.every((wc) => wc.isChallengeUpdate);
        console.log(isDataFilled);
        if (!isDataFilled) {
            return next(new error_1.default("Please fill all the challenge details before publishing", 400));
        }
        if (challenge.startDate) {
            return next(new error_1.default("Challenge already started", 400));
        }
        // ✅ Check for overlapping challenges in the 7-day window
        const startDateObj = new Date(startDate);
        const weekStart = (0, date_fns_1.subDays)(startDateObj, 3);
        const weekEnd = (0, date_fns_1.addDays)(startDateObj, 3);
        const overlappingChallenge = await db_1.db.challenge.findFirst({
            where: {
                id: {
                    not: challengeId,
                },
                startDate: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                status: {
                    not: "SCHEDULE",
                },
            },
        });
        if (overlappingChallenge) {
            return next(new error_1.default(`Another challenge is already scheduled within this week: ${overlappingChallenge.startDate.toDateString()}`, 400));
        }
        const updateChallenge = await db_1.db.challenge.update({
            where: { id: challengeId },
            data: { status: "SCHEDULE", startDate: startDate },
        });
        return res.status(200).json({
            challenge: updateChallenge,
            msg: "Challenge Publish Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_PUBLISH_WEEKLY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.makePublishWeeklyChallenge = makePublishWeeklyChallenge;
const getTodayWeeklyChallenge = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = (0, date_fns_1.startOfDay)(new Date());
    try {
        const challenges = await db_1.db.challenge.findMany({
            where: {
                OR: [{ status: "SCHEDULE" }, { status: "RUNNING" }],
            },
            include: {
                weeklyChallenges: {
                    include: {
                        category: true,
                    },
                },
            },
        });
        // ✅ use helper function here
        const activeChallenge = challenges.find((c) => c.startDate && (0, dateTimeFormatter_1.isTodayInChallengeWeek)(c.startDate.toString()));
        if (!activeChallenge) {
            return res.status(200).json({
                challenge: null,
                msg: "No challenge for today",
                success: true,
            });
        }
        if (activeChallenge.status === "SCHEDULE") {
            await db_1.db.challenge.update({
                where: { id: activeChallenge.id },
                data: { status: "RUNNING" },
            });
        }
        const todayWeekly = activeChallenge.weeklyChallenges.find((w) => w.dayOfWeek ===
            (0, dateTimeFormatter_1.getRelativeDayIndex)(activeChallenge.startDate.toString(), today.toString()));
        return res.status(200).json({
            weeklyChallenge: { ...todayWeekly, startDate: activeChallenge.startDate },
            msg: todayWeekly
                ? "Today's Challenge Fetched Successfully"
                : "No challenge scheduled for today",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_TODAY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getTodayWeeklyChallenge = getTodayWeeklyChallenge;
const getWeeklyChallengeProgress = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = (0, date_fns_1.startOfDay)(new Date());
    try {
        const challenges = await db_1.db.challenge.findMany({
            where: {
                OR: [{ status: "RUNNING" }],
            },
            include: {
                weeklyChallenges: {
                    include: {
                        category: true,
                    },
                },
            },
        });
        // ✅ use helper function here
        const activeChallenge = challenges.find((c) => c.startDate && (0, dateTimeFormatter_1.isTodayInChallengeWeek)(c.startDate.toString()));
        if (!activeChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        console.log(activeChallenge.id);
        // Get all completions for this user + challenge
        const completions = await db_1.db.weeklyChallengeCompletion.findMany({
            where: {
                userId,
                challengeId: activeChallenge.id,
            },
        });
        // Normalize completion dates (strip time)
        const completionDates = completions.map((c) => (0, date_fns_1.startOfDay)(new Date(c.date)));
        const startDate = (0, date_fns_1.startOfDay)(new Date(activeChallenge.startDate));
        // Build a 7-day week view
        const days = Array.from({ length: 7 }).map((_, i) => {
            const currentDay = (0, date_fns_1.addDays)(startDate, i);
            const done = completionDates.some((d) => (0, date_fns_1.isSameDay)(d, currentDay));
            return {
                day: (0, date_fns_1.format)(currentDay, "EEE"), // Mon, Tue, Wed...
                date: currentDay.toISOString().split("T")[0], // 2025-09-12
                done,
            };
        });
        return res.status(200).json({
            progress: days,
            msg: "Weekly Streak Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_TODAY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getWeeklyChallengeProgress = getWeeklyChallengeProgress;
