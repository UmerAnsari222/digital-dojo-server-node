"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = void 0;
const error_1 = __importDefault(require("../utils/error"));
const hashPassword_1 = require("../utils/hashPassword");
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const changePassword = async (req, res, next) => {
    const { userId } = req;
    const { oldPassword, confirmPassword, newPassword } = req.body;
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("User not found", 404));
        }
        if (self.provider !== client_1.Provider.EMAIL) {
            return next(new error_1.default("Change password is not valid for you", 400));
        }
        // Check if old password is correct
        const isMatch = await (0, hashPassword_1.comparePassword)(oldPassword, self.password);
        if (!isMatch) {
            return next(new error_1.default("Old password is incorrect", 400));
        }
        // check password is same
        if (newPassword !== confirmPassword) {
            return next(new error_1.default("Passwords do not match", 400));
        }
        const hashed = await (0, hashPassword_1.hashedPassword)(newPassword);
        // Update the password in the database
        await db_1.db.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
        return res
            .status(200)
            .json({ success: true, msg: "Password change successfully" });
    }
    catch (error) {
        console.log("[CHANGE_PASSWORD_ERROR]", error);
        return next(new error_1.default("Something went wrong", 500, error));
    }
};
exports.changePassword = changePassword;
