"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.habitRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const habit_1 = require("../controllers/habit");
exports.habitRouter = (0, express_1.Router)();
exports.habitRouter.post("/create", auth_1.globalAuthMiddleware, async (req, res, next) => {
    await (0, habit_1.createHabit)(req, res, next);
});
exports.habitRouter.post("/save", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.saveUserHabit)(req, res, next);
});
exports.habitRouter.get("/selection", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.getHabitOfSelection)(req, res, next);
});
exports.habitRouter.get("/all", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, habit_1.getAdminHabits)(req, res, next);
});
exports.habitRouter.get("/today", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.getUserHabits)(req, res, next);
});
exports.habitRouter.get("/progress", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.getUserHabitsProgress)(req, res, next);
});
exports.habitRouter.patch("/update/:habitId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.updateUserHabit)(req, res, next);
});
exports.habitRouter.patch("/update/:habitId/admin", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.updateAdminHabit)(req, res, next);
});
exports.habitRouter.delete("/delete/:habitId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, habit_1.deleteUserHabit)(req, res, next);
});
