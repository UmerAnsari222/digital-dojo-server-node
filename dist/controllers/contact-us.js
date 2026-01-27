"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.markRead = exports.getAllMessages = exports.createMessage = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const createMessage = async (req, res, next) => {
    const { userId } = req;
    const { message, name, email } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (!message) {
        return next(new error_1.default("Please Provide the message", 400));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const contact = await db_1.db.contact.create({
            data: {
                userId,
                content: message,
                name: name ? name : self.name,
                email: email ? email : self.email,
            },
        });
        return res.status(201).json({
            msg: "Message Send Successfully",
            success: true,
            contact,
        });
    }
    catch (e) {
        console.log("[CONTACT_US_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.createMessage = createMessage;
const getAllMessages = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const contacts = await db_1.db.contact.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({
            msg: "Contact Message Fetched Successfully",
            success: true,
            contacts,
        });
    }
    catch (e) {
        console.log("[GET_CONTACT_US_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllMessages = getAllMessages;
const markRead = async (req, res, next) => {
    const { userId } = req;
    const { messageId } = req.params;
    const { isRead } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const contact = await db_1.db.contact.findUnique({
            where: { id: messageId },
        });
        if (!contact) {
            return next(new error_1.default("Not Message Found", 404));
        }
        const read = await db_1.db.contact.update({
            where: { id: messageId },
            data: {
                isRead: isRead && true,
            },
        });
        return res.status(200).json({
            msg: "Message Read Successfully",
            success: true,
            contact: read,
        });
    }
    catch (e) {
        console.log("[CONTACT_US_MARK_AS_READ_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.markRead = markRead;
const deleteMessage = async (req, res, next) => {
    const { userId } = req;
    const { messageId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const contact = await db_1.db.contact.findUnique({
            where: { id: messageId },
        });
        if (!contact) {
            return next(new error_1.default("Not Message Found", 404));
        }
        const read = await db_1.db.contact.delete({
            where: { id: messageId },
        });
        return res.status(200).json({
            msg: "Message Deleted Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[CONTACT_US_DELETED_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteMessage = deleteMessage;
