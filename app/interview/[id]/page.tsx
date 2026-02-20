"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getInterviewById } from "@/lib/actions/interview.action";
import { getApplicationById, updateApplication } from "@/lib/actions/application.action";
import { createFeedback } from "@/lib/actions/interview.action";
import { Interview } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send } from "lucide-react";
import { toast } from "sonner";

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadInterview();
      }
    });
    return () => unsubscribe();
  }, [router, interviewId]);

  const loadInterview = async () => {
    setLoading(true);
    const interviewData = await getInterviewById(interviewId);
    if (interviewData) {
      setInterview(interviewData);
      setAnswers(new Array(interviewData.questions.length).fill(""));
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (!interview) return;

    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = currentAnswer;
    setAnswers(updatedAnswers);
    setCurrentAnswer("");

    if (currentQuestion < interview.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer(updatedAnswers[currentQuestion + 1] || "");
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const updatedAnswers = [...answers];
      updatedAnswers[currentQuestion] = currentAnswer;
      setAnswers(updatedAnswers);
      
      setCurrentQuestion(currentQuestion - 1);
      setCurrentAnswer(updatedAnswers[currentQuestion - 1] || "");
    }
  };

  const handleSubmit = async () => {
    if (!interview) return;

    // Save current answer
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestion] = currentAnswer;

    // Check if all questions answered
    if (updatedAnswers.some((a) => !a.trim())) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setSubmitting(true);
    try {
      // Create transcript
      const transcript = interview.questions.map((q, i) => [
        { role: "interviewer", content: q },
        { role: "candidate", content: updatedAnswers[i] },
      ]).flat();

      // Generate feedback with AI
      const feedbackResult = await createFeedback({
        interviewId,
        applicationId: interview.applicationId,
        userId: interview.userId,
        transcript,
      });

      if (feedbackResult.success) {
        // Update application interview status
        await updateApplication(interview.applicationId, {
          interviewStatus: "completed",
        });

        toast.success("Interview completed! Generating feedback...");
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        toast.error("Failed to submit interview");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit interview");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecording = () => {
    // Mock voice recording
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.info("Voice recording is mocked. Please type your answer.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">Loading interview...</div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p>Interview not found</p>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / interview.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="interview-title">AI Interview: {interview.role}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge>{interview.level}</Badge>
                  <Badge variant="outline">{interview.type}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Question {currentQuestion + 1} of {interview.questions.length}</p>
                <Progress value={progress} className="w-32 mt-2" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-2">
              {interview.techstack.map((tech, idx) => (
                <Badge key={idx} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Question {currentQuestion + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-800 mb-6" data-testid="current-question">
              {interview.questions[currentQuestion]}
            </p>

            {/* Answer Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Your Answer:</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleRecording}
                  className="gap-2"
                  data-testid="toggle-recording-button"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 text-red-600" />
                      Stop (Mocked)
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Voice (Mocked)
                    </>
                  )}
                </Button>
              </div>

              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={8}
                data-testid="answer-input"
              />

              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
                <p><strong>Note:</strong> Voice recording via VAPI is mocked. Please type your answers. In production, this would be a real-time AI voice interview.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            data-testid="previous-button"
          >
            Previous
          </Button>

          {currentQuestion === interview.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !currentAnswer.trim()}
              className="gap-2"
              data-testid="submit-interview-button"
            >
              {submitting ? "Submitting..." : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Interview
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              data-testid="next-button"
            >
              Next Question
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {interview.questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-8 rounded-full ${
                idx < currentQuestion
                  ? "bg-green-500"
                  : idx === currentQuestion
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
