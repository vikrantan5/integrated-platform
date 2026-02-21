"use server";

import { adminDb } from "@/lib/firebase/admin";
import { Interview, Feedback, CreateFeedbackParams } from "@/types";
import { generateId } from "@/lib/utils";
import { generateInterviewQuestions, generateInterviewFeedback } from "@/lib/ai";

// ============ STANDALONE MOCK INTERVIEW ACTIONS ============

export interface CreateMockInterviewParams {
  userId: string;
  userName: string;
  role: string;
  level: string;
  techstack: string[];
  experience: number;
}

export async function createMockInterview(
  params: CreateMockInterviewParams
): Promise<{ success: boolean; interviewId?: string; questions?: string[]; error?: string }> {
  try {
    const { userId, userName, role, level, techstack, experience } = params;

    // Generate AI questions based on role and level
    const questions = await generateInterviewQuestions({
      role,
      level,
      techStack: techstack,
       experience: experience.toString(),
      jobDescription: `Mock interview for ${role} position at ${level} level`,
      count: 5,
    });

    const interviewId = generateId();
    const interview: Interview = {
      id: interviewId,
      applicationId: "mock-" + interviewId, // Mock application ID
      jobId: "mock-practice", // Mock job ID
      role,
      level,
      questions,
      techstack,
      userId,
      type: "mock",
      finalized: false,
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("interviews").doc(interviewId).set(interview);

    return { success: true, interviewId, questions };
  } catch (error: any) {
    console.error("Create mock interview error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMockInterviewsByUser(userId: string): Promise<Interview[]> {
  try {
    const snapshot = await adminDb()
      .collection("interviews")
      .where("userId", "==", userId)
      .where("type", "==", "mock")
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Interview);
  } catch (error) {
    console.error("Get mock interviews error:", error);
    return [];
  }
}
