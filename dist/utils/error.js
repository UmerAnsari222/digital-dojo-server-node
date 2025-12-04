"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorHandler extends Error {
    constructor(message, statusCode, stack) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.stack = stack;
        this.statusCode = statusCode;
        if (stack) {
            this.stack = stack;
        }
    }
}
exports.default = ErrorHandler;
