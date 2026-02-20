"use server";

import { adminDb } from "@/lib/firebase/admin";
import { Interview, Feedback, CreateFeedbackParams } from "@/types";
import { generateId } from "@/lib/utils";
import { generateInterviewQuestions, generateInterviewFeedback } from "@/lib/ai";

// ============ INTERVIEW ACTIONS ============

export async function createInterview(params: {
  applicationId: string;
  jobId: string;
  role: string;
  level: string;
  techstack: string[];
  userId: string;
  jobDescription: string;
  experience: number;
}): Promise<{ success: boolean; interviewId?: string; questions?: string[]; error?: string }> {
  try {
    const { applicationId, jobId, role, level, techstack, userId, jobDescription, experience } = params;

    // Generate AI questions based on job
    const questions = await generateInterviewQuestions({
      role,
      level,
      techStack: techstack,
      experience,
      jobDescription,
      count: 5,
    });

    const interviewId = generateId();
    const interview: Interview = {
      id: interviewId,
      applicationId,
      jobId,
      role,
      level,
      questions,
      techstack,
      userId,
      type: "technical",
      finalized: false,
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("interviews").doc(interviewId).set(interview);

    return { success: true, interviewId, questions };
  } catch (error: any) {
    console.error("Create interview error:", error);
    return { success: false, error: error.message };
  }
}

export async function getInterviewById(interviewId: string): Promise<Interview | null> {
  try {
    const doc = await adminDb().collection("interviews").doc(interviewId).get();
    return doc.exists ? (doc.data() as Interview) : null;
  } catch (error) {
    console.error("Get interview error:", error);
    return null;
  }
}

export async function getInterviewsByUser(userId: string): Promise<Interview[]> {
  try {
    const snapshot = await adminDb()
      .collection("interviews")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Interview);
  } catch (error) {
    console.error("Get user interviews error:", error);
    return [];
  }
}

export async function finalizeInterview(
  interviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("interviews").doc(interviewId).update({ finalized: true });
    return { success: true };
  } catch (error: any) {
    console.error("Finalize interview error:", error);
    return { success: false, error: error.message };
  }
}

// ============ FEEDBACK ACTIONS ============

export async function createFeedback(
  params: CreateFeedbackParams
): Promise<{ success: boolean; feedbackId?: string; feedback?: Feedback; error?: string }> {
  try {
    const { interviewId, applicationId, userId, transcript, feedbackId: existingFeedbackId } = params;

    // Get interview details
    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    // Generate AI feedback
    const aiAnalysis = await generateInterviewFeedback({
      role: interview.role,
      questions: interview.questions,
      transcript,
    });

    const feedbackId = existingFeedbackId || generateId();
    const feedback: Feedback = {
      id: feedbackId,
      interviewId,
      applicationId,
      userId,
      totalScore: aiAnalysis.totalScore,
      categoryScores: aiAnalysis.categoryScores,
      strengths: aiAnalysis.strengths,
      areasForImprovement: aiAnalysis.areasForImprovement,
      finalAssessment: aiAnalysis.finalAssessment,
      transcript,
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("feedbacks").doc(feedbackId).set(feedback);

    // Mark interview as finalized
    await finalizeInterview(interviewId);

    return { success: true, feedbackId, feedback };
  } catch (error: any) {
    console.error("Create feedback error:", error);
    return { success: false, error: error.message };
  }
}

export async function getFeedbackByInterviewId(interviewId: string): Promise<Feedback | null> {
  try {
    const snapshot = await adminDb()
      .collection("feedbacks")
      .where("interviewId", "==", interviewId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Feedback;
  } catch (error) {
    console.error("Get feedback error:", error);
    return null;
  }
}

export async function getFeedbackByApplicationId(applicationId: string): Promise<Feedback | null> {
  try {
    const snapshot = await adminDb()
      .collection("feedbacks")
      .where("applicationId", "==", applicationId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Feedback;
  } catch (error) {
    console.error("Get feedback by application error:", error);
    return null;
  }
}

export async function getFeedbacksByUser(userId: string): Promise<Feedback[]> {
  try {
    const snapshot = await adminDb()
      .collection("feedbacks")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Feedback);
  } catch (error) {
    console.error("Get user feedbacks error:", error);
    return [];
  }
}
