"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCircle = exports.createCircle = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const createCircle = async (req, res, next) => {
    const { userId } = req;
    const { name, goal, colors } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const circle = await db_1.db.circle.create({
            data: {
                ownerId: userId,
                name,
                goal,
                colors,
            },
        });
        return res.status(201).json({
            circle,
            msg: "Circle Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_CIRCLE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createCircle = createCircle;
const getAllCircle = async (req, res, next) => {
    try {
        const circles = await db_1.db.circle.findMany();
        return res.status(200).json({
            circles,
            msg: "Fetched All Circle Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_ALL_CIRCLE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllCircle = getAllCircle;
