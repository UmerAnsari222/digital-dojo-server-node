"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginWithGoogle = exports.loginWithApple = exports.login = exports.register = void 0;
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const error_1 = __importDefault(require("../utils/error"));
const hashPassword_1 = require("../utils/hashPassword");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../services/auth");
const register = async (req, res, next) => {
    try {
        const { name, email, password, confirmPassword, timeZone } = req.body;
        if (!email) {
            return next(new error_1.default("Email is required", 400));
        }
        if (!password) {
            return next(new error_1.default("Password is required", 400));
        }
        if (password !== confirmPassword) {
            return next(new error_1.default("Passwords do not match", 400));
        }
        const isExisting = await db_1.db.user.findFirst({
            where: { email },
        });
        if (isExisting) {
            return next(new error_1.default("User already exists with this email", 409));
        }
        const firstBelt = await db_1.db.belt.findFirst({
            orderBy: {
                createdAt: "asc",
            },
        });
        // hash the password
        const hashed = await (0, hashPassword_1.hashedPassword)(password);
        const user = await db_1.db.user.create({
            data: {
                email: email,
                password: hashed, // In a real application, ensure to hash the password before saving
                name: name,
                role: client_1.Role.USER,
                currentBeltId: firstBelt ? firstBelt.id : null,
                timezone: timeZone,
            },
        });
        const token = (0, jwt_1.createToken)({ userId: user.id, role: user.role });
        return res.status(201).json({
            token,
            msg: "Register Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[REGISTER_USER_WITH_EMAIL_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password, fcmToken, timeZone } = req.body;
        if (!email) {
            return next(new error_1.default("Email is required", 400));
        }
        if (!password) {
            return next(new error_1.default("Password is required", 400));
        }
        const isExisting = await db_1.db.user.findFirst({
            where: { email },
        });
        if (!isExisting) {
            return next(new error_1.default("User not found with this email", 404));
        }
        // check password or hash password is same
        const isPasswordMatch = await (0, hashPassword_1.comparePassword)(password, isExisting.password);
        if (!isPasswordMatch) {
            return next(new error_1.default("Invalid credentials", 401));
        }
        await db_1.db.user.update({
            where: { id: isExisting.id },
            data: { fcmToken: fcmToken, timezone: timeZone },
        });
        const token = (0, jwt_1.createToken)({ userId: isExisting.id, role: isExisting.role });
        delete isExisting.password;
        return res.status(200).json({
            token,
            user: isExisting,
            msg: "Login Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[LOGIN_USER_WITH_EMAIL_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.login = login;
const loginWithApple = async (req, res, next) => {
    try {
        const { identityToken, timezone, fcmToken, name } = req.body;
        if (!identityToken) {
            return next(new error_1.default("Apple id is required", 400));
        }
        const payload = await (0, auth_1.verifyAppleToken)(identityToken);
        const appleId = payload.sub;
        const email = payload.email || null;
        if (!appleId) {
            return next(new error_1.default("Apple id is required", 400));
        }
        let user = await db_1.db.user.findUnique({
            where: { providerId: appleId },
        });
        if (!user) {
            const firstBelt = await db_1.db.belt.findFirst({
                orderBy: {
                    createdAt: "asc",
                },
            });
            user = await db_1.db.user.create({
                data: {
                    providerId: appleId,
                    email: email,
                    name,
                    fcmToken,
                    timezone,
                    provider: client_1.Provider.APPLE,
                    currentBeltId: firstBelt ? firstBelt.id : null,
                },
            });
        }
        else {
            user = await db_1.db.user.update({
                where: { providerId: appleId },
                data: {
                    timezone,
                    fcmToken,
                },
            });
        }
        const token = (0, jwt_1.createToken)({
            role: user.role,
            userId: user.id,
        });
        return res.status(200).json({
            token,
            msg: "Login Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[LOGIN_USER_WITH_APPLE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.loginWithApple = loginWithApple;
const loginWithGoogle = async (req, res, next) => {
    try {
        const { identityToken, timezone, fcmToken } = req.body;
        if (!identityToken) {
            return next(new error_1.default("Google id is required", 400));
        }
        const payload = await (0, auth_1.verifyGoogleToken)(identityToken);
        const googleId = payload.sub;
        const email = payload.email || null;
        const name = payload.name || null;
        if (!googleId) {
            return next(new error_1.default("Google id is required", 400));
        }
        let user = await db_1.db.user.findUnique({
            where: { providerId: googleId },
        });
        if (!user) {
            const firstBelt = await db_1.db.belt.findFirst({
                orderBy: {
                    createdAt: "asc",
                },
            });
            user = await db_1.db.user.create({
                data: {
                    providerId: googleId,
                    email: email,
                    name,
                    fcmToken,
                    timezone,
                    provider: client_1.Provider.GOOGLE,
                    currentBeltId: firstBelt ? firstBelt.id : null,
                },
            });
        }
        else {
            user = await db_1.db.user.update({
                where: { providerId: googleId },
                data: {
                    timezone,
                    fcmToken,
                },
            });
        }
        const token = (0, jwt_1.createToken)({
            role: user.role,
            userId: user.id,
        });
        return res.status(200).json({
            token,
            msg: "Login Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[LOGIN_USER_WITH_GOOGLE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.loginWithGoogle = loginWithGoogle;
