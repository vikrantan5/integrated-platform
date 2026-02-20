"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getApplicationsByApplicant } from "@/lib/actions/application.action";
import { getFeedbacksByUser } from "@/lib/actions/interview.action";
import { Application, Feedback } from "@/types";
import Navbar from "@/components/Navbar";
import ApplicationCard from "@/components/ApplicationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Award, TrendingUp, Clock } from "lucide-react";

export default function JobSeekerDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
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
    const [apps, feedbacksList] = await Promise.all([
      getApplicationsByApplicant(userId),
      getFeedbacksByUser(userId),
    ]);

    setApplications(apps);
    setFeedbacks(feedbacksList);
    setLoading(false);
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

  const acceptedApps = applications.filter((app) => app.status === "accepted").length;

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
              <Card>
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
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
