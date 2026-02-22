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
  // New fields for enhanced analysis
  recommendedSkills?: Array<{
    skill: string;
    importance: "Critical" | "Recommended" | "Nice to have";
    reason: string;
  }>;
  contentSuggestions?: Array<{
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }>;
  formatIssues?: string[];
  missingSections?: string[];
  isValidResume: boolean;
  validationMessage?: string;
}

export async function analyzeResumeWithAI(
  resumeText: string,
  jobDescription?: string,
  jobCategory?: string,
  jobRole?: string
): Promise<ResumeAnalysisResult> {
  try {
    // First, validate if the uploaded content is actually a resume
    const validationPrompt = `
    You are a resume validation expert. Analyze the following text and determine if it's a valid resume/CV.
    
    **Content to validate:**
    "${resumeText.substring(0, 1000)}"  // First 1000 chars for quick validation
    
    Respond with a JSON object:
    {
      "isValidResume": boolean,
      "validationMessage": "If invalid, explain why. If valid, leave empty or provide a brief confirmation."
    }
    
    Consider these criteria for a valid resume:
    1. Contains personal/contact information (name, email, phone)
    2. Has sections like education, experience, or skills
    3. Includes professional history or educational background
    4. Is not random text, code, or unrelated content
    5. Is not a scanned image without extractable text
    `;

    // Quick validation check
    const validationCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a resume validation expert. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: validationPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const validationResponse = JSON.parse(validationCompletion.choices[0]?.message?.content || "{}");
    
    // If not a valid resume, return early with error
    if (!validationResponse.isValidResume) {
      return {
        overallScore: 0,
        categoryScores: [],
        strengths: [],
        improvements: ["Please upload a valid resume/CV file"],
        keywords: { found: [], missing: [] },
        atsCompatibility: "Poor",
        isValidResume: false,
        validationMessage: validationResponse.validationMessage || "The uploaded file does not appear to be a valid resume. Please upload a proper resume/CV with your work experience, education, and skills."
      };
    }

    // Build role-specific context
    const roleContext = jobCategory && jobRole
      ? `
**Target Role:** ${jobRole} in ${jobCategory}
**Role Expectations:** 
- Analyze this resume specifically for the ${jobRole} position in the ${jobCategory} field
- Identify skills that are CRITICAL for this role but missing from the resume
- Suggest industry-standard skills and certifications for this role
- Compare experience level against typical requirements for this position`
      : "";

    const prompt = jobDescription
      ? `You are an expert ATS (Applicant Tracking System) resume analyzer and career coach. Analyze the following resume against the job description and provide comprehensive, actionable feedback.

**Resume:**
${resumeText}

**Job Description:**
${jobDescription}${roleContext}

**CRITICAL REQUIREMENTS FOR ANALYSIS:**

1. **VALIDATION CHECK** - Confirm this is a resume and not random text

2. **EDUCATION EXTRACTION** - You MUST carefully extract and analyze:
   - Degree/Diploma names (Bachelor's, Master's, PhD, etc.)
   - Institution/University/College names
   - Graduation years or date ranges
   - Field of study/Major
   - GPA or grades if mentioned
   - Certifications and additional training
   If education section is missing or unclear, note this as a critical improvement.

3. **SKILLS GAP ANALYSIS** - For the target role, identify:
   - CRITICAL skills missing that are essential for the role
   - RECOMMENDED skills that would strengthen the application
   - NICE-TO-HAVE skills that could provide competitive advantage
   - Outdated skills that should be replaced or updated
   - Industry-specific tools and technologies commonly used in this role

4. **CONTENT IMPROVEMENT SUGGESTIONS** - For each major section:
   - Work Experience: Suggest stronger action verbs and quantifiable achievements
   - Education: Format improvements and relevant coursework suggestions
   - Skills: Better organization and categorization
   - Summary/Objective: Tailored opening statement for the target role
   - Projects: Additional relevant projects to showcase

5. **FORMAT & STRUCTURE ANALYSIS**:
   - Identify ATS compatibility issues
   - Suggest better section organization
   - Point out formatting inconsistencies
   - Recommend length adjustments
   - Check for proper contact information

6. **ACHIEVEMENT ENHANCEMENT**:
   - Convert responsibilities into achievements
   - Add metrics and quantifiable results where missing
   - Suggest better action verbs
   - Identify vague descriptions that need strengthening

**⚠️ CRITICAL: KEYWORD EXTRACTION IS MANDATORY ⚠️**
You MUST populate the "keywords" field with:
- **found**: Extract at least 5-10 specific keywords/skills/technologies that appear in the resume (e.g., "JavaScript", "Project Management", "Python", "React", "AWS", "Agile", "Leadership")
- **missing**: If job description is provided, identify at least 5-8 critical keywords from the job description that are NOT in the resume. If no job description, identify industry-standard keywords for the role that are missing.

The "Keywords" category score (0-100) should be calculated based on:
- 0-20: Very few relevant keywords found
- 21-40: Some keywords but missing many critical ones
- 41-60: Average keyword optimization
- 61-80: Good keyword coverage
- 81-100: Excellent keyword optimization with all critical terms present

Provide a comprehensive analysis in the following JSON format:

{
  "overallScore": <number 0-100>,
  "categoryScores": [
    {
      "category": "Experience & Achievements",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about work experience, with specific suggestions for improvement>"
    },
    {
      "category": "Education & Certifications",
      "score": <number 0-100>,
      "feedback": "<MUST extract and mention specific degrees, institutions. Suggest relevant certifications>"
    },
    {
      "category": "Skills Match & Relevance",
      "score": <number 0-100>,
      "feedback": "<detailed analysis of technical and soft skills, with gap analysis>"
    },
    {
      "category": "Keywords & ATS Optimization",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about keyword usage. MUST mention specific keywords found and missing. Explain how keywords affect ATS scoring>"
    },
    {
      "category": "Format & ATS Compatibility",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about formatting, structure, and ATS optimization>"
    }
  ],
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3", "specific strength 4", "specific strength 5"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3", "specific improvement 4", "specific improvement 5"],
  "keywords": {
    "found": ["JavaScript", "React", "Node.js", "Python", "AWS", "MongoDB", "Git", "Agile", "Leadership", "Communication"], // EXAMPLE - REPLACE WITH ACTUAL EXTRACTED KEYWORDS
    "missing": ["Docker", "Kubernetes", "TypeScript", "GraphQL", "CI/CD", "Terraform", "Microservices"] // EXAMPLE - REPLACE WITH ACTUAL MISSING KEYWORDS
  },
  "atsCompatibility": "Excellent" | "Good" | "Fair" | "Poor",
  "recommendedSkills": [
    {
      "skill": "Skill Name",
      "importance": "Critical" | "Recommended" | "Nice to have",
      "reason": "Why this skill is important for the role"
    }
  ],
  "contentSuggestions": [
    {
      "section": "Experience" | "Education" | "Skills" | "Summary" | "Projects",
      "original": "Original text (if available)",
      "suggested": "Improved version with explanation",
      "reason": "Why this change would improve the resume"
    }
  ],
  "formatIssues": ["specific formatting issue 1", "specific formatting issue 2"],
  "missingSections": ["missing section 1", "missing section 2"],
  "isValidResume": true,
  "validationMessage": ""
}

**IMPORTANT GUIDELINES:**
- Be SPECIFIC and ACTIONABLE in all feedback
- Provide BEFORE/AFTER examples for content improvements
- For missing critical skills, explain WHY they're important and HOW to acquire/mention them
- Suggest certifications, courses, or projects to fill skill gaps
- Highlight any red flags or major issues
- Consider industry standards and current hiring trends
- Provide realistic expectations based on experience level
- **KEYWORD SECTION MUST BE POPULATED** - Do not leave empty arrays. Always include at least 5 found keywords and 5 missing keywords when applicable.

Be thorough and specific. This analysis will be used by job seekers to improve their resumes.`
      : `You are an expert ATS (Applicant Tracking System) resume analyzer and career coach. Analyze the following resume${roleContext ? ` for a ${jobRole} position in ${jobCategory}` : ' for general job applications'}.

**Resume:**
${resumeText}${roleContext}

**CRITICAL REQUIREMENTS FOR ANALYSIS:**

1. **VALIDATION CHECK** - Confirm this is a valid resume

2. **EDUCATION EXTRACTION** - You MUST carefully extract and analyze:
   - Degree/Diploma names
   - Institution names  
   - Graduation years
   - Field of study
   - Missing educational elements

3. **SKILLS ASSESSMENT** - For the target industry:
   - Identify missing in-demand skills
   - Suggest relevant certifications
   - Recommend skill upgrades

4. **CONTENT IMPROVEMENTS**:
   - Suggest stronger action verbs
   - Recommend adding metrics
   - Improve vague descriptions
   - Add missing important sections

5. **FORMAT ANALYSIS**:
   - ATS compatibility check
   - Structure improvements
   - Length optimization

**⚠️ CRITICAL: KEYWORD EXTRACTION IS MANDATORY ⚠️**
You MUST populate the "keywords" field with:
- **found**: Extract at least 5-10 specific keywords/skills/technologies that appear in the resume (e.g., "JavaScript", "Project Management", "Python")
- **missing**: Based on the target role/industry, identify at least 5-8 critical keywords that are NOT in the resume

Provide a comprehensive analysis in the following JSON format:

{
  "overallScore": <number 0-100>,
  "categoryScores": [
    {
      "category": "Experience",
      "score": <number 0-100>,
      "feedback": "<detailed feedback with specific improvement suggestions>"
    },
    {
      "category": "Education",
      "score": <number 0-100>,
      "feedback": "<MUST extract specific degrees/institutions. Suggest additional certifications>"
    },
    {
      "category": "Skills",
      "score": <number 0-100>,
      "feedback": "<detailed analysis with missing skills identified>"
    },
    {
      "category": "Keywords & ATS Optimization",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about keyword usage. MUST list specific keywords found and missing>"
    },
    {
      "category": "Formatting",
      "score": <number 0-100>,
      "feedback": "<detailed feedback about format and ATS compatibility>"
    }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4", "strength 5"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"],
  "keywords": {
    "found": ["JavaScript", "React", "Python", "Project Management", "Leadership", "AWS", "Git"], // EXAMPLE - REPLACE WITH ACTUAL EXTRACTED KEYWORDS
    "missing": ["Docker", "TypeScript", "GraphQL", "CI/CD", "Terraform", "Agile", "Microservices"] // EXAMPLE - REPLACE WITH ACTUAL MISSING KEYWORDS
  },
  "atsCompatibility": "Excellent" | "Good" | "Fair" | "Poor",
  "recommendedSkills": [
    {
      "skill": "Skill Name",
      "importance": "Critical" | "Recommended" | "Nice to have",
      "reason": "Why this skill is valuable"
    }
  ],
  "contentSuggestions": [
    {
      "section": "Experience" | "Education" | "Skills" | "Summary" | "Projects",
      "original": "Original text (if available)",
      "suggested": "Improved version",
      "reason": "Why this change improves the resume"
    }
  ],
  "formatIssues": ["formatting issue 1", "formatting issue 2"],
  "missingSections": ["missing section 1", "missing section 2"],
  "isValidResume": true,
  "validationMessage": ""
}

**IMPORTANT GUIDELINES:**
- Be thorough and specific
- **KEYWORD SECTION MUST BE POPULATED** - Do not leave empty arrays
- Always include multiple keywords in both found and missing arrays
- The more specific the keywords, the better

Provide actionable feedback that helps the candidate immediately improve their resume.`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert ATS resume analyzer and career coach. Always respond with valid JSON only, no additional text or markdown formatting. Your feedback should be specific, actionable, and helpful for job seekers. CRITICAL: You MUST populate the keywords.found and keywords.missing arrays with actual keywords - never leave them empty.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    const analysis: ResumeAnalysisResult = JSON.parse(responseText);

    // Validate and ensure all fields exist with proper defaults
    return {
      overallScore: analysis.overallScore || 0,
      categoryScores: analysis.categoryScores || [],
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      keywords: {
        found: analysis.keywords?.found?.length ? analysis.keywords.found : ["No keywords detected - analysis issue"],
        missing: analysis.keywords?.missing?.length ? analysis.keywords.missing : ["Unable to identify missing keywords"],
      },
      atsCompatibility: analysis.atsCompatibility || "Fair",
      recommendedSkills: analysis.recommendedSkills || [],
      contentSuggestions: analysis.contentSuggestions || [],
      formatIssues: analysis.formatIssues || [],
      missingSections: analysis.missingSections || [],
      isValidResume: true,
      validationMessage: analysis.validationMessage || "",
    };
  } catch (error) {
    console.error("Error analyzing resume with Groq AI:", error);
    
    return {
      overallScore: 0,
      categoryScores: [],
      strengths: [],
      improvements: ["Unable to analyze resume due to a technical error. Please try again."],
      keywords: { 
        found: ["Error in analysis"], 
        missing: ["Please try again"] 
      },
      atsCompatibility: "Poor",
      recommendedSkills: [],
      contentSuggestions: [],
      formatIssues: ["Analysis failed due to technical error"],
      missingSections: [],
      isValidResume: false,
      validationMessage: "We encountered an error while analyzing your resume. This could be due to the file format or content. Please ensure you're uploading a valid resume and try again."
    };
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
    // Dynamic import to avoid issues if mammoth is not installed
    let mammoth;
    try {
      mammoth = require('mammoth');
    } catch (e) {
      console.error("Mammoth library not installed. Please run: npm install mammoth");
      throw new Error("DOCX extraction library not available. Please install mammoth.");
    }
    
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

// Also export a helper function to detect file type and extract accordingly
export async function extractTextFromFile(
  fileBuffer: Buffer, 
  fileType: string
): Promise<string> {
  if (fileType === 'application/pdf') {
    return extractTextFromPDF(fileBuffer);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    fileType === '.docx' ||
    fileType === '.doc'
  ) {
    return extractTextFromDOCX(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Please upload PDF or DOCX files.`);
  }
}