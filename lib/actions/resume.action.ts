"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getStorage } from "firebase-admin/storage";
import { ResumeAnalysis, CreateResumeAnalysisParams } from "@/types";
import { generateId } from "@/lib/utils";
import {
  analyzeResumeWithAI,
  extractTextFromPDF,
  extractTextFromDOCX,
} from "@/lib/groq";
import { initAdmin } from "@/lib/firebase/admin";

// ============ RESUME UPLOAD & PARSING ============

export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<{ success: boolean; resumeUrl?: string; resumeText?: string; error?: string }> {
  try {
    initAdmin();
    const storage = getStorage();
    const bucket = storage.bucket();

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    const uniqueFileName = `resumes/${userId}/${timestamp}-${fileName}`;

    // Upload file to Firebase Storage
    const file = bucket.file(uniqueFileName);
    await file.save(fileBuffer, {
      metadata: {
        contentType:
          fileExtension === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

    // Make file publicly accessible
    await file.makePublic();
    const resumeUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;

    // Extract text from resume
    let resumeText = "";
    if (fileExtension === "pdf") {
      resumeText = await extractTextFromPDF(fileBuffer);
    } else if (fileExtension === "docx") {
      resumeText = await extractTextFromDOCX(fileBuffer);
    } else {
      return { success: false, error: "Unsupported file format. Please upload PDF or DOCX." };
    }

    return { success: true, resumeUrl, resumeText };
  } catch (error: any) {
    console.error("Upload resume error:", error);
    return { success: false, error: error.message || "Failed to upload resume" };
  }
}

// ============ RESUME ANALYSIS ============

export async function createResumeAnalysis(
  params: CreateResumeAnalysisParams
): Promise<{ success: boolean; analysisId?: string; analysis?: ResumeAnalysis; error?: string }> {
  try {
    const { studentId, jobId, fileName, resumeUrl, resumeText, jobDescription } = params;

    // Analyze resume with AI
    const aiAnalysis = await analyzeResumeWithAI(resumeText, jobDescription);

    const analysisId = generateId();
    const analysis: ResumeAnalysis = {
      id: analysisId,
      studentId,
      jobId,
      fileName,
      resumeUrl,
      overallScore: aiAnalysis.overallScore,
      categoryScores: aiAnalysis.categoryScores,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      keywords: aiAnalysis.keywords,
      atsCompatibility: aiAnalysis.atsCompatibility,
      createdAt: new Date().toISOString(),
    };

    await adminDb().collection("resumeAnalyses").doc(analysisId).set(analysis);

    return { success: true, analysisId, analysis };
  } catch (error: any) {
    console.error("Create resume analysis error:", error);
    return { success: false, error: error.message || "Failed to analyze resume" };
  }
}

// ============ GET RESUME ANALYSES ============

export async function getResumeAnalysesByStudent(
  studentId: string
): Promise<ResumeAnalysis[]> {
  try {
    const snapshot = await adminDb()
      .collection("resumeAnalyses")
      .where("studentId", "==", studentId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as ResumeAnalysis);
  } catch (error) {
    console.error("Get resume analyses error:", error);
    return [];
  }
}

export async function getResumeAnalysisById(
  analysisId: string
): Promise<ResumeAnalysis | null> {
  try {
    const doc = await adminDb().collection("resumeAnalyses").doc(analysisId).get();
    return doc.exists ? (doc.data() as ResumeAnalysis) : null;
  } catch (error) {
    console.error("Get resume analysis error:", error);
    return null;
  }
}

export async function getLatestResumeAnalysis(
  studentId: string
): Promise<ResumeAnalysis | null> {
  try {
    const snapshot = await adminDb()
      .collection("resumeAnalyses")
      .where("studentId", "==", studentId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as ResumeAnalysis;
  } catch (error) {
    console.error("Get latest resume analysis error:", error);
    return null;
  }
}

// ============ DELETE RESUME ANALYSIS ============

export async function deleteResumeAnalysis(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await adminDb().collection("resumeAnalyses").doc(analysisId).delete();
    return { success: true };
  } catch (error: any) {
    console.error("Delete resume analysis error:", error);
    return { success: false, error: error.message };
  }
}
