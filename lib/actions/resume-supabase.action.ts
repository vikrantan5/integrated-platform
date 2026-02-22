"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { ResumeAnalysis, CreateResumeAnalysisParams } from "@/types";
import { generateId } from "@/lib/utils";
import {
  analyzeResumeWithAI,
  extractTextFromPDF,
  extractTextFromDOCX,
} from "@/lib/groq";

/* ============================================================
   RESUME UPLOAD & PARSING (SUPABASE)
============================================================ */

export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<{
  success: boolean;
  resumeUrl?: string;
  resumeText?: string;
  error?: string;
}> {
  try {
    /* ---------- SAFETY CHECKS ---------- */

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error("❌ Empty file buffer received");
      return { success: false, error: "Uploaded file is empty" };
    }

    if (!fileName) {
      return { success: false, error: "Invalid file name" };
    }

    const fileExtension = fileName.split(".").pop()?.toLowerCase();

    if (!fileExtension || !["pdf", "docx"].includes(fileExtension)) {
      return {
        success: false,
        error: "Unsupported file format. Upload PDF or DOCX only.",
      };
    }

    console.log("📄 Uploading:", fileName);
    console.log("📦 Buffer size:", fileBuffer.length);

    /* ---------- UNIQUE FILE NAME ---------- */

    const safeFileName = fileName.replace(/\s+/g, "_");
    const uniqueFileName = `${userId}/${Date.now()}-${safeFileName}`;

    /* ---------- CONTENT TYPE ---------- */

    const contentType =
      fileExtension === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    /* ---------- UPLOAD TO SUPABASE ---------- */

    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(uniqueFileName, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    /* ---------- GET PUBLIC URL ---------- */

    const { data: urlData } = supabaseAdmin.storage
      .from("resumes")
      .getPublicUrl(uniqueFileName);

    const resumeUrl = urlData.publicUrl;

    /* ---------- TEXT EXTRACTION ---------- */

    let resumeText = "";

    try {
      if (fileExtension === "pdf") {
        resumeText = await extractTextFromPDF(fileBuffer);
      } else {
        resumeText = await extractTextFromDOCX(fileBuffer);
      }
    } catch (parseError: any) {
      console.error("❌ Resume parsing failed:", parseError);
      return {
        success: false,
        error:
          "Could not extract text from file. Ensure it contains selectable text (not scanned image).",
      };
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return {
        success: false,
        error: "No readable text found in resume",
      };
    }

    return { success: true, resumeUrl, resumeText };
  } catch (error: any) {
    console.error("❌ Upload resume error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload resume",
    };
  }
}

/* ============================================================
   RESUME ANALYSIS (SUPABASE)
============================================================ */

export async function createResumeAnalysis(
  params: CreateResumeAnalysisParams
): Promise<{
  success: boolean;
  analysisId?: string;
  analysis?: ResumeAnalysis;
  error?: string;
}> {
  try {
    const {
      studentId,
      jobId,
      fileName,
      resumeUrl,
      resumeText,
      jobDescription,
    } = params;

    const aiAnalysis = await analyzeResumeWithAI(
      resumeText,
      jobDescription
    );

    /* ---------- CATEGORY SCORE MAPPING ---------- */

    const categoryScoresObj = {
      experience: 0,
      education: 0,
      skills: 0,
      keywords: 0,
      formatting: 0,
    };

    aiAnalysis.categoryScores.forEach((cat) => {
      const key = cat.category.toLowerCase().replace(/[^a-z]/g, "");

      if (key.includes("format") || key.includes("structure"))
        categoryScoresObj.formatting = cat.score;
      else if (key.includes("experience"))
        categoryScoresObj.experience = cat.score;
      else if (key.includes("education"))
        categoryScoresObj.education = cat.score;
      else if (key.includes("skill"))
        categoryScoresObj.skills = cat.score;
      else if (key.includes("keyword"))
        categoryScoresObj.keywords = cat.score;
    });

    /* ---------- ATS SCORE ---------- */

    const atsCompatibilityMap: Record<string, number> = {
      Excellent: 90,
      Good: 75,
      Fair: 50,
      Poor: 30,
    };

    const atsCompatibilityNumber =
      atsCompatibilityMap[aiAnalysis.atsCompatibility] || 50;

    const keywordsObj = {
      matched: aiAnalysis.keywords.found || [],
      missing: aiAnalysis.keywords.missing || [],
    };

    const analysisId = generateId();

    const analysis: ResumeAnalysis = {
      id: analysisId,
      studentId,
      jobId,
      fileName,
      resumeUrl,
      overallScore: aiAnalysis.overallScore,
      categoryScores: categoryScoresObj,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      keywords: keywordsObj,
      atsCompatibility: atsCompatibilityNumber,
      createdAt: new Date().toISOString(),
    };

    /* ---------- SAVE TO DB ---------- */

    const { error } = await supabaseAdmin.from("resume_analyses").insert({
      id: analysisId,
      student_id: studentId,
      job_id: jobId || null,
      file_name: fileName,
      resume_url: resumeUrl,
      overall_score: aiAnalysis.overallScore,
      category_scores: categoryScoresObj,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      keywords: keywordsObj,
      ats_compatibility: atsCompatibilityNumber,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, analysisId, analysis };
  } catch (error: any) {
    console.error("❌ Create resume analysis error:", error);
    return {
      success: false,
      error: error.message || "Failed to analyze resume",
    };
  }
}

/* ============================================================
   FETCH ANALYSES
============================================================ */

export async function getResumeAnalysesByStudent(
  studentId: string
): Promise<ResumeAnalysis[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("resume_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Get analyses error:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      jobId: row.job_id,
      fileName: row.file_name,
      resumeUrl: row.resume_url,
      overallScore: row.overall_score,
      categoryScores: row.category_scores,
      strengths: row.strengths,
      improvements: row.improvements,
      keywords: row.keywords,
      atsCompatibility: row.ats_compatibility,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("❌ Get analyses error:", error);
    return [];
  }
}

/* ============================================================
   DELETE
============================================================ */

export async function deleteResumeAnalysis(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("resume_analyses")
      .delete()
      .eq("id", analysisId);

    if (error) {
      console.error("❌ Delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ Delete error:", error);
    return { success: false, error: error.message };
  }
}