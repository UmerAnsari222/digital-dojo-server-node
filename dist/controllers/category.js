"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getAllCategories = exports.createCategory = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const createCategory = async (req, res, next) => {
    const { title, key } = req.body;
    if (!title) {
        return next(new error_1.default("Title is required", 400));
    }
    if (!key) {
        return next(new error_1.default("Image is required", 400));
    }
    try {
        const category = await db_1.db.category.create({
            data: {
                title: title,
                imageUrl: key,
            },
        });
        return res.status(201).json({
            category,
            msg: "Category created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_ALL_CATEGORY_ERROR]", e);
        if (key) {
            await (0, aws_1.deleteFromAwsStorage)({ Bucket: dotEnv_1.AWS_BUCKET_NAME, Key: key });
        }
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createCategory = createCategory;
const getAllCategories = async (req, res, next) => {
    try {
        const categories = await db_1.db.category.findMany();
        await Promise.all(categories.map(async (category) => {
            if (category.imageUrl != null) {
                category.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: category.imageUrl,
                });
            }
        }));
        return res.status(200).json({
            categories,
            msg: "Fetched Categories Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CREATE_CATEGORY_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllCategories = getAllCategories;
const updateCategory = async (req, res, next) => {
    const { categoryId } = req.params;
    const { title, key } = req.body;
    if (!title) {
        return next(new error_1.default("Title is required", 400));
    }
    if (!key) {
        return next(new error_1.default("Image is required", 400));
    }
    try {
        const isExisting = await db_1.db.category.findUnique({
            where: { id: categoryId },
        });
        if (!isExisting) {
            return next(new error_1.default("Category not found", 404));
        }
        if (isExisting.imageUrl && isExisting.imageUrl !== key) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: isExisting.imageUrl,
            });
        }
        const category = await db_1.db.category.update({
            where: { id: categoryId },
            data: {
                title: title,
                imageUrl: key,
            },
        });
        return res.status(200).json({
            category,
            msg: "Update category Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[UPDATE_CATEGORY_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res, next) => {
    const { categoryId } = req.params;
    try {
        const isExisting = await db_1.db.category.findUnique({
            where: { id: categoryId },
        });
        if (!isExisting) {
            return next(new error_1.default("Category not found", 404));
        }
        const category = await db_1.db.category.delete({
            where: { id: categoryId },
        });
        if (category.imageUrl) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: category.imageUrl,
            });
        }
        return res.status(200).json({
            category,
            msg: "Delete category Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[DELETE_CATEGORY_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteCategory = deleteCategory;
