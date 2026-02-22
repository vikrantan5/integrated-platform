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
      planId, // Changed from planType to planId
      amount,
    } = await req.json();

    console.log("Verification request:", {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId,
      planId,
      amount,
    });

    // Validate required fields
    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !userId ||
      !planId || // Changed from planType to planId
      !amount
    ) {
      return NextResponse.json(
        { 
          error: "Missing required parameters",
          received: { razorpayOrderId, razorpayPaymentId, razorpaySignature, userId, planId, amount }
        },
        { status: 400 }
      );
    }

    // Verify payment signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    console.log("Signature verification:", {
      expected: expectedSignature,
      received: razorpaySignature,
      match: expectedSignature === razorpaySignature
    });

    const isAuthentic = expectedSignature === razorpaySignature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Convert planId to planType for the database (if needed)
    const planType = planId === "basic" ? "monthly" : 
                     planId === "professional" ? "yearly" : 
                     planId;

    // Create subscription in database
    const result = await createSubscription({
      userId,
      planType, // Send planType to database
      planId, // Also store the original planId
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount: amount, // Amount already in paise, no need to divide
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