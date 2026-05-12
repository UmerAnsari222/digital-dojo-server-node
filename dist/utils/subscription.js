"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasActiveSubscription = hasActiveSubscription;
const db_1 = require("../config/db");
async function hasActiveSubscription(userId) {
    const user = await db_1.db.user.findUnique({
        where: { id: userId },
        select: {
            subscription: { select: { status: true } },
            subscriptionRevenueCat: { select: { isActive: true } },
        },
    });
    if (!user)
        return false;
    const stripeActive = user.subscription?.status === "active";
    const revenueCatActive = user.subscriptionRevenueCat?.isActive === true;
    return stripeActive || revenueCatActive;
}
