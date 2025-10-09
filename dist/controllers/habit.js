"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabit = exports.deleteUserHabit = exports.updateUserHabit = exports.updateAdminHabit = exports.getUserHabitsProgress = exports.getAdminHabits = exports.getUserHabits = exports.getHabitOfSelection = exports.saveUserHabit = exports.createHabit = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const createHabit = async (req, res, next) => {
    const { userId, role } = req;
    const { flow } = req.query;
    const { title, daysOfWeek, categoryId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        let habit;
        if (role == client_1.Role.ADMIN) {
            habit = await db_1.db.habit.create({
                data: {
                    title,
                    daysOfWeek,
                    categoryId,
                },
            });
        }
        else {
            habit = await db_1.db.habit.create({
                data: {
                    title,
                    daysOfWeek,
                    userId,
                    categoryId,
                },
            });
            if (flow === "inner") {
                const saveHabits = await db_1.db.userHabit.create({
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
    }
    catch (e) {
        console.log("[CREATE_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createHabit = createHabit;
const saveUserHabit = async (req, res, next) => {
    const { userId } = req;
    const { habitIds } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const habits = await db_1.db.habit.findMany({
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
            return next(new error_1.default("No valid habits found", 400));
        }
        const saveHabits = await db_1.db.userHabit.createMany({
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
    }
    catch (e) {
        console.log("[CREATE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.saveUserHabit = saveUserHabit;
const getHabitOfSelection = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const habits = await db_1.db.habit.findMany({
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
    }
    catch (e) {
        console.log("[CREATE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getHabitOfSelection = getHabitOfSelection;
const getUserHabits = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date().getDay();
    const weekStart = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
    const weekEnd = (0, date_fns_1.endOfWeek)(today, { weekStartsOn: 1 });
    console.log(today);
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const habits = await db_1.db.userHabit.findMany({
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
        const days = (0, date_fns_1.eachDayOfInterval)({ start: weekStart, end: weekEnd });
        const mapHabitToWeekly = (habit) => {
            const week = days.map((day) => {
                const normalizedDay = new Date(day);
                normalizedDay.setHours(0, 0, 0, 0);
                const done = habit.completions.some((c) => {
                    const d = new Date(c.date);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() === normalizedDay.getTime();
                });
                return {
                    day: (0, date_fns_1.format)(day, "EEEEE"), // e.g. "Mon"
                    date: (0, date_fns_1.format)(day, "yyyy-MM-dd"), // e.g. "2025-09-01"
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
        const result = habits.map(mapHabitToWeekly);
        return res.status(200).json({
            // habits,
            habits: result,
            msg: "Habit Fetched Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CREATE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getUserHabits = getUserHabits;
const getAdminHabits = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date().getDay();
    console.log(today);
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const habits = await db_1.db.habit.findMany({
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
    }
    catch (e) {
        console.log("[CREATE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAdminHabits = getAdminHabits;
const getUserHabitsProgress = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date();
    const weekStart = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
    const weekEnd = (0, date_fns_1.endOfWeek)(today, { weekStartsOn: 1 });
    // console.log({ weekStart, weekEnd });
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const habits = await db_1.db.userHabit.findMany({
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
        const days = (0, date_fns_1.eachDayOfInterval)({ start: weekStart, end: weekEnd });
        // console.log(JSON.stringify(habits, null, 2));
        const mapHabitToWeekly = (habit) => {
            const week = days.map((day) => {
                const normalizedDay = new Date(day);
                normalizedDay.setHours(0, 0, 0, 0);
                const done = habit.completions.some((c) => {
                    const d = new Date(c.date);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() === normalizedDay.getTime();
                });
                return {
                    day: (0, date_fns_1.format)(day, "EEEEE"), // e.g. "Mon"
                    date: (0, date_fns_1.format)(day, "yyyy-MM-dd"), // e.g. "2025-09-01"
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
    }
    catch (e) {
        console.log("[CREATE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getUserHabitsProgress = getUserHabitsProgress;
const updateAdminHabit = async (req, res, next) => {
    const { userId } = req;
    const { habitId } = req.params;
    const { title, daysOfWeek, categoryId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const existingHabit = await db_1.db.habit.findUnique({
            where: { id: habitId, userId: null },
        });
        if (!existingHabit) {
            return next(new error_1.default("Habit not found", 404));
        }
        if (existingHabit.userId !== null && self.role !== "ADMIN") {
            return next(new error_1.default("Forbidden", 403));
        }
        const updatedHabit = await db_1.db.habit.update({
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
    }
    catch (e) {
        console.log("[UPDATE_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateAdminHabit = updateAdminHabit;
const updateUserHabit = async (req, res, next) => {
    const { userId } = req;
    const { habitId } = req.params;
    const { title, daysOfWeek, categoryId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const existingHabit = await db_1.db.habit.findUnique({
            where: { id: habitId },
        });
        if (!existingHabit) {
            return next(new error_1.default("Habit not found", 404));
        }
        if (existingHabit.userId !== userId) {
            return next(new error_1.default("Forbidden", 403));
        }
        const updatedHabit = await db_1.db.habit.update({
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
    }
    catch (e) {
        console.log("[UPDATE_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateUserHabit = updateUserHabit;
const deleteUserHabit = async (req, res, next) => {
    const { userId } = req;
    const { habitId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const existingHabit = await db_1.db.habit.findUnique({
            where: { id: habitId },
        });
        if (!existingHabit) {
            return next(new error_1.default("Habit not found", 404));
        }
        if (existingHabit.userId == null && existingHabit.userId !== userId) {
            const habit = await db_1.db.userHabit.deleteMany({
                where: { habitId: existingHabit.id },
            });
            return res.status(200).json({
                habit,
                msg: "Habit Deleted Successfully",
                success: true,
            });
        }
        const habit = await db_1.db.habit.delete({
            where: { id: habitId },
        });
        return res.status(200).json({
            habit,
            msg: "Habit Deleted Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_USER_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteUserHabit = deleteUserHabit;
const deleteHabit = async (req, res, next) => {
    const { userId } = req;
    const { habitId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const existingHabit = await db_1.db.habit.findUnique({
            where: { id: habitId, userId: null },
        });
        if (!existingHabit) {
            return next(new error_1.default("Habit not found", 404));
        }
        const habit = await db_1.db.habit.delete({
            where: { id: habitId },
        });
        return res.status(200).json({
            habit,
            msg: "Habit Deleted Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_ADMIN_HABIT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteHabit = deleteHabit;
