"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getInterviewById, getFeedbackByInterviewId } from "@/lib/actions/interview.action";
import { Interview, Feedback } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, TrendingDown, CheckCircle, Home } from "lucide-react";

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadFeedback();
      }
    });
    return () => unsubscribe();
  }, [router, interviewId]);

  const loadFeedback = async () => {
    setLoading(true);
    const [interviewData, feedbackData] = await Promise.all([
      getInterviewById(interviewId),
      getFeedbackByInterviewId(interviewId),
    ]);

    setInterview(interviewData);
    
    // Normalize feedback data to ensure it matches the expected structure
    if (feedbackData) {
      const normalizedFeedback = {
        ...feedbackData,
        // Ensure categoryScores is an array and has the correct field names
        categoryScores: Array.isArray(feedbackData.categoryScores) 
          ? feedbackData.categoryScores.map((cat: any) => ({
              name: cat.name || cat.category || "Unknown Category",
              score: cat.score || 0,
              comment: cat.comment || cat.feedback || "" // Map 'feedback' to 'comment' if needed
            }))
          : [],
        // Ensure other fields are arrays
        strengths: Array.isArray(feedbackData.strengths) ? feedbackData.strengths : [],
        areasForImprovement: Array.isArray(feedbackData.areasForImprovement) ? feedbackData.areasForImprovement : [],
        transcript: Array.isArray(feedbackData.transcript) ? feedbackData.transcript : []
      };
      setFeedback(normalizedFeedback);
    } else {
      setFeedback(null);
    }
    
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center">Loading feedback...</div>
        </div>
      </div>
    );
  }

  if (!interview || !feedback) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p>Feedback not available</p>
          <Link href="/jobseeker/applications">
            <Button className="mt-4">Back to Applications</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
            <Award className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
            Interview Feedback
          </h1>
          <p className="text-gray-600 mt-2">{interview.role} - {interview.level} Level</p>
        </div>

        {/* Overall Score */}
        <Card className={`mb-6 border-2 ${getScoreBgColor(feedback.totalScore)}`}>
          <CardContent className="text-center py-8">
            <p className="text-gray-700 mb-2">Overall Score</p>
            <p className={`text-6xl font-bold ${getScoreColor(feedback.totalScore)}`} data-testid="total-score">
              {feedback.totalScore}
            </p>
            <p className="text-gray-600 mt-2">out of 100</p>
            <Progress value={feedback.totalScore} className="w-64 mx-auto mt-4" />
          </CardContent>
        </Card>

        {/* Category Scores */}
        {feedback.categoryScores && feedback.categoryScores.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feedback.categoryScores.map((category, idx) => (
                  <div key={idx} className="border rounded-lg p-4" data-testid={`category-${idx}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{category.name}</h3>
                      <span className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                        {category.score}
                      </span>
                    </div>
                    <Progress value={category.score} className="mb-2" />
                    {category.comment && (
                      <p className="text-sm text-gray-600">{category.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {feedback.strengths && feedback.strengths.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2" data-testid={`strength-${idx}`}>
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Areas for Improvement */}
        {feedback.areasForImprovement && feedback.areasForImprovement.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedback.areasForImprovement.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2" data-testid={`improvement-${idx}`}>
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <span className="text-xs text-orange-600 font-bold">{idx + 1}</span>
                    </div>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Final Assessment */}
        {feedback.finalAssessment && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Final Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 italic" data-testid="final-assessment">"{feedback.finalAssessment}"</p>
            </CardContent>
          </Card>
        )}

        {/* Transcript (Optional) */}
        {feedback.transcript && feedback.transcript.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Interview Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {feedback.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      entry.role === "interviewer"
                        ? "bg-gray-100"
                        : "bg-blue-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      {entry.role}:
                    </p>
                    <p className="text-gray-800">{entry.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Link href="/jobseeker/applications">
            <Button variant="outline" className="gap-2" data-testid="back-to-applications-button">
              <Home className="h-4 w-4" />
              Back to Applications
            </Button>
          </Link>
          <Link href="/jobseeker/jobs">
            <Button data-testid="browse-more-jobs-button">Browse More Jobs</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}