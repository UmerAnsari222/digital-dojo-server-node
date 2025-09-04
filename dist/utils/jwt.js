"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.createToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotEnv_1 = require("../config/dotEnv");
// function for generate jwt token
const createToken = (user) => {
    return jsonwebtoken_1.default.sign(user, dotEnv_1.JWT_SECRET, { expiresIn: "7d" });
};
exports.createToken = createToken;
// function for verify jwt token
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, dotEnv_1.JWT_SECRET);
};
exports.verifyToken = verifyToken;
