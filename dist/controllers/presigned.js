"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCFPresignedUrl = exports.generatePresignedUrl = void 0;
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const cloudflare_1 = require("../services/cloudflare");
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
const generateCFPresignedUrl = async (req, res, next) => {
    try {
        const cfData = (await (0, cloudflare_1.getCFPresignedUrl)());
        console.log(cfData.errors);
        if (cfData.errors.length > 0) {
            return next(new error_1.default("Failed to generate signed url", 500, JSON.stringify(cfData.errors, null, 2)));
        }
        return res.status(200).json({
            success: true,
            presignedUrl: cfData.result.uploadURL,
            streamId: cfData.result.uid,
            msg: "URL generated successfully",
        });
    }
    catch (error) {
        console.error("[GET_CLOUD_FLARE_PRESIGNED_URL_ERROR]", error);
        next(new error_1.default("Something went wrong", 500, error));
    }
};
exports.generateCFPresignedUrl = generateCFPresignedUrl;
