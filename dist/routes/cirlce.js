"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circleRouter = void 0;
const express_1 = require("express");
const circle_1 = require("../controllers/circle");
const auth_1 = require("../middlewares/auth");
exports.circleRouter = (0, express_1.Router)();
exports.circleRouter.post("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.createCircle)(req, res, next);
});
exports.circleRouter.get("/all", async (req, res, next) => {
    await (0, circle_1.getAllCircle)(req, res, next);
});
