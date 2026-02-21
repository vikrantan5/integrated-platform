import { generateObject } from "ai";
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
      model: google("gemini-2.0-flash-001"),
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
  techStack,
  experience,
}: {
  role: string;
  techStack: string[];
  experience: string;
}) {
  // Your questions generation logic here
  // This is just a placeholder - implement as needed
  return [];
}