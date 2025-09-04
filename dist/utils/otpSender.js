"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendByEmail = void 0;
const mailer_1 = require("../config/mailer");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendByEmail = async ({ email, otp, }) => {
    global.__dirname = process.cwd();
    const rootDir = path_1.default.resolve(__dirname, "..");
    console.log(rootDir);
    mailer_1.transport.sendMail({
        to: email,
        subject: "Verification Code",
        html: await ejs_1.default.renderFile(path_1.default.join(rootDir, "views/email.ejs"), {
            otp: otp,
            email,
        }),
    });
};
exports.sendByEmail = sendByEmail;
