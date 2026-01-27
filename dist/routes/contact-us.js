"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactUsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const contact_us_1 = require("../controllers/contact-us");
exports.contactUsRouter = (0, express_1.Router)();
exports.contactUsRouter.post("/create", auth_1.authMiddleware, async (req, res, next) => {
    await (0, contact_us_1.createMessage)(req, res, next);
});
exports.contactUsRouter.get("/all", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, contact_us_1.getAllMessages)(req, res, next);
});
exports.contactUsRouter.patch("/mark-read/:messageId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, contact_us_1.markRead)(req, res, next);
});
exports.contactUsRouter.delete("/delete/:messageId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, contact_us_1.deleteMessage)(req, res, next);
});
