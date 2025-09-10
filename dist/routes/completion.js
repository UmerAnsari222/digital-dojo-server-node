"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionRouter = void 0;
const express_1 = require("express");
const completion_1 = require("../controllers/completion");
const auth_1 = require("../middlewares/auth");
exports.completionRouter = (0, express_1.Router)();
exports.completionRouter.post("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, completion_1.makeCompletion)(req, res, next);
});
