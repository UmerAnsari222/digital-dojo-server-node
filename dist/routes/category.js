"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRouter = void 0;
const express_1 = require("express");
const category_1 = require("../controllers/category");
const auth_1 = require("../middlewares/auth");
exports.categoryRouter = (0, express_1.Router)();
exports.categoryRouter.post("/create", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, category_1.createCategory)(req, res, next);
});
exports.categoryRouter.get("/all", async (req, res, next) => {
    await (0, category_1.getAllCategories)(req, res, next);
});
exports.categoryRouter.patch("/update/:categoryId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, category_1.updateCategory)(req, res, next);
});
exports.categoryRouter.delete("/:categoryId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, category_1.deleteCategory)(req, res, next);
});
