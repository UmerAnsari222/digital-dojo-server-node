"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotEnv_1 = require("./config/dotEnv");
const error_1 = __importDefault(require("./middlewares/error"));
const auth_1 = require("./routes/auth");
const forgot_password_1 = require("./routes/forgot-password");
const category_1 = require("./routes/category");
const presigned_1 = require("./routes/presigned");
const profile_1 = require("./routes/profile");
const habit_1 = require("./routes/habit");
const completion_1 = require("./routes/completion");
const challenge_1 = require("./routes/challenge");
const belt_1 = require("./routes/belt");
const streak_1 = require("./routes/streak");
const cirlce_1 = require("./routes/cirlce");
const logger_1 = __importDefault(require("./config/logger"));
const app = (0, express_1.default)();
// Use Morgan middleware
app.use((0, morgan_1.default)("combined", {
    stream: {
        write: (message) => logger_1.default.http(message.trim()),
    },
})); // 'dev' is a pre-defined format string
app.use((0, cors_1.default)({ origin: "*" }));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// set view engine for html and ejs files
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
console.log(new Date("2025-09-18T23:59:59.000Z"));
app.get("/", (req, res) => {
    return res
        .status(200)
        .json({ msg: "Welcome to DigitalDojo API", success: true });
});
app.use("/api/v1/auth", auth_1.authRouter);
app.use("/api/v1/rest-password", forgot_password_1.forgotPasswordRouter);
app.use("/api/v1/habit", habit_1.habitRouter);
app.use("/api/v1/challenge", challenge_1.challengeRouter);
app.use("/api/v1/completion", completion_1.completionRouter);
app.use("/api/v1/belt", belt_1.beltRouter);
app.use("/api/v1/streak", streak_1.streakRouter);
app.use("/api/v1/circle", cirlce_1.circleRouter);
app.use("/api/v1/category", category_1.categoryRouter);
app.use("/api/v1/profile", profile_1.profileRouter);
app.use("/api/v1/presigned", presigned_1.urlRouter);
// Error handling middleware
app.use(error_1.default);
app.listen(dotEnv_1.PORT, () => {
    console.log(`Server is running on port http://localhost:${dotEnv_1.PORT}`);
});
