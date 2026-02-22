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

// ============ IMPROVED PDF EXTRACTION WITH PDF2JSON PRIMARY =

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
 // Try pdf2json first (more reliable in Node.js environment)
  try {
    const PDFParser = require('pdf2json');
    const pdfParser = new PDFParser();
    
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let text = '';
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && textItem.R[0] && textItem.R[0].T) {
                    // Decode URI component
                    text += decodeURIComponent(textItem.R[0].T) + ' ';
                  }
                });
              }
              text += '';
            });
          }
          
          if (!text || text.trim().length === 0) {
            reject(new Error("No text content found in PDF"));
          } else {
            resolve(text.trim());
          }
        } catch (parseError) {
          reject(parseError);
        }
      });
      
      pdfParser.on('pdfParser_dataError', (error: any) => {
        reject(new Error(`PDF parsing error: ${error.parserError}`));
      });
    
      // Parse the buffer
      pdfParser.parseBuffer(fileBuffer);
    });
  } catch (pdf2jsonError) {
    console.warn("pdf2json failed, trying pdf-parse as fallback:", pdf2jsonError);
    
    // Fallback to pdf-parse
    try {
      const pdfParse = require('pdf-parse');
    const data = await pdfParse(fileBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }
    
    return data.text;
        } catch (pdfParseError) {
      console.error("Both PDF extraction methods failed:", pdfParseError);

      throw new Error(
         "Unable to extract text from PDF. Please ensure the PDF contains selectable text (not scanned images). Try converting to DOCX format."
      );
    }
    
  
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

