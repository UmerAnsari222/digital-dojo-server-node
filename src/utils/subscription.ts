import { db } from "../config/db";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      subscription: { select: { status: true } },
      subscriptionRevenueCat: { select: { isActive: true } },
    },
  });

  if (!user) return false;

  const stripeActive = user.subscription?.status === "active";
  const revenueCatActive = user.subscriptionRevenueCat?.isActive === true;

  return stripeActive || revenueCatActive;
}
