"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beltRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const belt_1 = require("../controllers/belt");
exports.beltRouter = (0, express_1.Router)();
exports.beltRouter.post("/", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, belt_1.createBelt)(req, res, next);
});
exports.beltRouter.get("/all", async (req, res, next) => {
    await (0, belt_1.getAllBelts)(req, res, next);
});
exports.beltRouter.patch("/:beltId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, belt_1.updateBelt)(req, res, next);
});
