"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getApplicationsByApplicant } from "@/lib/actions/application.action";
import { getFeedbacksByUser } from "@/lib/actions/interview.action";
import { getLatestResumeAnalysis } from "@/lib/actions/resume.action"; // Add this import
// import { Application, Feedback, ResumeAnalysis } from "@/lib/actions/resume-supabase.action";
import { Application, Feedback } from "@/types";
import type { ResumeAnalysis } from "@/types";
import Navbar from "@/components/Navbar";
import ApplicationCard from "@/components/ApplicationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Add this import
// import { Briefcase, FileText, Award, TrendingUp, Clock, Upload } from "lucide-react"; // Add Upload to imports
import { Briefcase, FileText, Award, TrendingUp, Clock, Upload, Sparkles } from "lucide-react"

export default function JobSeekerDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadData(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [apps, feedbacksList, resumeAnalysis] = await Promise.all([
        getApplicationsByApplicant(userId),
        getFeedbacksByUser(userId),
        getLatestResumeAnalysis(userId),
      ]);

      setApplications(apps);
      setFeedbacks(feedbacksList);
      setLatestResume(resumeAnalysis);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingInterviews = applications.filter(
    (app) => app.interviewId && app.interviewStatus === "pending"
  );

  const completedInterviews = applications.filter(
    (app) => app.interviewStatus === "completed"
  );

  const averageScore =
    feedbacks.length > 0
      ? Math.round(feedbacks.reduce((sum, f) => sum + f.totalScore, 0) / feedbacks.length)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
            My Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Track your job applications and interview performance</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-applications">
                    {applications.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Interviews</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600" data-testid="pending-interviews">
                    {pendingInterviews.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Interviews Completed</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="completed-interviews">
                    {completedInterviews.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${averageScore >= 70 ? "text-green-600" : "text-gray-900"}`} data-testid="average-score">
                    {averageScore > 0 ? `${averageScore}/100` : "N/A"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Interviews Alert */}
            {pendingInterviews.length > 0 && (
              <Card className="mb-6 bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-900">⚠️ Action Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-800 mb-4">
                    You have {pendingInterviews.length} pending interview{pendingInterviews.length > 1 ? "s" : ""}. Complete them to increase your chances!
                  </p>
                  <Link href="/jobseeker/applications">
                    <Button data-testid="view-pending-button">View Pending Interviews</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

               {/* AI Mock Interview Section */}
            <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  AI Mock Interview Practice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-3">
                      Practice your interview skills with our AI interviewer. Get personalized questions based on your role and receive detailed feedback.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">5</p>
                        <p className="text-xs text-gray-600">Questions</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">AI</p>
                        <p className="text-xs text-gray-600">Powered</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-2xl font-bold text-green-600">✓</p>
                        <p className="text-xs text-gray-600">Feedback</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">🎯</p>
                        <p className="text-xs text-gray-600">Personalized</p>
                      </div>
                    </div>
                  </div>
                  <Link href="/mock-interview/setup">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" data-testid="start-mock-interview-button">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start AI Mock Interview
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Resume Analyzer Section */}
            <Card className="mb-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  ATS Resume Checker
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestResume ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900 mb-1">Latest Analysis</p>
                        <p className="text-sm text-gray-600">{latestResume.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(latestResume.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${
                            latestResume.overallScore >= 80 ? "text-green-600" :
                            latestResume.overallScore >= 60 ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {latestResume.overallScore}
                          </div>
                          <p className="text-xs text-gray-500">/ 100</p>
                        </div>
                       <Badge className={`
  ${latestResume.atsCompatibility >= 80 ? "bg-green-100 text-green-800" :
    latestResume.atsCompatibility >= 60 ? "bg-blue-100 text-blue-800" :
    latestResume.atsCompatibility >= 40 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800"}  // Added fallback for scores below 40
`}>
  {latestResume.atsCompatibility >= 80 ? "Excellent" :
   latestResume.atsCompatibility >= 60 ? "Good" :
   latestResume.atsCompatibility >= 40 ? "Fair" : "Poor"}
</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/jobseeker/resume/results/${latestResume.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View Analysis
                        </Button>
                      </Link>
                      <Link href="/jobseeker/resume" className="flex-1">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Analyze New
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-gray-700 mb-3">
                      Get AI-powered ATS analysis for your resume
                    </p>
                    <Link href="/jobseeker/resume">
                      <Button className="bg-purple-600 hover:bg-purple-700" data-testid="analyze-resume-button">
                        <Upload className="h-4 w-4 mr-2" />
                        Analyze Your Resume
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Applications</CardTitle>
                  <Link href="/jobseeker/applications">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No applications yet</p>
                    <Link href="/jobseeker/jobs">
                      <Button>Browse Jobs</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {applications.slice(0, 3).map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interview Performance */}
            {feedbacks.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Interview Performance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {feedbacks.slice(0, 5).map((feedback, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`feedback-${idx}`}>
                        <div className="flex-1">
                          <p className="font-medium">Interview #{feedbacks.length - idx}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            feedback.totalScore >= 80
                              ? "text-green-600"
                              : feedback.totalScore >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}>
                            {feedback.totalScore}
                          </p>
                          <p className="text-xs text-gray-500">/ 100</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/jobseeker/jobs">
                    <Button className="w-full" variant="outline">
                      Browse Jobs
                    </Button>
                  </Link>
                  <Link href="/jobseeker/applications">
                    <Button className="w-full" variant="outline">
                      View Applications
                    </Button>
                  </Link>
                  <Link href="/jobseeker/resume">
                    <Button className="w-full" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Resume Analyzer
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}