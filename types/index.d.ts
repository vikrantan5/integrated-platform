// TypeScript type definitions for the integrated platform

export interface User {
  id: string;
  name: string;
  email: string;
  role: "jobseeker" | "recruiter";
  bio?: string;
  skills?: string[];
  resumeUrl?: string;
  profilePic?: string;
  phoneNumber?: string;
  savedJobs?: string[];
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  ownerId: string; // recruiter userId
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  role: string;
  salary: number;
  experience: number; // years
  location: string;
  status: "open" | "closed";
  openings: number;
  companyId: string;
  companyName?: string;
  companyLogo?: string;
  recruiterId: string;
  techStack: string[]; // For AI interview generation
  createdAt: string;
  // External job fields
  source?: "recruiter" | "external";
  externalCompany?: string; // Company name for external jobs
  externalUrl?: string; // Original job URL
  scrapedAt?: string; // When job was scraped
  scrapeStatus?: "success" | "failed" | "pending"; // Scraping status
  jobType?: string; // Full-time, Part-time, etc.
  postedDate?: string; // Original posting date from external site
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  jobName: string;
  jobSalary: number;
  status: "pending" | "accepted" | "rejected";
  resumeUrl?: string;
  interviewId?: string | null; // Link to interview
  interviewStatus?: "pending" | "completed" | "skipped";
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string; // Link back to application
  jobId: string;
  role: string;
  level: string; // Junior, Mid, Senior
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string; // job seeker
  type: string;
  finalized: boolean;
}

export interface Feedback {
  id: string;
  interviewId: string;
  applicationId: string; // Link back to application
  userId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  transcript?: Array<{ role: string; content: string }>;
  createdAt: string;
}

export interface CreateFeedbackParams {
  interviewId: string;
  applicationId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

export interface SignInParams {
  email: string;
  idToken: string;
}

export interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  role: "jobseeker" | "recruiter";
  phoneNumber?: string;
}

export type FormType = "sign-in" | "sign-up";

export interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

export interface ResumeAnalysis {
  id: string;
  studentId: string;
  jobId?: string | null;
  fileName: string;
  resumeUrl: string;
  overallScore: number;
  categoryScores: {
    experience: number;
    education: number;
    skills: number;
    keywords: number;
    formatting: number;
  };
  strengths: string[];
  improvements: string[];
  keywords: {
    matched: string[];
    missing: string[];
  };
  atsCompatibility: number;
  createdAt: string;
}

export interface CreateResumeAnalysisParams {
  studentId: string;
  jobId?: string;
  fileName: string;
  resumeUrl: string;
  resumeText: string;
  jobDescription: string;
  jobCategory?: string;
  jobRole?: string;
}

// Updated Subscription types to support both old and new structure
export type PlanType = "monthly" | "yearly";
export type PlanId = "basic" | "professional" | "enterprise";

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType; // For backward compatibility
  planId?: PlanId; // New field for three-tier plans
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewUsage {
  id: string;
  userId: string;
  interviewCount: number;
  freeTrialUsed: boolean;
  lastInterviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Updated to support both planType and planId
export interface CreateSubscriptionParams {
  userId: string;
  planType: PlanType;
  planId?: PlanId; // Optional for backward compatibility
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
}

// Helper function to get display name from subscription
export const getSubscriptionDisplayName = (subscription: Subscription): string => {
  // If planId exists (new structure)
  if (subscription.planId) {
    switch(subscription.planId) {
      case "basic": return "Monthly";
      case "professional": return "Yearly";
      case "enterprise": return "Enterprise";
      default: return subscription.planId;
    }
  }
  
  // Fallback to old structure
  return subscription.planType === "monthly" ? "Monthly" : "Yearly";
};

// Helper function to get plan details for UI
export const getPlanDetails = (planId: PlanId) => {
  const plans = {
    basic: {
      name: "Monthly Plan",
      displayName: "Monthly",
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
    professional: {
      name: "Yearly Plan",
      displayName: "Yearly",
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
    },
    enterprise: {
      name: "Enterprise Plan",
      displayName: "Enterprise",
      price: 3000,
      priceDisplay: "₹3,000",
      period: "month",
      features: [
        "Everything in Yearly Plan",
        "Team Management",
        "API Access",
        "Dedicated Account Manager",
        "Custom Integrations",
        "SLA Guarantee"
      ]
    }
  };
  
  return plans[planId];
};