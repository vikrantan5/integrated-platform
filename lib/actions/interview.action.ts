// lib/actions/interview.action.ts

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
      experience: experience.toString(),
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

// ============ HELPER FUNCTION TO NORMALIZE CATEGORY SCORES ============

function normalizeCategoryScores(categoryScores: any): Array<{ name: string; score: number; comment: string }> {
  // If it's already an array, ensure each item has the correct structure
  if (Array.isArray(categoryScores)) {
    return categoryScores.map(cat => ({
      name: cat.name || cat.category || "Unknown Category",
      score: cat.score || 0,
      comment: cat.comment || cat.feedback || ""
    }));
  }
  
  // If it's an object with named properties (from AI)
  if (categoryScores && typeof categoryScores === 'object') {
    // Map the expected category names to display names
    const categoryMap = [
      { key: 'communicationSkills', name: 'Communication Skills' },
      { key: 'technicalKnowledge', name: 'Technical Knowledge' },
      { key: 'problemSolving', name: 'Problem Solving' },
      { key: 'culturalFit', name: 'Cultural Fit' },
      { key: 'confidenceClarity', name: 'Confidence & Clarity' }
    ];

    return categoryMap.map(({ key, name }) => ({
      name,
      score: categoryScores[key] || 0,
      comment: categoryScores[`${key}Comment`] || categoryScores[`${key}Feedback`] || ""
    }));
  }
  
  // Return empty array as fallback
  return [];
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

    // Normalize categoryScores to ensure it's an array with the correct structure
    const normalizedCategoryScores = normalizeCategoryScores(aiAnalysis.categoryScores);

    const feedbackId = existingFeedbackId || generateId();
    const feedback: Feedback = {
      id: feedbackId,
      interviewId,
      applicationId,
      userId,
      totalScore: aiAnalysis.totalScore,
      categoryScores: normalizedCategoryScores, // Now it's always an array
      strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : [],
      areasForImprovement: Array.isArray(aiAnalysis.areasForImprovement) ? aiAnalysis.areasForImprovement : [],
      finalAssessment: aiAnalysis.finalAssessment || "",
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

    const data = snapshot.docs[0].data() as Feedback;
    
    // Ensure the data structure is correct when reading from Firestore
    if (data && !Array.isArray(data.categoryScores)) {
      data.categoryScores = normalizeCategoryScores(data.categoryScores);
    }
    
    return data;
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

    const data = snapshot.docs[0].data() as Feedback;
    
    // Ensure the data structure is correct when reading from Firestore
    if (data && !Array.isArray(data.categoryScores)) {
      data.categoryScores = normalizeCategoryScores(data.categoryScores);
    }
    
    return data;
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

    const feedbacks = snapshot.docs.map((doc) => {
      const data = doc.data() as Feedback;
      
      // Ensure the data structure is correct when reading from Firestore
      if (data && !Array.isArray(data.categoryScores)) {
        data.categoryScores = normalizeCategoryScores(data.categoryScores);
      }
      
      return data;
    });
    
    return feedbacks;
  } catch (error) {
    console.error("Get user feedbacks error:", error);
    return [];
  }
}