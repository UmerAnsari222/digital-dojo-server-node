import { PrismaClient } from "@prisma/client";
import { userPrefExtension } from "../utils/extention";

export const db = new PrismaClient();

// .$extends(userPrefExtension);
