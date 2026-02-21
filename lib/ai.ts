import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { feedbackSchema } from "./constants";

// Export the function
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
    
    const { object } = await generateObject({
      // ✅ FIXED: Use Gemini 1.5 Flash which is v2 compatible
      model: google("gemini-1.5-flash"),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        
        Role: ${role}
        Questions: ${JSON.stringify(questions)}
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
      `,
      system: "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
      experimental_telemetry: { isEnabled: false },
    });
    
    return object;
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw error;
  }
}

// Also export generateInterviewQuestions if you need it
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
    // ✅ FIXED: Use Gemini 1.5 Flash here too
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `Generate ${count} technical interview questions for the following role:
    
    Role: ${role}
    Level: ${level}
    Tech Stack: ${techStack.join(", ")}
    Experience Required: ${experience} years
    Job Description: ${jobDescription}
    
    Generate practical, role-specific questions that assess both technical knowledge and problem-solving abilities.
    Return ONLY the questions, one per line, numbered from 1 to ${count}.`,
      experimental_telemetry: { isEnabled: false },
    });

    // Parse questions from the response
    const questionLines = text
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0 && /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, count);

    return questionLines.length >= count ? questionLines : [
      "Tell me about your experience with this tech stack.",
      "Describe a challenging project you worked on.",
      "How do you approach problem-solving?",
      "What are your strengths and areas for improvement?",
      "Why are you interested in this role?"
    ];
  } catch (error) {
    console.error("Error generating interview questions:", error);
    // Return default questions on error
    return [
      "Tell me about your experience with this tech stack.",
      "Describe a challenging project you worked on.",
      "How do you approach problem-solving?",
      "What are your strengths and areas for improvement?",
      "Why are you interested in this role?"
    ];
  }
}