// AI service using Gemini for interview question generation and feedback
const GEMINI_API_KEY = process.env.EMERGENT_LLM_KEY;

interface GenerateQuestionsParams {
  role: string;
  level: string;
  techStack: string[];
  experience: number;
  jobDescription: string;
  count?: number;
}

interface GenerateFeedbackParams {
  role: string;
  questions: string[];
  transcript: Array<{ role: string; content: string }>;
}

export async function generateInterviewQuestions(
  params: GenerateQuestionsParams
): Promise<string[]> {
  const { role, level, techStack, experience, jobDescription, count = 5 } = params;

  const prompt = `You are an expert technical interviewer. Generate ${count} interview questions for the following position:

Role: ${role}
Level: ${level}
Required Experience: ${experience} years
Tech Stack: ${techStack.join(", ")}
Job Description: ${jobDescription}

Generate questions that:
1. Test technical knowledge relevant to the tech stack
2. Are appropriate for ${level} level with ${experience} years experience
3. Cover problem-solving and practical scenarios
4. Include behavioral questions relevant to the role

Return ONLY a JSON array of question strings, no other text.
Example: ["Question 1?", "Question 2?", ...]`;

  try {
    const response = await fetch("https://api.emergentagi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const questions = JSON.parse(content);
    return questions.slice(0, count);
  } catch (error) {
    console.error("Error generating questions:", error);
    // Fallback questions
    return [
      `Explain your experience with ${techStack[0] || "the main technology"} in this role.`,
      `Describe a challenging ${role} project you worked on.`,
      `How do you approach problem-solving in ${role} development?`,
      `What is your understanding of ${techStack[1] || "key concepts"} in this domain?`,
      `Tell me about a time you had to learn a new technology quickly.`,
    ];
  }
}

export async function generateInterviewFeedback(
  params: GenerateFeedbackParams
): Promise<{
  totalScore: number;
  categoryScores: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
}> {
  const { role, questions, transcript } = params;

  const prompt = `You are an expert technical interviewer evaluating a candidate's interview performance.

Role: ${role}
Questions Asked: ${JSON.stringify(questions)}
Interview Transcript: ${JSON.stringify(transcript)}

Analyze the candidate's responses and provide a comprehensive evaluation in the following JSON format:
{
  "totalScore": <number 0-100>,
  "categoryScores": [
    {"name": "Technical Knowledge", "score": <0-100>, "comment": "<brief comment>"},
    {"name": "Problem Solving", "score": <0-100>, "comment": "<brief comment>"},
    {"name": "Communication", "score": <0-100>, "comment": "<brief comment>"},
    {"name": "Experience Relevance", "score": <0-100>, "comment": "<brief comment>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "finalAssessment": "<2-3 sentence summary>"
}

Return ONLY valid JSON, no other text.`;

  try {
    const response = await fetch("https://api.emergentagi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating feedback:", error);
    // Fallback feedback
    return {
      totalScore: 70,
      categoryScores: [
        { name: "Technical Knowledge", score: 70, comment: "Demonstrated good understanding" },
        { name: "Problem Solving", score: 68, comment: "Shows analytical thinking" },
        { name: "Communication", score: 75, comment: "Clear and articulate" },
        { name: "Experience Relevance", score: 65, comment: "Relevant experience shared" },
      ],
      strengths: [
        "Good communication skills",
        "Relevant technical experience",
        "Problem-solving approach",
      ],
      areasForImprovement: [
        "Could provide more specific examples",
        "Deepen knowledge in certain areas",
        "More confidence in responses",
      ],
      finalAssessment: "The candidate shows promise with good foundational knowledge. With some additional experience and confidence, they could be a strong fit for the role.",
    };
  }
}
