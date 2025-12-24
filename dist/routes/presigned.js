"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlRouter = void 0;
const express_1 = require("express");
const presigned_1 = require("../controllers/presigned");
exports.urlRouter = (0, express_1.Router)();
exports.urlRouter.post("/generate-url", async (req, res, next) => {
    await (0, presigned_1.generatePresignedUrl)(req, res, next);
});
exports.urlRouter.post("/upload-url", async (req, res, next) => {
    await (0, presigned_1.generateCFPresignedUrl)(req, res, next);
});
