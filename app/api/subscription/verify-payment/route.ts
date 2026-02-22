import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSubscription } from "@/lib/actions/subscription.action";

export async function POST(req: NextRequest) {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId,
      planType,
      amount,
    } = await req.json();

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !userId ||
      !planType ||
      !amount
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify payment signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpaySignature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Create subscription in database
    const result = await createSubscription({
      userId,
      planType,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount: amount / 100, // Convert paise to rupees
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: "Payment verified and subscription activated!",
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
