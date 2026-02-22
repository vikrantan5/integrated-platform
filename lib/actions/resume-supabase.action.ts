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
   RESUME UPLOAD & PARSING
============================================================ */

export async function uploadResumeFile(
  fileData: Uint8Array | Buffer,
  fileName: string,
  userId: string
): Promise<{
  success: boolean;
  resumeUrl?: string;
  resumeText?: string;
  error?: string;
}> {
  try {
    const fileBuffer = Buffer.isBuffer(fileData)
      ? fileData
      : Buffer.from(fileData);

    if (!fileBuffer || fileBuffer.length === 0) {
      return { success: false, error: "Uploaded file is empty" };
    }

    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    if (!fileExtension || !["pdf", "docx"].includes(fileExtension)) {
      return { success: false, error: "Upload PDF or DOCX only" };
    }

    const safeFileName = fileName.replace(/\s+/g, "_");
    const uniqueFileName = `${userId}/${Date.now()}-${safeFileName}`;

    const contentType =
      fileExtension === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(uniqueFileName, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("resumes")
      .getPublicUrl(uniqueFileName);

    let resumeText = "";

    try {
      if (fileExtension === "pdf") {
        resumeText = await extractTextFromPDF(fileBuffer);
      } else {
        resumeText = await extractTextFromDOCX(fileBuffer);
      }
    } catch {
      return {
        success: false,
        error: "Could not extract text from file",
      };
    }

    if (!resumeText.trim()) {
      return { success: false, error: "No readable text found" };
    }

    return {
      success: true,
      resumeUrl: urlData.publicUrl,
      resumeText,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* ============================================================
   CREATE ANALYSIS
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
       jobCategory,
      jobRole,
    } = params;

    const aiAnalysis = await analyzeResumeWithAI(
      resumeText,
       jobDescription,
      jobCategory,
      jobRole
    );

    /* ---------- CATEGORY SCORES ---------- */

    const categoryScoresObj = {
      experience: 0,
      education: 0,
      skills: 0,
      keywords: 0,
      formatting: 0,
    };

    aiAnalysis.categoryScores.forEach((cat: any) => {
      const key = cat.category.toLowerCase();

      if (key.includes("experience")) categoryScoresObj.experience = cat.score;
      else if (key.includes("education")) categoryScoresObj.education = cat.score;
      else if (key.includes("skill")) categoryScoresObj.skills = cat.score;
      else if (key.includes("keyword")) categoryScoresObj.keywords = cat.score;
      else if (key.includes("format")) categoryScoresObj.formatting = cat.score;
    });

    /* ---------- ATS SCORE ---------- */

    const atsMap: Record<string, number> = {
      Excellent: 90,
      Good: 75,
      Fair: 50,
      Poor: 30,
    };

    const atsCompatibilityNumber =
      atsMap[aiAnalysis.atsCompatibility] ?? 50;

    /* ---------- KEYWORDS (FIXED STRUCTURE) ---------- */

    const keywordsObject = {
      matched: aiAnalysis.keywords?.found ?? [],
      missing: aiAnalysis.keywords?.missing ?? [],
    };

    const analysisId = generateId();

    const analysis: ResumeAnalysis = {
      id: analysisId,
      studentId,
      jobId,
      fileName,
      resumeUrl,
      overallScore: Number(aiAnalysis.overallScore),
      categoryScores: categoryScoresObj,
      strengths: aiAnalysis.strengths ?? [],
      improvements: aiAnalysis.improvements ?? [],
      keywords: keywordsObject,
      atsCompatibility: atsCompatibilityNumber,
      createdAt: new Date().toISOString(),
    };

    /* ---------- INSERT ---------- */

    const { error } = await supabaseAdmin.from("resume_analyses").insert({
      id: analysisId,
      student_id: studentId,
      job_id: jobId || null,
      file_name: fileName,
      resume_url: resumeUrl,
      overall_score: analysis.overallScore,
      category_scores: categoryScoresObj,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      keywords: keywordsObject,   // ✅ correct JSON
      ats_compatibility: atsCompatibilityNumber,
      created_at: analysis.createdAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, analysisId, analysis };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* ============================================================
   GET ALL
============================================================ */

export async function getResumeAnalysesByStudent(
  studentId: string
): Promise<ResumeAnalysis[]> {
  const { data, error } = await supabaseAdmin
    .from("resume_analyses")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map(mapRowToAnalysis);
}

/* ============================================================
   GET ONE
============================================================ */

export async function getResumeAnalysisById(
  analysisId: string
): Promise<ResumeAnalysis | null> {
  const { data, error } = await supabaseAdmin
    .from("resume_analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (error || !data) return null;

  return mapRowToAnalysis(data);
}

/* ============================================================
   DELETE
============================================================ */

export async function deleteResumeAnalysis(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("resume_analyses")
    .delete()
    .eq("id", analysisId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ============================================================
   SAFE DB → OBJECT MAPPER
============================================================ */

function mapRowToAnalysis(row: any): ResumeAnalysis {
  return {
    id: row.id,
    studentId: row.student_id,
    jobId: row.job_id,
    fileName: row.file_name,
    resumeUrl: row.resume_url,
    overallScore: Number(row.overall_score),

    categoryScores: {
      experience: Number(row.category_scores?.experience ?? 0),
      education: Number(row.category_scores?.education ?? 0),
      skills: Number(row.category_scores?.skills ?? 0),
      keywords: Number(row.category_scores?.keywords ?? 0),
      formatting: Number(row.category_scores?.formatting ?? 0),
    },

    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],

    keywords: {
      matched: row.keywords?.matched ?? [],
      missing: row.keywords?.missing ?? [],
    },

    atsCompatibility: Number(row.ats_compatibility),
    createdAt: row.created_at,
  };
}