"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { Subscription, InterviewUsage, CreateSubscriptionParams } from "@/types";
import { generateId } from "@/lib/utils";

/* ============================================================
   SUBSCRIPTION ACTIONS
============================================================ */

// Get active subscription for a user
export async function getActiveSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return mapRowToSubscription(data);
  } catch (error) {
    return null;
  }
}

// Get all subscriptions for a user
export async function getUserSubscriptions(
  userId: string
): Promise<Subscription[]> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map(mapRowToSubscription);
}

// Create new subscription after successful payment
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  try {
    const {
      userId,
      planType,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount,
    } = params;

    const subscriptionId = generateId();
    const startDate = new Date();
    const endDate = new Date(startDate);

    // Calculate end date based on plan type
    if (planType === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (planType === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription: Subscription = {
      id: subscriptionId,
      userId,
      planType,
      status: "active",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      id: subscriptionId,
      user_id: userId,
      plan_type: planType,
      status: "active",
      start_date: subscription.startDate,
      end_date: subscription.endDate,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      amount,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, subscription };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Check if user has access to interviews (subscription or free trial)
export async function checkInterviewAccess(
  userId: string
): Promise<{
  hasAccess: boolean;
  reason: "subscription" | "free-trial" | "no-access";
  subscription?: Subscription;
  usage?: InterviewUsage;
}> {
  try {
    // Check for active subscription
    const subscription = await getActiveSubscription(userId);
    if (subscription) {
      return {
        hasAccess: true,
        reason: "subscription",
        subscription,
      };
    }

    // Check free trial usage
    const usage = await getInterviewUsage(userId);
    if (!usage || !usage.freeTrialUsed) {
      return {
        hasAccess: true,
        reason: "free-trial",
        usage: usage || undefined,
      };
    }

    return {
      hasAccess: false,
      reason: "no-access",
      usage,
    };
  } catch (error) {
    return {
      hasAccess: false,
      reason: "no-access",
    };
  }
}

/* ============================================================
   INTERVIEW USAGE ACTIONS
============================================================ */

// Get interview usage for a user
export async function getInterviewUsage(
  userId: string
): Promise<InterviewUsage | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("interview_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return mapRowToInterviewUsage(data);
  } catch (error) {
    return null;
  }
}

// Create or update interview usage
export async function recordInterviewUsage(
  userId: string
): Promise<{ success: boolean; usage?: InterviewUsage; error?: string }> {
  try {
    // Check if usage record exists
    const existingUsage = await getInterviewUsage(userId);

    if (existingUsage) {
      // Update existing record
      const updatedCount = existingUsage.interviewCount + 1;
      const freeTrialUsed = updatedCount >= 1;

      const { error } = await supabaseAdmin
        .from("interview_usage")
        .update({
          interview_count: updatedCount,
          free_trial_used: freeTrialUsed,
          last_interview_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedUsage: InterviewUsage = {
        ...existingUsage,
        interviewCount: updatedCount,
        freeTrialUsed,
        lastInterviewDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { success: true, usage: updatedUsage };
    } else {
      // Create new record
      const usageId = generateId();
      const newUsage: InterviewUsage = {
        id: usageId,
        userId,
        interviewCount: 1,
        freeTrialUsed: true,
        lastInterviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin.from("interview_usage").insert({
        id: usageId,
        user_id: userId,
        interview_count: 1,
        free_trial_used: true,
        last_interview_date: newUsage.lastInterviewDate,
        created_at: newUsage.createdAt,
        updated_at: newUsage.updatedAt,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, usage: newUsage };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update subscription status (for expiration handling)
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: "active" | "expired" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ============================================================
   MAPPERS
============================================================ */

function mapRowToSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    planType: row.plan_type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    paymentId: row.payment_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpaySignature: row.razorpay_signature,
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToInterviewUsage(row: any): InterviewUsage {
  return {
    id: row.id,
    userId: row.user_id,
    interviewCount: row.interview_count,
    freeTrialUsed: row.free_trial_used,
    lastInterviewDate: row.last_interview_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
