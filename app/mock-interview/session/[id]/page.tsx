"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getInterviewById, createFeedback } from "@/lib/actions/interview.action";
import { Interview } from "@/types";
import Navbar from "@/components/Navbar";
import VoiceAgent from "@/components/VoiceAgent";
import BeyondPresenceAvatar from "@/components/BeyondPresenceAvatar";
import UserWebcam from "@/components/UserWebcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Keyboard, Send, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSessionManager } from "@/lib/sessionManager";

type InterviewMode = "voice" | "text";

export default function MockInterviewSession() {
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

   // Avatar states for Beyond Presence
  // Use unified session manager for video + voice sync
  const sessionManager = useSessionManager({
    onSessionStart: () => {
      console.log("✅ Interview session started - both video and voice ready");
      toast.success("Interview session active!");
    },
    onSessionEnd: () => {
      console.log("Session ended");
    },
    onError: (error) => {
      console.error("Session error:", error);
      toast.error(`Session error: ${error.message}`);
    },
  });
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
      const transcript = interview.questions
        .map((q, i) => [
          { role: "interviewer", content: q },
          { role: "candidate", content: updatedAnswers[i] },
        ])
        .flat();

      // Generate feedback with AI
      const feedbackResult = await createFeedback({
        interviewId,
        applicationId: interview.applicationId,
        userId: interview.userId,
        transcript,
      });

      if (feedbackResult.success) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading interview...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-300">Interview not found</p>
          <Button onClick={() => router.push("/jobseeker/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const progress = mode === "text" ? ((currentQuestion + 1) / interview.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white" data-testid="interview-title">
              AI Mock Interview: {interview.role}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className="bg-blue-600">{interview.level}</Badge>
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              {interview.type}
            </Badge>
            {interview.techstack.map((tech, idx) => (
              <Badge key={idx} variant="secondary" className="bg-gray-700 text-gray-200">
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <p className="text-sm text-gray-300 font-medium">Choose Interview Mode:</p>
              <div className="flex gap-3">
                <Button
                  variant={mode === "voice" ? "default" : "outline"}
                  onClick={() => setMode("voice")}
                  className={`gap-2 ${
                    mode === "voice"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "border-gray-600 text-gray-300"
                  }`}
                  data-testid="voice-mode-button"
                >
                  <Mic className="h-4 w-4" />
                  Voice Interview (Recommended)
                </Button>
                <Button
                  variant={mode === "text" ? "default" : "outline"}
                  onClick={() => setMode("text")}
                  className={`gap-2 ${
                    mode === "text"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "border-gray-600 text-gray-300"
                  }`}
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
          /* SPLIT-SCREEN VOICE INTERVIEW UI */
          <div className="space-y-6">
            {/* Progress Bar
            {mode === "text" && (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">
                  Question {currentQuestion + 1} of {interview.questions.length}
                </p>
                <Progress value={progress} className="w-full max-w-md mx-auto" />
              </div>
            )} */}

            {/* Split Screen - AI Interviewer + User */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - AI Interviewer */}
              {/* Left Panel - AI Interviewer with Beyond Presence Avatar */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-purple-500/30">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {/* AI Interviewer Avatar */}
                     {/* Beyond Presence AI Avatar */}
                    <BeyondPresenceAvatar
                    isSpeaking={sessionManager.isSpeaking}
                      isListening={sessionManager.isListening}
                      className="w-full max-w-md"
                      // onReady={() => console.log("Beyond Presence avatar ready")}
                     onReady={sessionManager.onVideoReady}
                      onError={sessionManager.onVideoError}
                    />
                    <h3 className="text-2xl font-bold text-white" data-testid="ai-interviewer-label">
                      AI Interviewer
                    </h3>
                    <Badge 
                      variant="outline" 
                         className={`${sessionManager.isSpeaking ? 'text-green-400 border-green-400' : 'text-blue-400 border-blue-400'}`}
                    >
                      {sessionManager.isSpeaking ? '🟢 Speaking' : sessionManager.isListening ? '🎤 Listening' : '🔴 Live'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Right Panel - User Webcam */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-blue-500/30">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {/* Live User Webcam */}
                    <UserWebcam
                      userName={userName}
                      userPhotoURL={auth.currentUser?.photoURL}
                      className="w-full"
                      autoStart={true}
                      onCameraReady={() => console.log("✅ User camera ready")}
                      onCameraError={(error) => console.error("❌ Camera error:", error)}
                    />
                    <h3 className="text-2xl font-bold text-white" data-testid="user-name-label">
                      {userName}
                    </h3>
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      🟢 Live
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Voice Agent Component */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <VoiceAgent
                  userName={userName}
                  userId={userId}
                  interviewId={interviewId}
                  applicationId={interview.applicationId}
                  questions={interview.questions}
                   onSpeakingChange={sessionManager.onSpeakingChange}
                  onListeningChange={sessionManager.onListeningChange}
                  onReady={sessionManager.onVoiceReady}
                  onError={sessionManager.onVoiceError}
                  onTranscriptChange={sessionManager.onTranscriptChange}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* TEXT MODE */
          <>
            {/* Progress */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Question {currentQuestion + 1} of {interview.questions.length}
              </p>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
            </div>

            {/* Question Card */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-6 mb-6">
                  <p className="text-lg text-white leading-relaxed" data-testid="current-question">
                    <strong>Q{currentQuestion + 1}:</strong> {interview.questions[currentQuestion]}
                  </p>
                </div>

                {/* Answer Input */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-300">Your Answer:</label>

                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={10}
                    className="text-base bg-gray-900 text-white border-gray-700"
                    data-testid="answer-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="gap-2 border-gray-600 text-gray-300"
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
                      : "bg-gray-600"
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
