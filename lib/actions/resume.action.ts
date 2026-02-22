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

     // Transform categoryScores array to object structure
    const categoryScoresObj = {
      experience: 0,
      education: 0,
      skills: 0,
      keywords: 0,
      formatting: 0,
    };

    // Map AI response categories to expected structure
    // Groq returns: "Format & Structure", "Keyword Optimization", "Experience Description", "Skills Relevance", "ATS Compatibility"
    aiAnalysis.categoryScores.forEach((category) => {
      const categoryName = category.category.toLowerCase();
      if (categoryName.includes("experience")) {
        categoryScoresObj.experience = category.score;
      } else if (categoryName.includes("education")) {
        categoryScoresObj.education = category.score;
      } else if (categoryName.includes("skill")) {
        categoryScoresObj.skills = category.score;
      } else if (categoryName.includes("keyword")) {
        categoryScoresObj.keywords = category.score;
      // } else if (categoryName.includes("format") || categoryName.includes("structure")) {
      } else if (categoryName.includes("format") || categoryName.includes("structure") || categoryName.includes("ats compatibility")) {
        categoryScoresObj.formatting = category.score;
      }
    });


   // If some categories weren't found, use averages
    const scores = Object.values(categoryScoresObj).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 70;
    
    if (categoryScoresObj.experience === 0) categoryScoresObj.experience = avgScore;
    if (categoryScoresObj.education === 0) categoryScoresObj.education = avgScore;
    if (categoryScoresObj.skills === 0 && aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("skill"))) {
      categoryScoresObj.skills = aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("skill"))!.score;
    } else if (categoryScoresObj.skills === 0) {
      categoryScoresObj.skills = avgScore;
    }
    if (categoryScoresObj.keywords === 0 && aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("keyword"))) {
      categoryScoresObj.keywords = aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("keyword"))!.score;
    } else if (categoryScoresObj.keywords === 0) {
      categoryScoresObj.keywords = avgScore;
    }
    if (categoryScoresObj.formatting === 0 && aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("format") || c.category.toLowerCase().includes("ats"))) {
      const formatCat = aiAnalysis.categoryScores.find(c => c.category.toLowerCase().includes("format") || c.category.toLowerCase().includes("ats"));
      if (formatCat) categoryScoresObj.formatting = formatCat.score;
    } else if (categoryScoresObj.formatting === 0) {
      categoryScoresObj.formatting = avgScore;
    }

    // Convert ATS compatibility string to number
    const atsCompatibilityMap: Record<string, number> = {
      "Excellent": 90,
      "Good": 75,
      "Fair": 60,
      "Poor": 40,
    };
    const atsScore = atsCompatibilityMap[aiAnalysis.atsCompatibility] || 60;



    const analysisId = generateId();
    const analysis: ResumeAnalysis = {
      id: analysisId,
      studentId,
      jobId,
      fileName,
      resumeUrl,
      overallScore: aiAnalysis.overallScore,
      // categoryScores: aiAnalysis.categoryScores,
        categoryScores: categoryScoresObj,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      // keywords: aiAnalysis.keywords,
      // atsCompatibility: aiAnalysis.atsCompatibility,
      keywords: {
        matched: aiAnalysis.keywords.found,
        missing: aiAnalysis.keywords.missing,
      },
      atsCompatibility: atsScore,
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
