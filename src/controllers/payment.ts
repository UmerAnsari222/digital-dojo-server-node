import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { stripe } from "../utils/stripe";
import { STRIPE_MONTHLY_PRICE_ID } from "../config/dotEnv";

export const makeCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { email } = req.body;

  try {
    const self = await db.user.findFirst({
      where: {
        id: userId,
        email,
      },
    });

    if (!self) {
      return next(new ErrorHandler("User not found", 404));
    }

    let customerId = self.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: self.email,
        metadata: { userId },
      });

      customerId = customer.id;

      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      return res.status(201).json({
        isSubscribed: true,
        msg: "User is already subscribed",
        success: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: STRIPE_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      //   success_url: `${process.env.CLIENT_URL}/success`,
      //   cancel_url: `${process.env.CLIENT_URL}/cancel`,
      success_url: "intestinofelizapp://success",
      cancel_url: "intestinofelizapp://cancel",
      payment_method_types: ["card"],
      metadata: { userId },
      origin_context: "mobile_app",
    });

    return res.status(201).json({
      url: session.url,
      msg: "Check session created successfully",
      success: true,
    });
  } catch (e) {
    console.log("[MAKE_CHECKOUT_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
