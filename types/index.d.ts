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
}