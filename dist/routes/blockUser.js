"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUserRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const blockUser_1 = require("../controllers/blockUser");
exports.blockUserRouter = (0, express_1.Router)();
exports.blockUserRouter.post("/:userId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, blockUser_1.blockUser)(req, res, next);
});
exports.blockUserRouter.delete("/:userId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, blockUser_1.unblockUser)(req, res, next);
});
exports.blockUserRouter.get("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, blockUser_1.getBlockedUsers)(req, res, next);
});
