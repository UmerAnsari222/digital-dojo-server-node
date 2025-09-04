"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authAdminMiddleware = exports.authMiddleware = exports.authAdmin = exports.auth = void 0;
const error_1 = __importDefault(require("../utils/error"));
const jwt_1 = require("../utils/jwt");
const db_1 = require("../config/db");
const client_1 = require("@prisma/client");
const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const { userId } = (0, jwt_1.verifyToken)(token);
    const user = await db_1.db.user.findFirst({
        where: {
            id: userId,
        },
    });
    if (!user) {
        return next(new error_1.default("Unauthorized", 401));
    }
    req.userId = userId;
    next();
};
exports.auth = auth;
const authAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const { userId } = (0, jwt_1.verifyToken)(token);
        const user = await db_1.db.user.findFirst({
            where: {
                id: userId,
            },
        });
        if (!user) {
            return next(new error_1.default("Unauthorized", 401));
        }
        if (user.role !== client_1.Role.ADMIN) {
            return next(new error_1.default("Unauthorized", 403));
        }
        req.userId = userId;
        next();
    }
    catch (error) {
        console.log("[ERROR_AUTH_ADMIN]", error);
        return next(new error_1.default("Unauthorized", 401));
    }
};
exports.authAdmin = authAdmin;
// export const globalAuth = TryCatch(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }
//     const token = authHeader.split(" ")[1];
//     if (!token) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }
//     const { userId } = verifyToken(token) as { userId: string };
//     const user = await db.user.findFirst({
//       where: {
//         id: userId,
//       },
//     });
//     if (!user) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }
//     if (
//       !user.roles.includes("ADMIN") &&
//       !user.roles.includes("FUNDRAISER") &&
//       !user.roles.includes("USER")
//     ) {
//       return next(new ErrorHandler("Unauthorized", 403));
//     }
//     req.userId = userId;
//     next();
//   }
// );
const authMiddleware = async (req, res, next) => {
    await (0, exports.auth)(req, res, next);
};
exports.authMiddleware = authMiddleware;
// export const authFundraiserMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   await authFundraiser(req, res, next);
// };
const authAdminMiddleware = async (req, res, next) => {
    await (0, exports.authAdmin)(req, res, next);
};
exports.authAdminMiddleware = authAdminMiddleware;
// export const globalAuthMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   await globalAuth(req, res, next);
// };
