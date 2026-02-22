import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ResumeAnalysisResult {
  overallScore: number;
  categoryScores: Array<{
    category: string;
    score: number;
    feedback: string;
  }>;
  strengths: string[];
  improvements: string[];
  keywords: {
    found: string[];
    missing: string[];
  };
  atsCompatibility: "Excellent" | "Good" | "Fair" | "Poor";
}

export async function analyzeResumeWithAI(
  resumeText: string,
  jobDescription?: string
): Promise<ResumeAnalysisResult> {
  try {
    const prompt = jobDescription
      ? `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume against the job description and provide detailed feedback.

**Resume:**
${resumeText}

**Job Description:**
${jobDescription}

Provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "categoryScores": [
    {
      "category": "Format & Structure",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Keyword Optimization",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Experience Description",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Skills Relevance",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "ATS Compatibility",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "keywords": {
    "found": ["keyword1", "keyword2"],
    "missing": ["missing1", "missing2"]
  },
  "atsCompatibility": "Excellent" | "Good" | "Fair" | "Poor"
}

Be thorough and specific. Provide actionable feedback.`
      : `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume and provide detailed feedback for general job applications.

**Resume:**
${resumeText}

Provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "categoryScores": [
    {
      "category": "Format & Structure",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Keyword Optimization",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Experience Description",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "Skills Relevance",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    },
    {
      "category": "ATS Compatibility",
      "score": <number 0-100>,
      "feedback": "<detailed feedback>"
    }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "keywords": {
    "found": ["keyword1", "keyword2"],
    "missing": []
  },
  "atsCompatibility": "Excellent" | "Good" | "Fair" | "Poor"
}

Be thorough and specific. Provide actionable feedback. Consider best practices for modern resumes.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert ATS resume analyzer. Always respond with valid JSON only, no additional text or markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const analysis: ResumeAnalysisResult = JSON.parse(responseText);

    // Validate and ensure all fields exist
    if (!analysis.overallScore) analysis.overallScore = 0;
    if (!analysis.categoryScores) analysis.categoryScores = [];
    if (!analysis.strengths) analysis.strengths = [];
    if (!analysis.improvements) analysis.improvements = [];
    if (!analysis.keywords) analysis.keywords = { found: [], missing: [] };
    if (!analysis.atsCompatibility) analysis.atsCompatibility = "Fair";

    return analysis;
  } catch (error) {
    console.error("Error analyzing resume with Groq AI:", error);
    throw new Error("Failed to analyze resume. Please try again.");
  }
}

// ============ FIXED PDF EXTRACTION ============

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    // Use require with the correct way to call pdf-parse
    const pdfParse = require('pdf-parse');
    
    // pdf-parse exports a function directly
    const data = await pdfParse(fileBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }
    
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    
    // Provide a more helpful error message
    if (error instanceof Error && error.message.includes('DOMMatrix')) {
      throw new Error(
        "PDF parsing requires additional setup. Please try a different PDF or convert it to text format first."
      );
    }
    
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============ ALTERNATIVE PDF EXTRACTION WITH DYNAMIC IMPORT ============

export async function extractTextFromPDFSimple(fileBuffer: Buffer): Promise<string> {
  try {
    // Use require instead of dynamic import for better compatibility
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    console.error("Simple PDF extraction error:", error);
    throw error;
  }
}

// ============ DOCX EXTRACTION ============

export async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    // Try dynamic import first
    try {
      const mammothModule = await import('mammoth');
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      
      if (result.value && result.value.trim().length > 0) {
        return result.value;
      }
    } catch (importError) {
      console.warn("Dynamic import failed, trying require:", importError);
    }

    // Fallback to require
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

// ============ ALTERNATIVE: SIMPLE TEXT EXTRACTION ============

// If PDF parsing continues to fail, you can use this simpler function
// that just returns the buffer as a string (only works for text-based files)
export function extractTextFromBuffer(fileBuffer: Buffer, mimeType: string): string {
  // Only for text-based files
  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'application/json') {
    return fileBuffer.toString('utf-8');
  }
  
  throw new Error(`Cannot extract text from ${mimeType} files. Please upload a PDF or DOCX file.`);
}