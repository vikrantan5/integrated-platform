"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getInterviewById, createFeedback } from "@/lib/actions/interview.action";
import { updateApplication } from "@/lib/actions/application.action";
import { Interview } from "@/types";
import Navbar from "@/components/Navbar";
import VoiceAgent from "@/components/VoiceAgent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Keyboard, Send, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type InterviewMode = "voice" | "text";

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<InterviewMode>("voice");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  // Text mode states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setUserName(user.displayName || "User");
        setUserId(user.uid);
        await loadInterview();
      }
    });
    return () => unsubscribe();
  }, [router, interviewId]);

  const loadInterview = async () => {
    setLoading(true);
    try {
      const interviewData = await getInterviewById(interviewId);
      if (interviewData) {
        setInterview(interviewData);
        setAnswers(new Array(interviewData.questions.length).fill(""));
      }
    } catch (error) {
      console.error("Error loading interview:", error);
      toast.error("Failed to load interview");
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading interview...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Interview not found</p>
          <Button onClick={() => router.push("/jobseeker/applications")} className="mt-4">
            Back to Applications
          </Button>
        </div>
      </div>
    );
  }

  const progress = mode === "text" ? ((currentQuestion + 1) / interview.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-2 border-blue-100">
          <CardHeader>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2" data-testid="interview-title">
                  AI Mock Interview: {interview.role}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-600">{interview.level}</Badge>
                  <Badge variant="outline">{interview.type}</Badge>
                  {interview.techstack.map((tech, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {mode === "text" && (
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">
                    Question {currentQuestion + 1} of {interview.questions.length}
                  </p>
                  <Progress value={progress} className="w-32" />
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Mode Selection */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <p className="text-sm text-gray-600 font-medium">Choose Interview Mode:</p>
              <div className="flex gap-3">
                <Button
                  variant={mode === "voice" ? "default" : "outline"}
                  onClick={() => setMode("voice")}
                  className={`gap-2 ${mode === "voice" ? "bg-gradient-to-r from-blue-600 to-purple-600" : ""}`}
                  data-testid="voice-mode-button"
                >
                  <Mic className="h-4 w-4" />
                  Voice Interview (Recommended)
                </Button>
                <Button
                  variant={mode === "text" ? "default" : "outline"}
                  onClick={() => setMode("text")}
                  className="gap-2"
                  data-testid="text-mode-button"
                >
                  <Keyboard className="h-4 w-4" />
                  Text Interview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Content */}
        {mode === "voice" ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <VoiceAgent
                userName={userName}
                userId={userId}
                interviewId={interviewId}
                applicationId={interview.applicationId}
                questions={interview.questions}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Text Mode - Question Card */}
            <Card className="mb-6 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="text-lg">Question {currentQuestion + 1}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-lg text-gray-800 mb-6 leading-relaxed" data-testid="current-question">
                  {interview.questions[currentQuestion]}
                </p>

                {/* Answer Input */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">Your Answer:</label>
                  
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={10}
                    className="text-base"
                    data-testid="answer-input"
                  />

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                    <p>
                      <strong>💡 Tip:</strong> For a more immersive experience, try Voice Interview mode! 
                      It provides real-time AI conversation and better simulates actual interview conditions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="gap-2"
                data-testid="previous-button"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentQuestion === interview.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !currentAnswer.trim()}
                  className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  data-testid="submit-interview-button"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
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
                  className="gap-2"
                  data-testid="next-button"
                >
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2">
              {interview.questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-8 rounded-full transition-all ${
                    idx < currentQuestion
                      ? "bg-green-500"
                      : idx === currentQuestion
                      ? "bg-blue-500 w-12"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}