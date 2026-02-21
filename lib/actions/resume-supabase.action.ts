"use server";

import { supabase } from "@/lib/supabase";
import { ResumeAnalysis, CreateResumeAnalysisParams } from "@/types";
import { generateId } from "@/lib/utils";
import {
  analyzeResumeWithAI,
  extractTextFromPDF,
  extractTextFromDOCX,
} from "@/lib/groq";

// ============ RESUME UPLOAD & PARSING (SUPABASE) ============

export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<{ success: boolean; resumeUrl?: string; resumeText?: string; error?: string }> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    const uniqueFileName = `${userId}/${timestamp}-${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("resumes")
      .upload(uniqueFileName, fileBuffer, {
        contentType:
          fileExtension === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(uniqueFileName);
    const resumeUrl = urlData.publicUrl;

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

// ============ RESUME ANALYSIS (SUPABASE) ============

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

    // Insert into Supabase
    const { error } = await supabase.from("resume_analyses").insert({
      id: analysisId,
      student_id: studentId,
      job_id: jobId || null,
      file_name: fileName,
      resume_url: resumeUrl,
      overall_score: aiAnalysis.overallScore,
      category_scores: aiAnalysis.categoryScores,
      strengths: aiAnalysis.strengths,
      improvements: aiAnalysis.improvements,
      keywords: aiAnalysis.keywords,
      ats_compatibility: aiAnalysis.atsCompatibility,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, analysisId, analysis };
  } catch (error: any) {
    console.error("Create resume analysis error:", error);
    return { success: false, error: error.message || "Failed to analyze resume" };
  }
}

// ============ GET RESUME ANALYSES (SUPABASE) ============

export async function getResumeAnalysesByStudent(
  studentId: string
): Promise<ResumeAnalysis[]> {
  try {
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get resume analyses error:", error);
      return [];
    }

    // Transform snake_case to camelCase
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
    console.error("Get resume analyses error:", error);
    return [];
  }
}

export async function getResumeAnalysisById(
  analysisId: string
): Promise<ResumeAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (error || !data) {
      console.error("Get resume analysis error:", error);
      return null;
    }

    // Transform snake_case to camelCase
    return {
      id: data.id,
      studentId: data.student_id,
      jobId: data.job_id,
      fileName: data.file_name,
      resumeUrl: data.resume_url,
      overallScore: data.overall_score,
      categoryScores: data.category_scores,
      strengths: data.strengths,
      improvements: data.improvements,
      keywords: data.keywords,
      atsCompatibility: data.ats_compatibility,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Get resume analysis error:", error);
    return null;
  }
}

export async function getLatestResumeAnalysis(
  studentId: string
): Promise<ResumeAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Transform snake_case to camelCase
    return {
      id: data.id,
      studentId: data.student_id,
      jobId: data.job_id,
      fileName: data.file_name,
      resumeUrl: data.resume_url,
      overallScore: data.overall_score,
      categoryScores: data.category_scores,
      strengths: data.strengths,
      improvements: data.improvements,
      keywords: data.keywords,
      atsCompatibility: data.ats_compatibility,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Get latest resume analysis error:", error);
    return null;
  }
}

// ============ DELETE RESUME ANALYSIS (SUPABASE) ============

export async function deleteResumeAnalysis(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("resume_analyses")
      .delete()
      .eq("id", analysisId);

    if (error) {
      console.error("Delete resume analysis error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Delete resume analysis error:", error);
    return { success: false, error: error.message };
  }
}
