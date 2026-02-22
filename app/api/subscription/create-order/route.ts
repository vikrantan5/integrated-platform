import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { planType, userId } = await req.json();

    if (!planType || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (planType !== "monthly" && planType !== "yearly") {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    const plan = SUBSCRIPTION_PLANS[planType];
    const amount = plan.price * 100; // Razorpay expects amount in paise

    const options = {
      amount,
      currency: plan.currency,
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId,
        planType,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
