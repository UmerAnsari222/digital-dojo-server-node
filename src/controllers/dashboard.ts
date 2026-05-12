import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { year } = req.query as unknown as { year: string };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
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
  } catch (error) {
    console.error("[ERROR_GET_DASHBOARD_STATS]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

async function getStats() {
  const total = await db.user.count();

  const subscribedUsers = await db.user.findMany({
    where: {
      OR: [
        { subscription: { status: "active" } },
        { subscriptionRevenueCat: { isActive: true } },
      ],
    },
    select: { id: true },
  });

  const subscribed = subscribedUsers.length;
  const free = total - subscribed;

  return [total, subscribed, free];
}

async function getYearStats(year: number) {
  const subscribedMonthly: Record<string, number> = {};
  const freeMonthly: Record<string, number> = {};

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

    const subscribedRC = await db.user.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        OR: [
          { subscription: { isNot: null } },
          { subscriptionRevenueCat: { isNot: null } },
        ],
      },
      select: { id: true },
    });

    const subscribedCount = subscribedRC.length;

    const allInMonth = await db.user.count({
      where: { createdAt: { gte: start, lt: end } },
    });

    const freeCount = allInMonth - subscribedCount;

    const label = monthNames[month];

    subscribedMonthly[label] = subscribedCount;
    freeMonthly[label] = freeCount;
  }

  return {
    subscribedMonthly,
    freeMonthly,
  };
}
