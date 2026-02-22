"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getActiveSubscription } from "@/lib/actions/subscription.action";
import { Subscription } from "@/types";
// Fix: Import from subscription-constants instead of constants
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-constants";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, Zap } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Define plan mapping for UI display
const PLAN_DISPLAY = {
  monthly: {
    id: "basic", // Map monthly to basic plan
    name: "Monthly Plan",
    price: 500,
    priceDisplay: "₹500",
    period: "month",
    features: [
      "Unlimited AI Mock Interviews",
      "Real-time Video Interview with AI",
      "Detailed Performance Analytics",
      "AI-Generated Feedback Reports",
      "Practice Question Bank",
      "Resume ATS Analysis"
    ]
  },
  yearly: {
    id: "professional", // Map yearly to professional plan
    name: "Yearly Plan",
    price: 8000,
    priceDisplay: "₹8,000",
    period: "year",
    features: [
      "Everything in Monthly Plan",
      "Priority Support",
      "Advanced Analytics Dashboard",
      "Interview History Archive",
      "Custom Interview Templates",
      "Early Access to New Features"
    ]
  }
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setUserId(user.uid);
        await loadSubscription(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadSubscription = async (uid: string) => {
    try {
      const activeSub = await getActiveSubscription(uid);
      setSubscription(activeSub);
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planType: "monthly" | "yearly") => {
    if (!userId) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setSelectedPlan(planType);
    setProcessingPayment(true);

    try {
      // Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Failed to load payment gateway");
        setProcessingPayment(false);
        return;
      }

      // Map UI plan to actual plan ID
      const planId = planType === "monthly" ? "basic" : "professional";

      // Create order with planId instead of planType
      const orderResponse = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId, // Send planId instead of planType
          userId 
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        toast.error(orderData.error || "Failed to create order");
        setProcessingPayment(false);
        return;
      }

      const plan = PLAN_DISPLAY[planType];

      // Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "HireAI",
        description: `${plan.name} Subscription`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Verify payment
          try {
            const verifyResponse = await fetch("/api/subscription/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                userId,
                planId, // Send planId instead of planType
                amount: orderData.amount,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success("Subscription activated successfully!");
              await loadSubscription(userId);
              setProcessingPayment(false);
              setSelectedPlan(null);
            } else {
              toast.error(verifyData.error || "Payment verification failed");
              setProcessingPayment(false);
              setSelectedPlan(null);
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Failed to verify payment");
            setProcessingPayment(false);
            setSelectedPlan(null);
          }
        },
        prefill: {
          email: auth.currentUser?.email || "",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setSelectedPlan(null);
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment");
      setProcessingPayment(false);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Mock Interview Subscription
          </h1>
          <p className="text-lg text-gray-600">
            Choose a plan to unlock unlimited AI-powered mock interviews
          </p>
        </div>

        {/* Active Subscription Status */}
        {subscription && (
          <Card className="mb-8 border-2 border-green-500 bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Active Subscription
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    You have an active subscription
                  </CardDescription>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Plan Type</p>
                  <p className="font-semibold capitalize">
                    {subscription.planId === "basic" ? "Monthly" : 
                     subscription.planId === "professional" ? "Yearly" : 
                     subscription.planId}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Start Date</p>
                  <p className="font-semibold">{formatDate(subscription.startDate)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Renewal Date</p>
                  <p className="font-semibold">{formatDate(subscription.endDate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free Trial Notice */}
        {!subscription && (
          <Card className="mb-8 border-2 border-blue-500 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    🎉 Get 1 Free AI Mock Interview!
                  </h3>
                  <p className="text-sm text-blue-700">
                    Try our AI interview system for free. After your first interview, choose a subscription plan to continue.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Monthly Plan */}
          <Card className="relative hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Monthly Plan</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{PLAN_DISPLAY.monthly.priceDisplay}</span>
                <span className="text-gray-600 ml-2">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {PLAN_DISPLAY.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe("monthly")}
                disabled={processingPayment || (subscription?.planId === "basic")}
                className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
                data-testid="subscribe-monthly-button"
              >
                {processingPayment && selectedPlan === "monthly" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.planId === "basic" ? (
                  "Current Plan"
                ) : (
                  "Subscribe Monthly"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative hover:shadow-xl transition-shadow border-2 border-purple-500">
            <Badge className="absolute top-4 right-4 bg-purple-600">Save 33%</Badge>
            <CardHeader>
              <CardTitle className="text-2xl">Yearly Plan</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{PLAN_DISPLAY.yearly.priceDisplay}</span>
                <span className="text-gray-600 ml-2">/ year</span>
              </div>
              <p className="text-sm text-purple-600 font-semibold">
                Save ₹2,000 compared to monthly
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {PLAN_DISPLAY.yearly.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe("yearly")}
                disabled={processingPayment || (subscription?.planId === "professional")}
                className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                data-testid="subscribe-yearly-button"
              >
                {processingPayment && selectedPlan === "yearly" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.planId === "professional" ? (
                  "Current Plan"
                ) : (
                  "Subscribe Yearly"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does the free trial work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Every user gets 1 free AI mock interview to try our service. After that, you'll need an active subscription to continue.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, your subscription remains active until the end of the billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}