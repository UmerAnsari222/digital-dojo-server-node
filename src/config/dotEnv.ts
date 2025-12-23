import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 4400;
export const JWT_SECRET = process.env.JWT_SECRET;
export const EMAIL_PORT = process.env.EMAIL_PORT || 465;
export const EMAIL_FROM = process.env.EMAIL_FROM!;
export const EMAIL_FROM_PASSWORD = process.env.EMAIL_FROM_PASSWORD!;
export const EMAIL_HOST = process.env.EMAIL_HOST!;
export const HASH_SECRET = process.env.HASH_SECRET!;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
export const AWS_ACCESS_SECRET_KEY = process.env.AWS_ACCESS_SECRET_KEY!;
export const AWS_REGION = process.env.AWS_REGION!;
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME!;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
export const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID!;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
export const DATABASE_URL = process.env.DATABASE_URL!;
export const REDIS_HOST = process.env.REDIS_HOST!;
export const REDIS_PORT = process.env.REDIS_PORT!;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID!;
export const APPLE_SERVICE_ID = process.env.APPLE_SERVICE_ID!;
