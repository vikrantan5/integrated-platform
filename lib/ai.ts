import Groq from "groq-sdk";
import { feedbackSchema } from "./constants";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============ INTERVIEW QUESTION GENERATION WITH GROQ ============

export async function generateInterviewQuestions({
  role,
  level,
  techStack,
  experience,
  jobDescription,
  count,
}: {
  role: string;
  level: string;
  techStack: string[];
  experience: string;
  jobDescription: string;
  count: number;
}): Promise<string[]> {
  try {
    const prompt = `Generate ${count} technical interview questions for the following role:
    
Role: ${role}
Level: ${level}
Tech Stack: ${techStack.join(", ")}
Experience Required: ${experience} years
Job Description: ${jobDescription}

Generate practical, role-specific questions that assess both technical knowledge and problem-solving abilities.
Return ONLY the questions, one per line, numbered from 1 to ${count}.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert technical interviewer. Generate clear, practical interview questions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content || "";

    // FIXED: Proper regex for parsing numbered questions
    const questionLines = text
      .split('\n') // Split by newlines
      .filter((line) => {
        const trimmed = line.trim();
        // Check if line starts with a number followed by a dot or parenthesis
        return trimmed.length > 0 && /^\d+[\.\)]/.test(trimmed);
      })
      .map((line) => {
        // Remove the numbering (e.g., "1. ", "2) ", etc.)
        return line.replace(/^\d+[\.\)]\s*/, "").trim();
      })
      .slice(0, count);

    // If we didn't get enough questions, return default ones
    if (questionLines.length >= count) {
      return questionLines;
    } else {
      console.warn(`Only got ${questionLines.length} questions, using defaults for the rest`);
      const defaultQuestions = [
        "Tell me about your experience with this tech stack.",
        "Describe a challenging project you worked on.",
        "How do you approach problem-solving?",
        "What are your strengths and areas for improvement?",
        "Why are you interested in this role?",
      ];
      
      // Combine generated questions with defaults if needed
      return [...questionLines, ...defaultQuestions].slice(0, count);
    }
  } catch (error) {
    console.error("Error generating interview questions with Groq:", error);
    // Return default questions on error
    return [
      "Tell me about your experience with this tech stack.",
      "Describe a challenging project you worked on.",
      "How do you approach problem-solving?",
      "What are your strengths and areas for improvement?",
      "Why are you interested in this role?",
    ].slice(0, count);
  }
}

// ============ INTERVIEW FEEDBACK GENERATION WITH GROQ ============

export async function generateInterviewFeedback({
  role,
  questions,
  transcript,
}: {
  role: string;
  questions: string[];
  transcript: any[];
}) {
  try {
    const formattedTranscript = JSON.stringify(transcript, null, 2);

    const prompt = `You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        
Role: ${role}
Questions: ${JSON.stringify(questions)}
Transcript:
${formattedTranscript}

Please score the candidate from 0 to 100 in the following areas and return ONLY a valid JSON object with this exact structure:
{
  "totalScore": <number 0-100>,
  "categoryScores": {
    "communicationSkills": <number 0-100>,
    "technicalKnowledge": <number 0-100>,
    "problemSolving": <number 0-100>,
    "culturalFit": <number 0-100>,
    "confidenceClarity": <number 0-100>
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["improvement 1", "improvement 2", "improvement 3"],
  "finalAssessment": "<detailed final assessment paragraph>"
}

Category definitions:
- **communicationSkills**: Clarity, articulation, structured responses.
- **technicalKnowledge**: Understanding of key concepts for the role.
- **problemSolving**: Ability to analyze problems and propose solutions.
- **culturalFit**: Alignment with company values and job role.
- **confidenceClarity**: Confidence in responses, engagement, and clarity.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a professional interviewer analyzing a mock interview. Return ONLY valid JSON, no additional text or markdown formatting.",
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
    const analysis = JSON.parse(responseText);

    // Validate and ensure all fields exist
    const feedback = {
      totalScore: analysis.totalScore || 0,
      categoryScores: {
        communicationSkills: analysis.categoryScores?.communicationSkills || 0,
        technicalKnowledge: analysis.categoryScores?.technicalKnowledge || 0,
        problemSolving: analysis.categoryScores?.problemSolving || 0,
        culturalFit: analysis.categoryScores?.culturalFit || 0,
        confidenceClarity: analysis.categoryScores?.confidenceClarity || 0,
      },
      strengths: analysis.strengths || [],
      areasForImprovement: analysis.areasForImprovement || [],
      finalAssessment: analysis.finalAssessment || "No assessment available.",
    };

    return feedback;
  } catch (error) {
    console.error("Error generating feedback with Groq:", error);
    throw error;
  }
}