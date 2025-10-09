import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { Habit, Role, UserHabit } from "@prisma/client";
import { eachDayOfInterval, endOfWeek, startOfWeek, format } from "date-fns";

export const createHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { flow } = req.query;
  const { title, daysOfWeek, categoryId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    let habit: Habit;

    if (role == Role.ADMIN) {
      habit = await db.habit.create({
        data: {
          title,
          daysOfWeek,
          categoryId,
        },
      });
    } else {
      habit = await db.habit.create({
        data: {
          title,
          daysOfWeek,
          userId,
          categoryId,
        },
      });

      if (flow === "inner") {
        const saveHabits = await db.userHabit.create({
          data: {
            habitId: habit.id,
            userId: userId,
          },
        });
      }
    }

    return res.status(201).json({
      habit,
      msg: "Habit Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const saveUserHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { habitIds } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const habits = await db.habit.findMany({
      where: {
        id: {
          in: habitIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (habits.length === 0) {
      return next(new ErrorHandler("No valid habits found", 400));
    }

    const saveHabits = await db.userHabit.createMany({
      data: habits.map((habit) => {
        return {
          userId,
          habitId: habit.id,
        };
      }),
    });

    return res.status(201).json({
      habits: saveHabits,
      msg: "Habit Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getHabitOfSelection = async (
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

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const habits = await db.habit.findMany({
      where: {
        OR: [{ userId: userId }, { userId: null }],
      },
      // include: {
      //   habit: {
      //     include: {
      //       category: true,
      //     },
      //   },
      //   completions: true,
      // },
      include: {
        category: true,
      },
    });

    return res.status(200).json({
      habits,
      msg: "Habit Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getUserHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = new Date().getDay();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  console.log(today);

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const habits = await db.userHabit.findMany({
      where: {
        // OR: [
        //     { userId: null }, { userId: userId }
        // ],
        userId: userId,
        habit: {
          daysOfWeek: {
            has: today,
          },
        },
      },
      select: {
        id: true,
        habit: {
          include: {
            category: true,
          },
        },
        completions: {
          where: {
            userId: userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
      },
    });

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const mapHabitToWeekly = (habit: any) => {
      const week = days.map((day) => {
        const normalizedDay = new Date(day);
        normalizedDay.setHours(0, 0, 0, 0);

        const done = habit.completions.some((c) => {
          const d = new Date(c.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === normalizedDay.getTime();
        });

        return {
          day: format(day, "EEEEE"), // e.g. "Mon"
          date: format(day, "yyyy-MM-dd"), // e.g. "2025-09-01"
          done,
        };
      });

      return {
        id: habit.id,
        title: habit.habit.title,
        habit: habit.habit,
        // category: habit.habit.category,
        userId: userId,
        habitId: habit.habit.id,
        week,
      };
    };

    const result = habits.map(mapHabitToWeekly);

    return res.status(200).json({
      // habits,
      habits: result,
      msg: "Habit Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAdminHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = new Date().getDay();

  console.log(today);

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const habits = await db.habit.findMany({
      where: {
        userId: null,
        // user: {
        //   role: "ADMIN",
        // },
      },
      include: {
        category: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return res.status(200).json({
      habits,
      msg: "Habit Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getUserHabitsProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // console.log({ weekStart, weekEnd });

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const habits = await db.userHabit.findMany({
      where: {
        // OR: [
        //     { userId: null }, { userId: userId }
        // ],
        userId: userId,
        // habit: {
        //   daysOfWeek: {
        //     has: today,
        //   },
        // },
      },
      select: {
        id: true,
        habit: {
          include: {
            category: true,
          },
        },

        completions: {
          where: {
            userId: userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
      },
    });

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // console.log(JSON.stringify(habits, null, 2));

    const mapHabitToWeekly = (habit: any) => {
      const week = days.map((day) => {
        const normalizedDay = new Date(day);
        normalizedDay.setHours(0, 0, 0, 0);

        const done = habit.completions.some((c) => {
          const d = new Date(c.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === normalizedDay.getTime();
        });

        return {
          day: format(day, "EEEEE"), // e.g. "Mon"
          date: format(day, "yyyy-MM-dd"), // e.g. "2025-09-01"
          done,
        };
      });

      return {
        id: habit.id,
        title: habit.habit.title,
        habit: habit.habit,
        category: habit.habit.category,
        userId: userId,
        habitId: habit.habit.id,
        week,
      };
    };

    // console.log({ mapHabitToWeekly });

    const result = habits.map(mapHabitToWeekly);

    // console.log(result);

    return res.status(200).json({
      // habits,
      result,
      msg: "Habit Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateAdminHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { title, daysOfWeek, categoryId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId, userId: null },
    });
    if (!existingHabit) {
      return next(new ErrorHandler("Habit not found", 404));
    }

    if (existingHabit.userId !== null && self.role !== "ADMIN") {
      return next(new ErrorHandler("Forbidden", 403));
    }

    const updatedHabit = await db.habit.update({
      where: { id: habitId },
      data: {
        title: title ?? existingHabit.title,
        daysOfWeek: daysOfWeek ?? existingHabit.daysOfWeek,
        categoryId: categoryId ?? existingHabit.categoryId,
      },
    });

    return res.status(200).json({
      habit: updatedHabit,
      msg: "Habit Updated Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[UPDATE_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateUserHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { habitId } = req.params;
  const { title, daysOfWeek, categoryId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId },
    });
    if (!existingHabit) {
      return next(new ErrorHandler("Habit not found", 404));
    }

    if (existingHabit.userId !== userId) {
      return next(new ErrorHandler("Forbidden", 403));
    }

    const updatedHabit = await db.habit.update({
      where: { id: habitId },
      data: {
        title: title ?? existingHabit.title,
        daysOfWeek: daysOfWeek ?? existingHabit.daysOfWeek,
        categoryId: categoryId ?? existingHabit.categoryId,
      },
    });

    return res.status(200).json({
      habit: updatedHabit,
      msg: "Habit Updated Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[UPDATE_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteUserHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { habitId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId },
    });

    if (!existingHabit) {
      return next(new ErrorHandler("Habit not found", 404));
    }

    if (existingHabit.userId == null && existingHabit.userId !== userId) {
      const habit = await db.userHabit.deleteMany({
        where: { habitId: existingHabit.id },
      });
      return res.status(200).json({
        habit,
        msg: "Habit Deleted Successfully",
        success: true,
      });
    }

    const habit = await db.habit.delete({
      where: { id: habitId },
    });

    return res.status(200).json({
      habit,
      msg: "Habit Deleted Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_USER_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteHabit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { habitId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId, userId: null },
    });

    if (!existingHabit) {
      return next(new ErrorHandler("Habit not found", 404));
    }

    const habit = await db.habit.delete({
      where: { id: habitId },
    });

    return res.status(200).json({
      habit,
      msg: "Habit Deleted Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[DELETE_ADMIN_HABIT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
