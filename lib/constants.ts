// lib/constants.ts
import { z } from "zod";

// Feedback Schema for AI Analysis
export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

// VAPI Interviewer Configuration
export const interviewer = {
  name: "Interviewer",
  firstMessage: "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.

- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`,
      },
    ],
  },
};

// Tech Stack Icon Mappings
export const mappings: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  // ... rest of mappings
};


// Job Categories with proper structure
export const JOB_CATEGORIES = [
   { value: "software-development", label: "Software Development" },
  { value: "data-science", label: "Data Science" },
  { value: "ai-ml", label: "AI / Machine Learning" },
  { value: "devops", label: "DevOps" },
  { value: "cybersecurity", label: "Cyber Security" },
  { value: "ui-ux", label: "UI / UX Design" },
  { value: "product-management", label: "Product Management" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "cloud-engineering", label: "Cloud Engineering" },
  { value: "mobile-development", label: "Mobile Development" },
  { value: "qa-testing", label: "QA & Testing" },
];

// Job Roles organized by category
export const JOB_ROLES: Record<string, Array<{ value: string; label: string }>> = {
  "software-development": [
    { value: "frontend-developer", label: "Frontend Developer" },
    { value: "backend-developer", label: "Backend Developer" },
    { value: "full-stack-developer", label: "Full Stack Developer" },
    { value: "software-engineer", label: "Software Engineer" },
    { value: "senior-software-engineer", label: "Senior Software Engineer" },
    { value: "tech-lead", label: "Tech Lead" },
    { value: "software-architect", label: "Software Architect" },
  ],
  "data-science": [
    { value: "data-scientist", label: "Data Scientist" },
    { value: "data-analyst", label: "Data Analyst" },
    { value: "business-analyst", label: "Business Analyst" },
    { value: "data-engineer", label: "Data Engineer" },
    { value: "analytics-engineer", label: "Analytics Engineer" },
    { value: "quantitative-analyst", label: "Quantitative Analyst" },
  ],
  "ai-ml": [
    { value: "ml-engineer", label: "Machine Learning Engineer" },
    { value: "ai-engineer", label: "AI Engineer" },
    { value: "research-scientist", label: "Research Scientist" },
    { value: "nlp-engineer", label: "NLP Engineer" },
    { value: "computer-vision-engineer", label: "Computer Vision Engineer" },
    { value: "ai-researcher", label: "AI Researcher" },
  ],
  "devops": [
    { value: "devops-engineer", label: "DevOps Engineer" },
    { value: "sre", label: "Site Reliability Engineer (SRE)" },
    { value: "platform-engineer", label: "Platform Engineer" },
    { value: "infrastructure-engineer", label: "Infrastructure Engineer" },
    { value: "automation-engineer", label: "Automation Engineer" },
    { value: "release-manager", label: "Release Manager" },
  ],
  "cybersecurity": [
    { value: "security-engineer", label: "Security Engineer" },
    { value: "security-analyst", label: "Security Analyst" },
    { value: "penetration-tester", label: "Penetration Tester" },
    { value: "security-architect", label: "Security Architect" },
    { value: "incident-response", label: "Incident Response Analyst" },
    { value: "compliance-analyst", label: "Compliance Analyst" },
  ],
  "ui-ux": [
    { value: "ui-designer", label: "UI Designer" },
    { value: "ux-designer", label: "UX Designer" },
    { value: "product-designer", label: "Product Designer" },
    { value: "interaction-designer", label: "Interaction Designer" },
    { value: "visual-designer", label: "Visual Designer" },
    { value: "ux-researcher", label: "UX Researcher" },
  ],
  "product-management": [
    { value: "product-manager", label: "Product Manager" },
    { value: "senior-product-manager", label: "Senior Product Manager" },
    { value: "product-owner", label: "Product Owner" },
    { value: "technical-product-manager", label: "Technical Product Manager" },
    { value: "growth-product-manager", label: "Growth Product Manager" },
    { value: "product-lead", label: "Product Lead" },
  ],
  "marketing": [
    { value: "digital-marketer", label: "Digital Marketer" },
    { value: "content-marketer", label: "Content Marketer" },
    { value: "growth-marketer", label: "Growth Marketer" },
    { value: "seo-specialist", label: "SEO Specialist" },
    { value: "social-media-manager", label: "Social Media Manager" },
    { value: "marketing-manager", label: "Marketing Manager" },
  ],
  "finance": [
    { value: "financial-analyst", label: "Financial Analyst" },
    { value: "accountant", label: "Accountant" },
    { value: "financial-planner", label: "Financial Planner" },
    { value: "investment-analyst", label: "Investment Analyst" },
    { value: "finance-manager", label: "Finance Manager" },
    { value: "controller", label: "Controller" },
  ],
  "cloud-engineering": [
    { value: "cloud-engineer", label: "Cloud Engineer" },
    { value: "aws-engineer", label: "AWS Engineer" },
    { value: "azure-engineer", label: "Azure Engineer" },
    { value: "gcp-engineer", label: "GCP Engineer" },
    { value: "cloud-architect", label: "Cloud Architect" },
    { value: "cloud-security-engineer", label: "Cloud Security Engineer" },
  ],
  "mobile-development": [
    { value: "ios-developer", label: "iOS Developer" },
    { value: "android-developer", label: "Android Developer" },
    { value: "react-native-developer", label: "React Native Developer" },
    { value: "flutter-developer", label: "Flutter Developer" },
    { value: "mobile-architect", label: "Mobile Architect" },
    { value: "mobile-qa-engineer", label: "Mobile QA Engineer" },
  ],
  "qa-testing": [
    { value: "qa-engineer", label: "QA Engineer" },
    { value: "test-automation-engineer", label: "Test Automation Engineer" },
    { value: "sdet", label: "Software Development Engineer in Test (SDET)" },
    { value: "qa-lead", label: "QA Lead" },
    { value: "performance-tester", label: "Performance Tester" },
    { value: "manual-tester", label: "Manual Tester" },
  ],
};












// lib/subscription-constants.ts
export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: "basic",
    name: "Basic Plan",
    price: 999,
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
    price: 2999,
    currency: "INR",
    period: "month",
    priceDisplay: "₹2999",
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
    price: 9999,
    currency: "INR",
    period: "month",
    priceDisplay: "₹9999",
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