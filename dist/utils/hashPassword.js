"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashedPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
// function for hashing passwords
const hashedPassword = async (password) => {
    const salt = await bcrypt_1.default.genSalt(10);
    const hashed = await bcrypt_1.default.hash(password, salt);
    return hashed;
};
exports.hashedPassword = hashedPassword;
// function for computing passwords
const comparePassword = async (password, dbPassword) => {
    return await bcrypt_1.default.compare(password, dbPassword);
};
exports.comparePassword = comparePassword;
