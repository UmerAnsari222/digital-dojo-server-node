"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePresignedUrl = void 0;
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const generatePresignedUrl = async (req, res, next) => {
    try {
        const { fileType, filename, key } = req.body;
        // const key = `course/uploads/content/${Date.now()}-${filename}`;
        const presignedUrl = await (0, aws_1.getPresignedUrl)({
            fileType: fileType,
            key: key,
            bucket: dotEnv_1.AWS_BUCKET_NAME,
        });
        return res.status(200).json({
            success: true,
            presignedUrl,
            msg: "URL generated successfully",
        });
    }
    catch (error) {
        console.error("[GET_PRESIGNED_URL_ERROR]", error);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.generatePresignedUrl = generatePresignedUrl;
