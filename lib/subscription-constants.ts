// lib/subscription-constants.ts
export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: "basic",
    name: "Basic Plan",
    price: 50000, // ₹999 × 100 = 99900 paise
    currency: "INR",
    period: "month",
    priceDisplay: "₹999",
    features: [
      "Post up to 5 jobs per month",
      "Basic analytics dashboard",
      "Email support",
      "Standard listing visibility",
      "7-day job posting duration"
    ]
  },
  PROFESSIONAL: {
    id: "professional",
    name: "Professional Plan",
    price: 150000, // ₹2999 × 100 = 299900 paise
    currency: "INR",
    period: "month",
    priceDisplay: "₹2,999", // Comma for better readability
    features: [
      "Post up to 20 jobs per month",
      "Advanced analytics with insights",
      "Priority email & chat support",
      "Featured job listings (5 per month)",
      "30-day job posting duration",
      "Applicant tracking system"
    ]
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise Plan",
    price: 300000, // ₹9999 × 100 = 999900 paise
    currency: "INR",
    period: "month",
    priceDisplay: "₹9,999", // Comma for better readability
    features: [
      "Unlimited job postings",
      "Custom analytics & reporting",
      "24/7 phone & email support",
      "All jobs featured",
      "90-day job posting duration",
      "Advanced applicant tracking",
      "API access",
      "Dedicated account manager"
    ]
  }
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[SubscriptionPlanId];