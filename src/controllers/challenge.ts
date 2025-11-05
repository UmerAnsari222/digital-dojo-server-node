import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { ChallengeType, Role } from "@prisma/client";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  subDays,
  parse,
  setSeconds,
  setMinutes,
  setHours,
  set,
} from "date-fns";
import {
  toZonedTime,
  format,
  formatInTimeZone,
  toDate,
  fromZonedTime,
} from "date-fns-tz";
import {
  convertToUserTime,
  formatTimeForUser,
  getRelativeDayIndex,
  isTodayInChallengeWeek,
} from "../utils/dateTimeFormatter";
import logger from "../config/logger";
import cron from "node-cron";
import { challengeSkipWorker } from "../jobs/workers/challengeSkip";
import { challengeSkipQueue } from "../jobs/queues/challengeSkip";

export const createDailyChallengePlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { title, challengeType } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.create({
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
  } catch (e) {
    console.log("[CREATE_DAILY_CHALLENGE_PLAIN_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const createDailyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { title, description, categoryId, challengeId, startTime, endTime } =
    req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return next(new ErrorHandler("Plan not found", 404));
    }

    const daily = await db.dailyChallenge.create({
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
  } catch (e) {
    console.log("[CREATE_DAILY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const createWeeklyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { title, challengeType } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.create({
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

    await db.weeklyChallenge.createMany({
      data: weeklyChallenges,
    });

    return res.status(201).json({
      challenge,
      msg: "Challenge Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllWeeklyChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const now = new Date();

    const weeklyChallenges = await db.challenge.findMany({
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
    const updatedChallenges = await Promise.all(
      weeklyChallenges.map(async (challenge) => {
        if (
          challenge.status === "SCHEDULE" &&
          challenge.startDate &&
          isAfter(now, new Date(challenge.startDate))
        ) {
          // Update the challenge to RUNNING
          const updated = await db.challenge.update({
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

        if (
          challenge.status === "RUNNING" &&
          challenge.startDate &&
          isAfter(now, addDays(new Date(challenge.startDate), 7))
        ) {
          const updated = await db.challenge.update({
            where: { id: challenge.id },
            data: { status: "COMPLETED" },
            include: { weeklyChallenges: { orderBy: { dayOfWeek: "asc" } } },
          });
          return updated;
        }
        return challenge; // leave as is if not ready to start
      })
    );

    return res.status(200).json({
      // challenges: weeklyChallenges,
      challenges: updatedChallenges,
      msg: "Challenges Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_ALL_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateWeeklyChallengeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { weeklyChallengeId } = req.params;
  const { title, description, startTime, endTime, categoryId } = req.body;

  console.log({ startTime, endTime, description });

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  if (!title) {
    return next(new ErrorHandler("Title is required", 400));
  }

  if (!startTime) {
    return next(new ErrorHandler("Start Time is required", 400));
  }

  if (!endTime) {
    return next(new ErrorHandler("End Time is required", 400));
  }

  if (!categoryId) {
    return next(new ErrorHandler("Category is required", 400));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenge = await db.weeklyChallenge.findUnique({
      where: {
        id: weeklyChallengeId,
      },
    });

    if (!weeklyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const challenge = await db.weeklyChallenge.update({
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
  } catch (e) {
    console.log("[UPDATE_WEEKLY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const makePublishWeeklyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { challengeId } = req.params;
  const { startDate } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      include: {
        weeklyChallenges: true,
      },
    });

    if (!challenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const isDataFilled = challenge.weeklyChallenges.every(
      (wc) => wc.isChallengeUpdate
    );

    console.log(isDataFilled);

    if (!isDataFilled) {
      return next(
        new ErrorHandler(
          "Please fill all the challenge details before publishing",
          400
        )
      );
    }

    if (challenge.startDate) {
      return next(new ErrorHandler("Challenge already started", 400));
    }

    // ✅ Check for overlapping challenges in the 7-day window
    const startDateObj = new Date(startDate);
    const weekStart = subDays(startDateObj, 3);
    const weekEnd = addDays(startDateObj, 3);

    const overlappingChallenge = await db.challenge.findFirst({
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
      return next(
        new ErrorHandler(
          `Another challenge is already scheduled within this week: ${overlappingChallenge.startDate.toDateString()}`,
          400
        )
      );
    }

    const updateChallenge = await db.challenge.update({
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
  } catch (e) {
    console.log("[MAKE_PUBLISH_WEEKLY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getTodayDailyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) return next(new ErrorHandler("User not found", 404));

    const challenges = await db.dailyChallenge.findMany({
      include: {
        category: true,
        challenge: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log("Total challenges:", challenges.length);
    console.log(
      "All challenges IDs:",
      challenges.map((c) => c.id)
    );

    if (challenges.length === 0) {
      return res.status(200).json({
        challenge: null,
        msg: "No challenges in DB",
        success: true,
      });
    }

    const firstChallengeDate = new Date(challenges[0].createdAt);
    const startDate = new Date(
      Math.max(new Date(self.createdAt).getTime(), firstChallengeDate.getTime())
    );

    const daysSince = differenceInCalendarDays(new Date(), startDate);

    console.log("startDate:", startDate);
    console.log("daysSince:", daysSince);
    console.log("index we want:", daysSince, "of", challenges.length);

    if (daysSince < 0 || daysSince >= challenges.length) {
      return res.status(200).json({
        challenge: null,
        msg: "No challenge for today",
        success: true,
      });
    }

    const daily = challenges[daysSince];

    const completion = await db.completion.findFirst({
      where: {
        userId,
        userChallengeId: daily.id,
      },
    });

    return res.status(200).json({
      challenge: { ...daily, completion },
      msg: "Today's Challenge Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_TODAY_DAILY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getDailyChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenges = await db.challenge.findMany({
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
  } catch (e) {
    console.log("[DAILY_CHALLENGES_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

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

export const getTodayWeeklyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  if (!userId) return next(new ErrorHandler("Unauthorized", 401));

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    const userTimeZone = user?.timezone || "UTC";

    const nowLocal = toZonedTime(new Date(), userTimeZone);

    // Fetch running/scheduled challenges
    const challenges = await db.challenge.findMany({
      where: { OR: [{ status: "SCHEDULE" }, { status: "RUNNING" }] },
      include: { weeklyChallenges: true },
    });

    // Find active challenge for today
    const activeChallenge = challenges.find((c) => {
      if (!c.startDate) return false;

      const startDateLocal = startOfDay(
        toZonedTime(new Date(c.startDate), userTimeZone)
      );
      const dayDiff = differenceInCalendarDays(nowLocal, startDateLocal);
      return dayDiff >= 0 && dayDiff <= 6; // 7-day window
    });

    if (!activeChallenge) {
      return res.status(200).json({
        weeklyChallenge: null,
        msg: "No challenge for today",
        success: true,
      });
    }

    // Relative day index
    const startDateLocal = startOfDay(
      toZonedTime(new Date(activeChallenge.startDate), userTimeZone)
    );
    const todayDayIndex = differenceInCalendarDays(nowLocal, startDateLocal);

    const todayWeekly = activeChallenge.weeklyChallenges.find(
      (w) => w.dayOfWeek === todayDayIndex
    );

    if (!todayWeekly) {
      return res.status(200).json({
        weeklyChallenge: null,
        msg: "No challenge scheduled for today",
        success: true,
      });
    }

    // Build start/end datetime relative to startDateLocal
    const challengeDayLocal = addDays(startDateLocal, todayDayIndex);

    const startTimeLocal = set(challengeDayLocal, {
      hours: todayWeekly.startTime.getHours(),
      minutes: todayWeekly.startTime.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    });

    const endTimeLocal = set(challengeDayLocal, {
      hours: todayWeekly.endTime.getHours(),
      minutes: todayWeekly.endTime.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    });

    // Handle overnight challenge (endTime < startTime)
    if (isBefore(endTimeLocal, startTimeLocal)) {
      endTimeLocal.setDate(endTimeLocal.getDate() + 1);
    }

    const startUTC = fromZonedTime(startTimeLocal, userTimeZone);
    const endUTC = fromZonedTime(endTimeLocal, userTimeZone);

    console.log({
      startDateLocal,
      startTimeLocal,
      endTimeLocal,
      startUTC,
      endUTC,
    });

    // Check if challenge is active
    if (isBefore(nowLocal, startTimeLocal)) {
      return res.status(200).json({
        weeklyChallenge: null,
        msg: `Challenge will start at ${startTimeLocal.toLocaleTimeString(
          "en-US",
          {
            timeZone: userTimeZone,
          }
        )}`,
        success: true,
      });
    }

    if (isAfter(nowLocal, endTimeLocal)) {
      return res.status(200).json({
        weeklyChallenge: null,
        msg: "Challenge has ended for today",
        success: true,
      });
    }

    const weeklyCompletion = await db.weeklyChallengeCompletion.findFirst({
      where: {
        userId,
        weeklyChallengeId: todayWeekly.id,
        date: { gte: startUTC, lte: endUTC },
      },
    });

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
  } catch (e) {
    console.error("[GET_TODAY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getWeeklyChallengeProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = startOfDay(new Date());

  try {
    // 1️⃣ Get user info including timezone
    const user = await db.user.findUnique({ where: { id: userId } });
    const userTimeZone = user?.timezone || "UTC";

    const challenges = await db.challenge.findMany({
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
    const activeChallenge = challenges.find(
      (c) =>
        c.startDate &&
        isTodayInChallengeWeek(c.startDate.toString(), userTimeZone)
    );

    if (!activeChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    // Get all completions for this user + challenge
    const completions = await db.weeklyChallengeCompletion.findMany({
      where: {
        userId,
        challengeId: activeChallenge.id,
        skip: {
          not: true,
        },
      },
    });

    // Normalize completion dates (strip time)
    const completionDates = completions.map((c) =>
      startOfDay(new Date(c.date))
    );

    const startDate = startOfDay(new Date(activeChallenge.startDate));

    // Build a 7-day week view
    const days = Array.from({ length: 7 }).map((_, i) => {
      const currentDay = addDays(startDate, i);
      const done = completionDates.some((d) => isSameDay(d, currentDay));

      return {
        day: format(currentDay, "EEE"), // Mon, Tue, Wed...
        date: currentDay.toISOString().split("T")[0], // 2025-09-12
        done,
      };
    });

    return res.status(200).json({
      progress: days,
      msg: "Weekly Streak Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_TODAY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getPastChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const type = req.query.type as ChallengeType;

  if (!userId) return next(new ErrorHandler("Unauthorized", 401));

  try {
    let challenges;

    if (type === ChallengeType.DAILY) {
      challenges = await db.completion.findMany({
        where: {
          userId,
          userChallengeId: { not: null },
        },
        select: {
          skip: true,
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
    } else if (type === ChallengeType.WEEKLY) {
      challenges = await db.weeklyChallengeCompletion.findMany({
        where: { userId },
        select: {
          skip: true,
          createdAt: true,
          weeklyChallenge: {
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

    return res.status(200).json({
      pastChallenges: challenges,
      msg: "Fetched Past Challenges Successfully",
      success: true,
    });
  } catch (e) {
    console.error("[GET_PAST_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteDailyChallengePlainById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { challengeId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const dailyChallenge = await db.challenge.findUnique({
      where: {
        id: challengeId,
      },
    });

    if (!dailyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const challenge = await db.challenge.delete({
      where: { id: challengeId },
    });

    return res.status(200).json({
      challenge: challenge,
      msg: "Challenge Delete Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_DAILY_CHALLENGE_PLAIN_ERROR]", e);
    logger.error(e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteWeeklyChallengePlainById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { challengeId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenge = await db.challenge.findUnique({
      where: {
        id: challengeId,
        status: {
          not: "RUNNING",
        },
      },
    });

    if (!weeklyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const challenge = await db.challenge.delete({
      where: { id: challengeId },
    });

    return res.status(200).json({
      challenge: challenge,
      msg: "Challenge Delete Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_WEEKLY_CHALLENGE_PLAIN_ERROR]", e);
    logger.error(e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteWeeklyChallengeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { weeklyChallengeId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenge = await db.weeklyChallenge.findUnique({
      where: {
        id: weeklyChallengeId,
      },
    });

    if (!weeklyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const challenge = await db.weeklyChallenge.delete({
      where: { id: weeklyChallengeId },
    });

    return res.status(200).json({
      challenge: challenge,
      msg: "Challenge Delete Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_WEEKLY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteDailyChallengeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { dailyChallengeId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenge = await db.dailyChallenge.findUnique({
      where: {
        id: dailyChallengeId,
      },
    });

    if (!weeklyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const challenge = await db.dailyChallenge.delete({
      where: { id: dailyChallengeId },
    });

    return res.status(200).json({
      challenge: challenge,
      msg: "Challenge Delete Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_DAILY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

cron.schedule("*/10 * * * *", async () => {
  console.log("[CRON] Checking scheduled challenges...");

  try {
    const now = new Date();

    // 1️⃣ Move SCHEDULE → RUNNING if startDate <= now
    const toStart = await db.challenge.findMany({
      where: {
        status: "SCHEDULE",
        startDate: { lte: now },
      },
    });

    for (const c of toStart) {
      await db.challenge.update({
        where: { id: c.id },
        data: { status: "RUNNING" },
      });
      console.log(`[CRON] Challenge ${c.id} started!`);
    }

    // 2️⃣ Move RUNNING → COMPLETED if startDate + 7 days < now
    const toComplete = await db.challenge.findMany({
      where: { status: "RUNNING" },
    });

    for (const c of toComplete) {
      const challengeEnd = addDays(c.startDate!, 7);
      if (isAfter(now, challengeEnd)) {
        await db.challenge.update({
          where: { id: c.id },
          data: { status: "COMPLETED" },
        });
        console.log(`[CRON] Challenge ${c.id} completed!`);
      }
    }
  } catch (error) {
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
