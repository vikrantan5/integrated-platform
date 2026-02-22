"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getActiveSubscription, getUserSubscriptions } from "@/lib/actions/subscription.action";
import { Subscription } from "@/types";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Loader2, CreditCard, Calendar, Rocket } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setUserId(user.uid);
        setUserName(user.displayName || "User");
        setUserEmail(user.email || "");
        await loadSubscriptionData(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadSubscriptionData = async (uid: string) => {
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        getActiveSubscription(uid),
        getUserSubscriptions(uid),
      ]);
      setActiveSubscription(active);
      setSubscriptionHistory(history);
    } catch (error) {
      console.error("Error loading subscription data:", error);
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

  const handleSubscribe = async (planId: string) => {
    if (!userId || !userName || !userEmail) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setProcessingPayment(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway");
        setProcessingPayment(false);
        return;
      }

      // Create order - send planId instead of planType
      const orderResponse = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId }), // Changed from planType to planId
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        toast.error(orderData.error || "Failed to create order");
        setProcessingPayment(false);
        return;
      }

      // Get plan details
      const planDetails = plans.find(p => p.id === planId);
      
      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: "INR",
        name: "HireAI - AI Mock Interviews",
        description: `${planDetails?.name} Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: "#3B82F6",
        },
        handler: async function (response: any) {
          // Payment successful - verify on backend
          try {
            const verifyResponse = await fetch("/api/subscription/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                planId, // Send planId instead of planType
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount: orderData.amount,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success("🎉 Subscription activated successfully!");
              await loadSubscriptionData(userId);
              setProcessingPayment(false);
            } else {
              toast.error("Payment verification failed");
              setProcessingPayment(false);
            }
          } catch (error) {
            console.error("Verification error:", error);
            toast.error("Failed to verify payment");
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment");
      setProcessingPayment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Define all three plans
  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: 500,
      period: "month",
      priceDisplay: "₹500/month",
      icon: Zap,
      color: "blue",
      gradient: "from-blue-50 to-purple-50",
      buttonGradient: "from-blue-600 to-purple-600",
      hoverGradient: "from-blue-700 to-purple-700",
      features: [
        "Unlimited AI Mock Interviews",
        "Real-time Video Interview with AI",
        "Detailed Performance Analytics",
        "AI-Generated Feedback Reports",
        "Practice Question Bank",
        "Resume ATS Analysis"
      ]
    },
    {
      id: "professional",
      name: "Professional Plan",
      price: 1500,
      period: "month",
      priceDisplay: "₹1,500/month",
      icon: Sparkles,
      color: "purple",
      gradient: "from-purple-50 to-pink-50",
      buttonGradient: "from-purple-600 to-pink-600",
      hoverGradient: "from-purple-700 to-pink-700",
      isPopular: true,
      features: [
        "Everything in Basic Plan",
        "Priority Support",
        "Advanced Analytics Dashboard",
        "Interview History Archive",
        "Custom Interview Templates",
        "Early Access to New Features"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: 3000,
      period: "month",
      priceDisplay: "₹3,000/month",
      icon: Crown,
      color: "yellow",
      gradient: "from-yellow-50 to-orange-50",
      buttonGradient: "from-yellow-500 to-orange-600",
      hoverGradient: "from-yellow-600 to-orange-700",
      features: [
        "Everything in Professional Plan",
        "Team Management (up to 10 members)",
        "API Access",
        "Dedicated Account Manager",
        "Custom Integrations",
        "SLA Guarantee"
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Rocket className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900" data-testid="page-title">
              Choose Your AI Interview Plan
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your interview preparation needs. All plans include unlimited AI-powered mock interviews.
          </p>
        </div>

        {/* Active Subscription Card */}
        {activeSubscription && (
          <Card className="mb-8 border-2 border-green-500 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    Active Subscription
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Your subscription is currently active
                  </CardDescription>
                </div>
                <Badge className="bg-green-600 text-white">
                  {activeSubscription.planId === "basic" ? "Basic" : 
                   activeSubscription.planId === "professional" ? "Professional" : "Enterprise"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Plan Type</p>
                  <p className="text-lg font-semibold capitalize">
                    {activeSubscription.planId === "basic" ? "Basic" : 
                     activeSubscription.planId === "professional" ? "Professional" : "Enterprise"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                  <p className="text-lg font-semibold">
                    {formatDate(activeSubscription.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Days Remaining</p>
                  <p className="text-lg font-semibold text-green-600">
                    {getDaysRemaining(activeSubscription.endDate)} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards - Now showing 3 plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isActive = activeSubscription?.planId === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden hover:shadow-2xl transition-shadow border-2 ${
                  plan.isPopular ? "border-purple-500" : "hover:border-blue-500"
                }`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-br ${plan.gradient} pb-8`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-6 w-6 text-${plan.color}-600`} />
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <div className="mt-4">
                    <span className="text-5xl font-bold text-gray-900">{plan.priceDisplay}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-8 space-y-6">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processingPayment || isActive}
                    className={`w-full py-6 text-lg bg-gradient-to-r ${plan.buttonGradient} hover:${plan.hoverGradient}`}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : isActive ? (
                      "Current Plan"
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Subscribe {plan.name}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Subscription History */}
        {subscriptionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Subscription History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionHistory.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">
                        {sub.planId === "basic" ? "Basic" : 
                         sub.planId === "professional" ? "Professional" : "Enterprise"} Plan
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                      </p>
                    </div>
                    <Badge
                      variant={sub.status === "active" ? "default" : "secondary"}
                      className={
                        sub.status === "active"
                          ? "bg-green-600"
                          : sub.status === "expired"
                          ? "bg-gray-400"
                          : "bg-red-500"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button
            variant="link"
            onClick={() => router.push("/jobseeker/dashboard")}
            data-testid="back-to-dashboard"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}