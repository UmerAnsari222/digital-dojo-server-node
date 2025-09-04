"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.verifyOtp = exports.sendOtp = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const otp_1 = require("../utils/otp");
const otpSender_1 = require("../utils/otpSender");
const hashPassword_1 = require("../utils/hashPassword");
const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        const self = await db_1.db.user.findFirst({
            where: {
                email,
            },
        });
        if (!self) {
            return next(new error_1.default("User not found", 404));
        }
        //generate OTP
        const otp = (0, otp_1.generateOtp)();
        // HASH
        const ttl = 1000 * 60 * 5;
        const expires = Date.now() + ttl;
        const data = `${otp}.${expires}`;
        const hash = (0, otp_1.hashOtp)(data);
        await (0, otpSender_1.sendByEmail)({
            email: self.email,
            otp: otp,
        });
        return res.status(200).json({
            hash: `${hash}.${expires}`,
            msg: "Check your email for OTP",
            success: true,
        });
    }
    catch (e) {
        console.log("[SEND_OTP_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.sendOtp = sendOtp;
const verifyOtp = async (req, res, next) => {
    try {
        const { hash, otp, email } = req.body;
        if (!otp || !hash) {
            return next(new error_1.default("OTP are required", 500));
        }
        // check otp is expired
        const [hashedOtp, expires] = hash.split(".");
        if (Date.now() > +expires) {
            return next(new error_1.default("OTP has expired", 400));
        }
        // check otp is valid
        const data = `${otp}.${expires}`;
        const isValid = await (0, otp_1.verifyOtpService)({
            hashedOtp,
            data,
        });
        if (!isValid) {
            return next(new error_1.default("Invalid OTP", 400));
        }
        const user = await db_1.db.user.findFirst({
            where: {
                email,
            },
        });
        if (!user) {
            return next(new error_1.default("User not found", 404));
        }
        return res.status(200).json({ isOtpValid: isValid, message: "success" });
    }
    catch (e) {
        console.log("[VERIFY_OTP_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.verifyOtp = verifyOtp;
// controller for change the password
const changePassword = async (req, res, next) => {
    try {
        // get data from request
        const { otp, hash, email, password, confirmPassword } = req.body;
        // check otp and hash provided
        if (!otp || !hash) {
            return next(new error_1.default("OTP are required", 500));
        }
        // check otp is expired
        const [hashedOtp, expires] = hash.split(".");
        if (Date.now() > +expires) {
            return next(new error_1.default("OTP has expired", 400));
        }
        // check otp is valid
        const data = `${otp}.${expires}`;
        const isValid = await (0, otp_1.verifyOtpService)({
            hashedOtp,
            data,
        });
        if (!isValid) {
            return next(new error_1.default("Invalid OTP", 400));
        }
        // check password is same
        if (password !== confirmPassword) {
            return next(new error_1.default("Passwords do not match", 400));
        }
        // hash the password
        const hashed = await (0, hashPassword_1.hashedPassword)(password);
        // change the password
        const user = await db_1.db.user.update({
            where: {
                email,
            },
            data: {
                password: hashed,
            },
        });
        return res
            .status(200)
            .json({ success: true, msg: "password change success" });
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ errors: [{ msg: "Internal server error" }], message: "failed" });
    }
};
exports.changePassword = changePassword;
