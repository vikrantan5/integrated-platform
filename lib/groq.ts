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
  jobDescription?: string,
  jobCategory?: string,
  jobRole?: string
): Promise<ResumeAnalysisResult> {
  try {
      // Build role-specific context
    const roleContext = jobCategory && jobRole
      ? `
**Target Role:** ${jobRole} in ${jobCategory}
Analyze this resume specifically for the ${jobRole} position in the ${jobCategory} field. Focus on relevant skills, experience, and education for this specific role.`
      : "";

    const prompt = jobDescription
      ? `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume against the job description and provide detailed feedback.

**Resume:**
${resumeText}

**Job Description:**
${jobDescription}${roleContext}

**CRITICAL: Education Extraction**
You MUST carefully extract and analyze education information from the resume. Look for:
- Degree/Diploma names (Bachelor's, Master's, PhD, etc.)
- Institution/University/College names
- Graduation years or date ranges
- Field of study/Major
- GPA or grades if mentioned
If education section is missing or unclear, note this in the feedback.


Provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
    "categoryScores": [
    {
      "category": "Experience Description",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about work experience, achievements, and relevance>"
    },
    {
      "category": "Education",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about education - degree, institution, relevance to role. MUST mention specific degrees and universities found>"
    },
    {
      "category": "Skills Relevance",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about technical and soft skills>"
    },
    {
      "category": "Keyword Optimization",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about keyword usage and ATS optimization>"
    },
    {
      "category": "Format & Structure",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about resume formatting and structure>"
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
      : `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume${roleContext ? ` for a ${jobRole} position in ${jobCategory}` : ' for general job applications'}.

**Resume:**
${resumeText}${roleContext}

**CRITICAL: Education Extraction**
You MUST carefully extract and analyze education information from the resume. Look for:
- Degree/Diploma names (Bachelor's, Master's, PhD, etc.)
- Institution/University/College names
- Graduation years or date ranges
- Field of study/Major
- GPA or grades if mentioned
If education section is missing or unclear, note this in the feedback.

Provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "categoryScores": [
    {
      "category": "Experience",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about work experience, achievements, relevance>"
    },
    {
      "category": "Education",
      "score": <number 0-100>,
      "feedback": "<MUST extract and mention: degree name, institution, graduation year if found. Comment on education relevance to the role>"
    },
    {
      "category": "Skills",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about technical and soft skills>"
    },
    {
      "category": "Keywords",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about keyword optimization>"
    },
    {
      "category": "Formatting",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about format and ATS compatibility>"
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

// ============ PRODUCTION SAFE PDF EXTRACTION ============

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  console.log("🔍 Starting PDF extraction...");
  console.log("  - Buffer length:", fileBuffer?.length);

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("Invalid file buffer");
  }

  if (fileBuffer.length === 0) {
    throw new Error("Empty PDF buffer");
  }

  // ---------- SAFE TEXT DECODER ----------
  function safeDecodePDFText(str: string) {
    if (!str) return "";

    try {
      return decodeURIComponent(str);
    } catch {
      try {
        // fix broken % encodings
        return decodeURIComponent(str.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
      } catch {
        return str; // fallback raw
      }
    }
  }

  // =====================================================
  // TRY PDF2JSON FIRST
  // =====================================================
  try {
    const PDFParser = require("pdf2json");
    const pdfParser = new PDFParser();

    const text: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (err: any) => {
        reject(err);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let extractedText = "";

          pdfData?.Pages?.forEach((page: any) => {
            page?.Texts?.forEach((item: any) => {
              const raw = item?.R?.[0]?.T;
              if (raw) {
                extractedText += safeDecodePDFText(raw) + " ";
              }
            });
          });

          if (!extractedText.trim()) {
            reject(new Error("No selectable text found"));
            return;
          }

          resolve(extractedText);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.parseBuffer(fileBuffer);
    });

    console.log("✅ pdf2json success");
    console.log("  - Text length:", text.length);

    return text.trim();

  } catch (pdf2jsonError) {
    console.warn("⚠️ pdf2json failed → using pdf-parse fallback");
    console.warn(pdf2jsonError);
  }

  // =====================================================
  // FALLBACK → PDF-PARSE (VERY RELIABLE)
  // =====================================================
  try {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(fileBuffer);

    if (!result.text || !result.text.trim()) {
      throw new Error("No text found in PDF");
    }

    console.log("✅ pdf-parse success");
    console.log("  - Text length:", result.text.length);

    return result.text.trim();

  } catch (fallbackError) {
    console.error("❌ All PDF extraction methods failed");
    console.error(fallbackError);

    throw new Error(
      "Unable to extract text from PDF. The file may be scanned (image-based) or corrupted."
    );
  }
}

// ============ IMPROVED DOCX EXTRACTION ============



export async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
  
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
      if (!result.value || result.value.trim().length === 0) {
      throw new Error("No text content found in DOCX file");
    }
    
    return result.value.trim();
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
     throw new Error(
      "Unable to extract text from DOCX file. Please ensure the file is not corrupted."
    );
  }
}

