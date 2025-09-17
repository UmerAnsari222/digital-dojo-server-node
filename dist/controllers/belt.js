"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBelt = exports.getAllBelts = exports.createBelt = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const createBelt = async (req, res, next) => {
    const { name, duration, key } = req.body;
    if (!name) {
        return next(new error_1.default("Name is required", 400));
    }
    if (!duration) {
        return next(new error_1.default("Duration is required", 400));
    }
    try {
        const belt = await db_1.db.belt.create({
            data: {
                name,
                duration,
                imageUrl: key,
            },
        });
        return res.status(201).json({
            belt,
            msg: "Create Belt Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[BELT_CREATE_ERROR]", e);
        if (key) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: key,
            });
        }
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createBelt = createBelt;
const getAllBelts = async (req, res, next) => {
    try {
        const belts = await db_1.db.belt.findMany();
        return res.status(200).json({
            belts,
            msg: "Fetched all belts successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[BELT_GET_ALL_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllBelts = getAllBelts;
const updateBelt = async (req, res, next) => {
    const { name, duration, key } = req.body;
    const { beltId } = req.params;
    if (!name) {
        return next(new error_1.default("Name is required", 400));
    }
    if (!duration) {
        return next(new error_1.default("Duration is required", 400));
    }
    try {
        const isExisting = await db_1.db.belt.findUnique({ where: { id: beltId } });
        if (!isExisting) {
            return next(new error_1.default("Belt not found", 404));
        }
        if (isExisting.imageUrl && isExisting.imageUrl !== key) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: isExisting.imageUrl,
            });
        }
        const belt = await db_1.db.belt.update({
            where: { id: beltId },
            data: {
                name,
                duration,
                imageUrl: key,
            },
        });
        return res.status(200).json({
            belt,
            msg: "Update Belt Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[BELT_UPDATE_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateBelt = updateBelt;
