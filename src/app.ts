import express, { Application } from "express";
import cors from "cors";
import { PORT } from "./config/dotEnv";
import errorMiddleware from "./middlewares/error";
import { authRouter } from "./routes/auth";
import { forgotPasswordRouter } from "./routes/forgot-password";
import { categoryRouter } from "./routes/category";
import { urlRouter } from "./routes/presigned";
import { profileRouter } from "./routes/profile";
import { habitRouter } from "./routes/habit";
import { completionRouter } from "./routes/completion";
import { challengeRouter } from "./routes/challenge";
import { beltRouter } from "./routes/belt";
import { streakRouter } from "./routes/streak";
import { circleRouter } from "./routes/cirlce";

const app: Application = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// set view engine for html and ejs files
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

console.log(new Date("2025-09-18T23:59:59.000Z"));

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ msg: "Welcome to DigitalDojo API", success: true });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/rest-password", forgotPasswordRouter);
app.use("/api/v1/habit", habitRouter);
app.use("/api/v1/challenge", challengeRouter);
app.use("/api/v1/completion", completionRouter);
app.use("/api/v1/belt", beltRouter);
app.use("/api/v1/streak", streakRouter);
app.use("/api/v1/circle", circleRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/presigned", urlRouter);

// Error handling middleware
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
