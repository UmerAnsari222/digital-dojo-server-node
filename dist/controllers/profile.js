"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const getProfile = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new Error("Unauthorized"));
    }
    try {
        const user = await db_1.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return next(new error_1.default("User not found", 404));
        }
        if (user.imageUrl != null) {
            user.imageUrl = await (0, aws_1.getObjectUrl)({
                bucket: dotEnv_1.AWS_BUCKET_NAME,
                key: user.imageUrl,
            });
        }
        return res
            .status(200)
            .json({ user, success: true, msg: "Profile fetched successfully" });
    }
    catch (error) {
        console.error("[ERROR_GET_PROFILE]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    const { userId } = req;
    const { name, key } = req.body;
    if (!userId) {
        return next(new Error("Unauthorized"));
    }
    try {
        const isExisting = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!isExisting) {
            return next(new error_1.default("User not found", 404));
        }
        if (isExisting.imageUrl && isExisting.imageUrl !== key) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: isExisting.imageUrl,
            });
        }
        const updatedUser = await db_1.db.user.update({
            where: { id: userId },
            data: { name, imageUrl: key },
        });
        return res.status(200).json({
            user: updatedUser,
            success: true,
            msg: "Profile updated successfully",
        });
    }
    catch (error) {
        console.error("[ERROR_UPDATE_PROFILE]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateProfile = updateProfile;
