// app/api/subscription/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-constants";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { planId, userId } = await req.json(); // Changed from planType to planId
    
    console.log("Received planId:", planId);

    if (!planId || !userId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Find the plan by ID
    const planKey = planId.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS;
    const plan = SUBSCRIPTION_PLANS[planKey];

    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Create short receipt
    const shortUserId = userId.substring(0, 8);
    const timestamp = Date.now().toString().slice(-6);
    const receipt = `rcpt_${shortUserId}_${timestamp}`;

    const options = {
      amount: plan.price,
      currency: plan.currency,
      receipt: receipt,
      notes: {
        userId: userId,
        planId: plan.id,
      },
    };

    console.log("Creating order with options:", options);

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
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