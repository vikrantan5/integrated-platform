"use server";

import { supabase } from "@/lib/supabase";
import { ResumeAnalysis, CreateResumeAnalysisParams } from "@/types";
import { generateId } from "@/lib/utils";
import {
  analyzeResumeWithAI,
  extractTextFromPDF,
  extractTextFromDOCX,
} from "@/lib/groq";

// ============ HELPER FUNCTIONS ============

/**
 * Transform database snake_case to camelCase for frontend
 */
function transformToCamelCase(row: any): ResumeAnalysis {
  return {
    id: row.id,
    studentId: row.student_id,
    jobId: row.job_id,
    fileName: row.file_name,
    resumeUrl: row.resume_url,
    overallScore: row.overall_score,
    categoryScores: row.category_scores,
    strengths: row.strengths || [],
    improvements: row.improvements || [],
    keywords: row.keywords || [],
    atsCompatibility: row.ats_compatibility,
    createdAt: row.created_at,
  };
}

/**
 * Validate file size and type
 */
function validateFile(fileBuffer: Buffer, fileName: string): { valid: boolean; error?: string } {
  // File size validation (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (fileBuffer.length > MAX_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }

  // File type validation
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  const validExtensions = ["pdf", "docx"];
  
  if (!fileExtension || !validExtensions.includes(fileExtension)) {
    return { valid: false, error: "Unsupported file format. Please upload PDF or DOCX." };
  }

  return { valid: true };
}

/**
 * Extract text from file based on extension
 */
async function extractTextFromFile(fileBuffer: Buffer, fileName: string): Promise<string> {
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  
  if (fileExtension === "pdf") {
    return await extractTextFromPDF(fileBuffer);
  } else if (fileExtension === "docx") {
    return await extractTextFromDOCX(fileBuffer);
  }
  
  throw new Error("Unsupported file format");
}

// ============ RESUME UPLOAD & PARSING (SUPABASE) ============

export async function uploadResumeFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<{ success: boolean; resumeUrl?: string; resumeText?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateFile(fileBuffer, fileName);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename with user folder structure
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    const uniqueFileName = `${userId}/${timestamp}-${randomString}.${fileExtension}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("resumes")
      .upload(uniqueFileName, fileBuffer, {
        contentType:
          fileExtension === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      
      // Handle specific error cases
      if (error.message.includes("duplicate")) {
        return { success: false, error: "A file with this name already exists" };
      } else if (error.message.includes("permission")) {
        return { success: false, error: "You don't have permission to upload files" };
      } else if (error.message.includes("bucket")) {
        return { success: false, error: "Storage bucket not found. Please contact support." };
      }
      
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(uniqueFileName);
    const resumeUrl = urlData.publicUrl;

    // Extract text from resume
    let resumeText = "";
    try {
      resumeText = await extractTextFromFile(fileBuffer, fileName);
      
      if (!resumeText || resumeText.trim().length === 0) {
        return { 
          success: false, 
          error: "Could not extract text from resume. The file might be empty or password protected." 
        };
      }
    } catch (extractError: any) {
      console.error("Text extraction error:", extractError);
      return { 
        success: false, 
        error: extractError.message || "Failed to extract text from resume" 
      };
    }

    return { success: true, resumeUrl, resumeText };
  } catch (error: any) {
    console.error("Upload resume error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to upload resume. Please try again." 
    };
  }
}

// ============ RESUME ANALYSIS (SUPABASE) ============

export async function createResumeAnalysis(
  params: CreateResumeAnalysisParams
): Promise<{ success: boolean; analysisId?: string; analysis?: ResumeAnalysis; error?: string }> {
  try {
    const { studentId, jobId, fileName, resumeUrl, resumeText, jobDescription } = params;

    // Validate required fields
    if (!studentId) {
      return { success: false, error: "User ID is required" };
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return { success: false, error: "Resume text is empty. Cannot analyze." };
    }

    // Analyze resume with AI
    let aiAnalysis;
    try {
      aiAnalysis = await analyzeResumeWithAI(resumeText, jobDescription);
    } catch (aiError: any) {
      console.error("AI analysis error:", aiError);
      return { 
        success: false, 
        error: aiError.message || "AI analysis failed. Please try again." 
      };
    }
    
    // Validate AI response
    if (!aiAnalysis) {
      return { success: false, error: "AI analysis returned no results" };
    }

    if (typeof aiAnalysis.overallScore !== 'number' || 
        aiAnalysis.overallScore < 0 || 
        aiAnalysis.overallScore > 100) {
      return { success: false, error: "AI analysis returned invalid score" };
    }

    const analysisId = generateId();
    const now = new Date().toISOString();
    
    const analysis: ResumeAnalysis = {
      id: analysisId,
      studentId,
      jobId: jobId || undefined,
      fileName,
      resumeUrl,
      overallScore: aiAnalysis.overallScore,
      categoryScores: aiAnalysis.categoryScores || {
        format: 0,
        keywords: 0,
        experience: 0,
        skills: 0
      },
      strengths: aiAnalysis.strengths || [],
      improvements: aiAnalysis.improvements || [],
      keywords: aiAnalysis.keywords || [],
      atsCompatibility: aiAnalysis.atsCompatibility || "Fair",
      createdAt: now,
    };

    // Insert into Supabase
    const { error } = await supabase.from("resume_analyses").insert({
      id: analysisId,
      student_id: studentId,
      job_id: jobId || null,
      file_name: fileName,
      resume_url: resumeUrl,
      overall_score: analysis.overallScore,
      category_scores: analysis.categoryScores,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      keywords: analysis.keywords,
      ats_compatibility: analysis.atsCompatibility,
      created_at: now,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      
      // Check for specific database errors
      if (error.code === '23505') { // Unique violation
        return { success: false, error: "Duplicate analysis record" };
      } else if (error.code === '23502') { // Not null violation
        return { success: false, error: "Missing required fields" };
      } else if (error.code === '42P01') { // Undefined table
        return { success: false, error: "Database table not found. Please run migrations." };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true, analysisId, analysis };
  } catch (error: any) {
    console.error("Create resume analysis error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to analyze resume. Please try again." 
    };
  }
}

// ============ GET RESUME ANALYSES (SUPABASE) ============

export async function getResumeAnalysesByStudent(
  studentId: string
): Promise<ResumeAnalysis[]> {
  try {
    if (!studentId) {
      console.error("Student ID is required");
      return [];
    }

    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get resume analyses error:", error);
      return [];
    }

    return (data || []).map(transformToCamelCase);
  } catch (error) {
    console.error("Get resume analyses error:", error);
    return [];
  }
}

export async function getResumeAnalysisById(
  analysisId: string
): Promise<ResumeAnalysis | null> {
  try {
    if (!analysisId) {
      console.error("Analysis ID is required");
      return null;
    }

    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (error) {
      console.error("Get resume analysis error:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return transformToCamelCase(data);
  } catch (error) {
    console.error("Get resume analysis error:", error);
    return null;
  }
}

export async function getLatestResumeAnalysis(
  studentId: string
): Promise<ResumeAnalysis | null> {
  try {
    if (!studentId) {
      console.error("Student ID is required");
      return null;
    }

    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Don't log "no rows returned" as error - it's expected for new users
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error("Get latest resume analysis error:", error);
      return null;
    }

    return transformToCamelCase(data);
  } catch (error) {
    console.error("Get latest resume analysis error:", error);
    return null;
  }
}

export async function getResumeAnalysesByJob(
  jobId: string
): Promise<ResumeAnalysis[]> {
  try {
    if (!jobId) {
      console.error("Job ID is required");
      return [];
    }

    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get analyses by job error:", error);
      return [];
    }

    return (data || []).map(transformToCamelCase);
  } catch (error) {
    console.error("Get analyses by job error:", error);
    return [];
  }
}

export async function getResumeAnalysisCount(
  studentId: string
): Promise<number> {
  try {
    if (!studentId) {
      return 0;
    }

    const { count, error } = await supabase
      .from("resume_analyses")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId);

    if (error) {
      console.error("Count error:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Count error:", error);
    return 0;
  }
}

// ============ DELETE RESUME ANALYSIS (SUPABASE) ============

export async function deleteResumeAnalysis(
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!analysisId) {
      return { success: false, error: "Analysis ID is required" };
    }

    // First get the analysis to get file path
    const { data: analysis, error: fetchError } = await supabase
      .from("resume_analyses")
      .select("resume_url")
      .eq("id", analysisId)
      .single();

    if (!fetchError && analysis?.resume_url) {
      // Extract file path from URL
      const urlParts = analysis.resume_url.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('resumes') + 1).join('/');
      
      // Delete file from storage
      if (filePath) {
        await supabase.storage.from("resumes").remove([filePath]);
      }
    }

    // Delete database record
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
    return { success: false, error: error.message || "Failed to delete analysis" };
  }
}

export async function deleteMultipleResumeAnalyses(
  analysisIds: string[]
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    if (!analysisIds || analysisIds.length === 0) {
      return { success: false, error: "No analysis IDs provided" };
    }

    // Delete all database records
    const { error, count } = await supabase
      .from("resume_analyses")
      .delete()
      .in("id", analysisIds);

    if (error) {
      console.error("Batch delete error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, deletedCount: count || 0 };
  } catch (error: any) {
    console.error("Batch delete error:", error);
    return { success: false, error: error.message };
  }
}

// ============ UPDATE RESUME ANALYSIS ============

export async function updateResumeAnalysis(
  analysisId: string,
  updates: Partial<ResumeAnalysis>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!analysisId) {
      return { success: false, error: "Analysis ID is required" };
    }

    // Convert camelCase to snake_case for Supabase
    const dbUpdates: any = {};
    if (updates.overallScore !== undefined) dbUpdates.overall_score = updates.overallScore;
    if (updates.categoryScores !== undefined) dbUpdates.category_scores = updates.categoryScores;
    if (updates.strengths !== undefined) dbUpdates.strengths = updates.strengths;
    if (updates.improvements !== undefined) dbUpdates.improvements = updates.improvements;
    if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
    if (updates.atsCompatibility !== undefined) dbUpdates.ats_compatibility = updates.atsCompatibility;

    // Only update if there are fields to update
    if (Object.keys(dbUpdates).length === 0) {
      return { success: true }; // Nothing to update
    }

    const { error } = await supabase
      .from("resume_analyses")
      .update(dbUpdates)
      .eq("id", analysisId);

    if (error) {
      console.error("Update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Update error:", error);
    return { success: false, error: error.message };
  }
}