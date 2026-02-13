"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDailyChallengeById = exports.deleteWeeklyChallengeById = exports.deleteWeeklyChallengePlainById = exports.deleteDailyChallengePlainById = exports.getPastChallenges = exports.getWeeklyChallengeProgress = exports.getTodayWeeklyChallenge = exports.getDailyChallenges = exports.getTodayDailyChallenge = exports.makePublishWeeklyChallenge = exports.updateWeeklyChallengeById = exports.getAllWeeklyChallenges = exports.createWeeklyChallenge = exports.createDailyChallenge = exports.createDailyChallengePlan = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const dateTimeFormatter_1 = require("../utils/dateTimeFormatter");
const logger_1 = __importDefault(require("../config/logger"));
const node_cron_1 = __importDefault(require("node-cron"));
const createDailyChallengePlan = async (req, res, next) => {
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
                challengeType: "DAILY",
                // challengeType: challengeType,
            },
            include: {
                dailyChallenges: true,
                weeklyChallenges: true,
            },
        });
        // const weeklyChallenges = Array.from({ length: 7 }, (_, i) => ({
        //   title: `Challenge ${i}`,
        //   dayOfWeek: i,
        //   challengeId: challenge.id,
        // }));
        // await db.weeklyChallenge.createMany({
        //   data: weeklyChallenges,
        // });
        return res.status(201).json({
            challenge,
            msg: "Challenge Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CREATE_DAILY_CHALLENGE_PLAIN_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createDailyChallengePlan = createDailyChallengePlan;
const createDailyChallenge = async (req, res, next) => {
    const { userId, role } = req;
    const { title, description, categoryId, challengeId, startTime, endTime } = req.body;
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
        });
        if (!challenge) {
            return next(new error_1.default("Plan not found", 404));
        }
        const daily = await db_1.db.dailyChallenge.create({
            data: {
                title,
                description,
                categoryId: categoryId,
                challengeId: challengeId,
                startTime,
                endTime,
            },
        });
        return res.status(201).json({
            challenge: daily,
            msg: "Daily Challenge Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CREATE_DAILY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createDailyChallenge = createDailyChallenge;
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
        const now = new Date();
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
            orderBy: {
                createdAt: "asc",
            },
        });
        // ⚙️ Check if any SCHEDULED challenge should now be RUNNING
        const updatedChallenges = await Promise.all(weeklyChallenges.map(async (challenge) => {
            if (challenge.status === "SCHEDULE" &&
                challenge.startDate &&
                (0, date_fns_1.isAfter)(now, new Date(challenge.startDate))) {
                // Update the challenge to RUNNING
                const updated = await db_1.db.challenge.update({
                    where: { id: challenge.id },
                    data: { status: "RUNNING" },
                    include: {
                        weeklyChallenges: {
                            orderBy: { dayOfWeek: "asc" },
                        },
                    },
                });
                return updated;
            }
            if (challenge.status === "RUNNING" &&
                challenge.startDate &&
                (0, date_fns_1.isAfter)(now, (0, date_fns_1.addDays)(new Date(challenge.startDate), 7))) {
                const updated = await db_1.db.challenge.update({
                    where: { id: challenge.id },
                    data: { status: "COMPLETED" },
                    include: { weeklyChallenges: { orderBy: { dayOfWeek: "asc" } } },
                });
                return updated;
            }
            return challenge; // leave as is if not ready to start
        }));
        return res.status(200).json({
            // challenges: weeklyChallenges,
            challenges: updatedChallenges,
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
            include: {
                weeklyChallenges: true,
            },
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
const getTodayDailyChallenge = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const user = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!user)
            return next(new error_1.default("User not found", 404));
        const challenges = await db_1.db.dailyChallenge.findMany({
            include: {
                category: true,
                challenge: true,
            },
            orderBy: { createdAt: "asc" },
        });
        if (challenges.length === 0) {
            return res.status(200).json({
                challenge: null,
                msg: "No challenges available",
                success: true,
            });
        }
        const today = new Date();
        const registeredDate = new Date(user.createdAt);
        const daysSinceRegistered = (0, date_fns_1.differenceInCalendarDays)(today, registeredDate);
        if (daysSinceRegistered < 0) {
            return res.status(200).json({
                challenge: null,
                msg: "No challenge for today",
                success: true,
            });
        }
        // If user index exists → use that
        let challengeForUser = challenges[daysSinceRegistered];
        // If that exact index doesn’t exist
        if (!challengeForUser) {
            // But admin has created some challenges
            // Show the **latest challenge admin created**
            challengeForUser = challenges[challenges.length - 1];
        }
        // Next: check creation times
        const challengeCreatedDate = new Date(challengeForUser.createdAt);
        if (challengeCreatedDate > today) {
            // if even the latest challenge was created in the future (unlikely)
            return res.status(200).json({
                challenge: null,
                msg: "No challenge for today",
                success: true,
            });
        }
        const completion = await db_1.db.completion.findFirst({
            where: {
                userId,
                userChallengeId: challengeForUser.id,
            },
        });
        return res.status(200).json({
            challenge: { ...challengeForUser, completion },
            msg: "Today's Challenge Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.error("[GET_TODAY_DAILY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getTodayDailyChallenge = getTodayDailyChallenge;
// export const getTodayDailyChallenge = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req;
//   if (!userId) {
//     return next(new ErrorHandler("Unauthorized", 401));
//   }
//   try {
//     const self = await db.user.findUnique({ where: { id: userId } });
//     if (!self) return next(new ErrorHandler("User not found", 404));
//     const challenges = await db.dailyChallenge.findMany({
//       include: {
//         category: true,
//         challenge: true,
//       },
//       orderBy: { createdAt: "asc" },
//     });
//     console.log("Total challenges:", challenges.length);
//     console.log(
//       "All challenges IDs:",
//       challenges.map((c) => c.id)
//     );
//     if (challenges.length === 0) {
//       return res.status(200).json({
//         challenge: null,
//         msg: "No challenges in DB",
//         success: true,
//       });
//     }
//     const firstChallengeDate = new Date(challenges[0].createdAt);
//     const startDate = new Date(
//       Math.max(new Date(self.createdAt).getTime(), firstChallengeDate.getTime())
//     );
//     const daysSince = differenceInCalendarDays(new Date(), startDate);
//     console.log("startDate:", startDate);
//     console.log("daysSince:", daysSince);
//     console.log("index we want:", daysSince, "of", challenges.length);
//     if (daysSince < 0 || daysSince >= challenges.length) {
//       return res.status(200).json({
//         challenge: null,
//         msg: "No challenge for today",
//         success: true,
//       });
//     }
//     const daily = challenges[daysSince];
//     const completion = await db.completion.findFirst({
//       where: {
//         userId,
//         userChallengeId: daily.id,
//       },
//     });
//     return res.status(200).json({
//       challenge: { ...daily, completion },
//       msg: "Today's Challenge Fetched Successfully",
//       success: true,
//     });
//   } catch (e) {
//     console.log("[GET_TODAY_DAILY_CHALLENGE_ERROR]", e);
//     next(new ErrorHandler("Something went wrong", 500));
//   }
// };
const getDailyChallenges = async (req, res, next) => {
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
        const challenges = await db_1.db.challenge.findMany({
            where: {
                challengeType: "DAILY",
            },
            include: {
                dailyChallenges: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });
        return res.status(201).json({
            challenges,
            msg: "Challenges Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DAILY_CHALLENGES_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getDailyChallenges = getDailyChallenges;
// export const getTodayWeeklyChallenge = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req;
//   if (!userId) {
//     return next(new ErrorHandler("Unauthorized", 401));
//   }
//   const today = startOfDay(new Date());
//   // const today = new Date();
//   // const startOfToday = new Date(today.setHours(0, 0, 0, 0));
//   const endOfToday = new Date(today.setHours(23, 59, 59, 999));
//   try {
//     const user = await db.user.findUnique({ where: { id: userId } });
//     const userTimeZone = user?.timezone || "UTC"; // default to UTC if not set
//     // 2️⃣ Get current date in user's timezone
//     const now = utcToZonedTime(new Date(), userTimeZone);
//     const startOfToday = startOfDay(now);
//     const endOfToday = endOfDay(now);
//     const startTimeLocal = toZonedTime(todayWeekly.startTime, userTimeZone);
//     const endTimeLocal = toZonedTime(todayWeekly.endTime, userTimeZone);
//     const challenges = await db.challenge.findMany({
//       where: {
//         OR: [{ status: "SCHEDULE" }, { status: "RUNNING" }],
//       },
//       include: {
//         weeklyChallenges: {
//           include: {
//             category: true,
//           },
//         },
//       },
//     });
//     // ✅ use helper function here
//     const activeChallenge = challenges.find(
//       (c) => c.startDate && isTodayInChallengeWeek(c.startDate.toString())
//     );
//     if (!activeChallenge) {
//       return res.status(200).json({
//         challenge: null,
//         msg: "No challenge for today",
//         success: true,
//       });
//     }
//     if (activeChallenge.status === "SCHEDULE") {
//       await db.challenge.update({
//         where: { id: activeChallenge.id },
//         data: { status: "RUNNING" },
//       });
//     }
//     const todayWeekly = activeChallenge.weeklyChallenges.find(
//       (w) =>
//         w.dayOfWeek ===
//         getRelativeDayIndex(
//           activeChallenge.startDate.toString(),
//           today.toString()
//         )
//     );
//     const weeklyCompletion = await db.weeklyChallengeCompletion.findFirst({
//       where: {
//         userId: userId,
//         weeklyChallengeId: todayWeekly.id,
//         // date: {
//         //   gte: today,
//         //   lte: endOfToday,
//         // },
//       },
//     });
//     return res.status(200).json({
//       weeklyChallenge: {
//         ...todayWeekly,
//         startDate: activeChallenge.startDate,
//         planName: activeChallenge.title,
//         weeklyCompletion,
//       },
//       msg: todayWeekly
//         ? "Today's Challenge Fetched Successfully"
//         : "No challenge scheduled for today",
//       success: true,
//     });
//   } catch (e) {
//     console.log("[GET_TODAY_CHALLENGE_ERROR]", e);
//     next(new ErrorHandler("Something went wrong", 500));
//   }
// };
const getTodayWeeklyChallenge = async (req, res, next) => {
    const { userId } = req;
    if (!userId)
        return next(new error_1.default("Unauthorized", 401));
    try {
        // 1️⃣ Get user timezone
        const user = await db_1.db.user.findUnique({ where: { id: userId } });
        const userTimeZone = user?.timezone || "UTC";
        const nowLocal = (0, date_fns_tz_1.toZonedTime)(new Date(), userTimeZone);
        // 2️⃣ Fetch running/scheduled parent challenges
        const challenges = await db_1.db.challenge.findMany({
            where: { OR: [{ status: "SCHEDULE" }, { status: "RUNNING" }] },
            include: {
                weeklyChallenges: {
                    include: {
                        category: true,
                    },
                },
            },
        });
        // 3️⃣ Find active challenge for today
        const activeChallenge = challenges.find((c) => (0, dateTimeFormatter_1.isTodayInChallengeWeek)(c.startDate.toISOString(), userTimeZone));
        if (!activeChallenge) {
            return res.status(200).json({
                weeklyChallenge: null,
                msg: "No challenge for today",
                success: true,
            });
        }
        // 4️⃣ Determine today's weekly challenge
        const todayDayIndex = (0, dateTimeFormatter_1.getRelativeDayIndex)(activeChallenge.startDate.toISOString(), nowLocal.toISOString());
        const todayWeekly = activeChallenge.weeklyChallenges.find((w) => w.dayOfWeek === todayDayIndex);
        if (!todayWeekly) {
            return res.status(200).json({
                weeklyChallenge: null,
                msg: "No challenge scheduled for today",
                success: true,
            });
        }
        // 5️⃣ Full-day challenge: start = 00:00, end = 23:59:59 in user's timezone
        const startTimeLocal = (0, date_fns_1.set)(nowLocal, {
            hours: 0,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
        });
        const endTimeLocal = (0, date_fns_1.set)(nowLocal, {
            hours: 23,
            minutes: 59,
            seconds: 59,
            milliseconds: 999,
        });
        // 6️⃣ Convert to UTC for DB queries
        const startUTC = (0, date_fns_tz_1.fromZonedTime)(startTimeLocal, userTimeZone);
        const endUTC = (0, date_fns_tz_1.fromZonedTime)(endTimeLocal, userTimeZone);
        // 7️⃣ Fetch completion status
        const weeklyCompletion = await db_1.db.weeklyChallengeCompletion.findFirst({
            where: {
                userId,
                weeklyChallengeId: todayWeekly.id,
                // date: { gte: startUTC, lte: endUTC },
            },
        });
        // 8️⃣ Return the full-day weekly challenge
        return res.status(200).json({
            weeklyChallenge: {
                ...todayWeekly,
                startTime: startTimeLocal,
                endTime: endTimeLocal,
                startDate: activeChallenge.startDate,
                planName: activeChallenge.title,
                weeklyCompletion,
            },
            msg: "Today's Challenge Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.error("[GET_TODAY_CHALLENGE_ERROR]", e);
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
        // 1️⃣ Get user info including timezone
        const user = await db_1.db.user.findUnique({ where: { id: userId } });
        const userTimeZone = user?.timezone || "UTC";
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
        const activeChallenge = challenges.find((c) => c.startDate &&
            (0, dateTimeFormatter_1.isTodayInChallengeWeek)(c.startDate.toString(), userTimeZone));
        if (!activeChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        // Get all completions for this user + challenge
        const completions = await db_1.db.weeklyChallengeCompletion.findMany({
            where: {
                userId,
                challengeId: activeChallenge.id,
                // skip: {
                //   not: true,
                // },
            },
        });
        // Normalize completion dates (strip time)
        const completionDates = completions.map((c) => ({
            date: (0, date_fns_1.startOfDay)(new Date(c.date)),
            skip: c.skip,
        }));
        const startDate = (0, date_fns_1.startOfDay)(new Date(activeChallenge.startDate));
        // Build a 7-day week view
        const days = Array.from({ length: 7 }).map((_, i) => {
            const currentDay = (0, date_fns_1.addDays)(startDate, i);
            const done = completionDates.some((d) => (0, date_fns_1.isSameDay)(d.date, currentDay) && d.skip === false);
            const skip = completionDates.some((d) => (0, date_fns_1.isSameDay)(d.date, currentDay) && d.skip === true);
            return {
                day: (0, date_fns_tz_1.format)(currentDay, "EEE"), // Mon, Tue, Wed...
                date: currentDay.toISOString().split("T")[0], // 2025-09-12
                done,
                skip,
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
const getPastChallenges = async (req, res, next) => {
    const { userId } = req;
    const type = req.query.type;
    if (!userId)
        return next(new error_1.default("Unauthorized", 401));
    try {
        let challenges;
        if (type === client_1.ChallengeType.DAILY) {
            challenges = await db_1.db.completion.findMany({
                where: {
                    userId,
                    userChallengeId: { not: null },
                },
                select: {
                    skip: true,
                    date: true,
                    createdAt: true,
                    userChallenge: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            challenge: { select: { id: true, title: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        else if (type === client_1.ChallengeType.WEEKLY) {
            challenges = await db_1.db.weeklyChallengeCompletion.findMany({
                where: { userId },
                select: {
                    skip: true,
                    createdAt: true,
                    date: true,
                    weeklyChallenge: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            dayOfWeek: true,
                            challenge: { select: { id: true, title: true, startDate: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        }
        return res.status(200).json({
            pastChallenges: challenges,
            msg: "Fetched Past Challenges Successfully",
            success: true,
        });
    }
    catch (e) {
        console.error("[GET_PAST_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getPastChallenges = getPastChallenges;
const deleteDailyChallengePlainById = async (req, res, next) => {
    const { userId, role } = req;
    const { challengeId } = req.params;
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
        const dailyChallenge = await db_1.db.challenge.findUnique({
            where: {
                id: challengeId,
            },
        });
        if (!dailyChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const challenge = await db_1.db.challenge.delete({
            where: { id: challengeId },
        });
        return res.status(200).json({
            challenge: challenge,
            msg: "Challenge Delete Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_DAILY_CHALLENGE_PLAIN_ERROR]", e);
        logger_1.default.error(e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteDailyChallengePlainById = deleteDailyChallengePlainById;
const deleteWeeklyChallengePlainById = async (req, res, next) => {
    const { userId, role } = req;
    const { challengeId } = req.params;
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
        const weeklyChallenge = await db_1.db.challenge.findUnique({
            where: {
                id: challengeId,
                status: {
                    not: "RUNNING",
                },
            },
        });
        if (!weeklyChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const challenge = await db_1.db.challenge.delete({
            where: { id: challengeId },
        });
        return res.status(200).json({
            challenge: challenge,
            msg: "Challenge Delete Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_WEEKLY_CHALLENGE_PLAIN_ERROR]", e);
        logger_1.default.error(e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteWeeklyChallengePlainById = deleteWeeklyChallengePlainById;
const deleteWeeklyChallengeById = async (req, res, next) => {
    const { userId, role } = req;
    const { weeklyChallengeId } = req.params;
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
        const weeklyChallenge = await db_1.db.weeklyChallenge.findUnique({
            where: {
                id: weeklyChallengeId,
            },
        });
        if (!weeklyChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const challenge = await db_1.db.weeklyChallenge.delete({
            where: { id: weeklyChallengeId },
        });
        return res.status(200).json({
            challenge: challenge,
            msg: "Challenge Delete Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_WEEKLY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteWeeklyChallengeById = deleteWeeklyChallengeById;
const deleteDailyChallengeById = async (req, res, next) => {
    const { userId, role } = req;
    const { dailyChallengeId } = req.params;
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
        const weeklyChallenge = await db_1.db.dailyChallenge.findUnique({
            where: {
                id: dailyChallengeId,
            },
        });
        if (!weeklyChallenge) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const challenge = await db_1.db.dailyChallenge.delete({
            where: { id: dailyChallengeId },
        });
        return res.status(200).json({
            challenge: challenge,
            msg: "Challenge Delete Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_DAILY_CHALLENGE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteDailyChallengeById = deleteDailyChallengeById;
node_cron_1.default.schedule("*/10 * * * *", async () => {
    console.log("[CRON] Checking scheduled challenges...");
    try {
        const now = new Date();
        // 1️⃣ Move SCHEDULE → RUNNING if startDate <= now
        const toStart = await db_1.db.challenge.findMany({
            where: {
                status: "SCHEDULE",
                startDate: { lte: now },
            },
        });
        for (const c of toStart) {
            await db_1.db.challenge.update({
                where: { id: c.id },
                data: { status: "RUNNING" },
            });
            console.log(`[CRON] Challenge ${c.id} started!`);
        }
        // 2️⃣ Move RUNNING → COMPLETED if startDate + 7 days < now
        const toComplete = await db_1.db.challenge.findMany({
            where: { status: "RUNNING" },
        });
        for (const c of toComplete) {
            const challengeEnd = (0, date_fns_1.addDays)(c.startDate, 7);
            if ((0, date_fns_1.isAfter)(now, challengeEnd)) {
                await db_1.db.challenge.update({
                    where: { id: c.id },
                    data: { status: "COMPLETED" },
                });
                console.log(`[CRON] Challenge ${c.id} completed!`);
            }
        }
    }
    catch (error) {
        console.error("[CRON ERROR]", error);
    }
});
// cron.schedule("* * * * *", async () => {
// cron.schedule("0 0 * * *", async () => {
//   console.log("⏰ Triggering daily skip worker...");
//   await challengeSkipQueue.add(
//     "weeklyChallengeSkipJob",
//     {},
//     {
//       removeOnComplete: true,
//       removeOnFail: true,
//     }
//   );
// });
