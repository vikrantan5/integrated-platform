"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getJobById } from "@/lib/actions/job.action";
import { getApplicationsByJob, updateApplication } from "@/lib/actions/application.action";
import { getFeedbackByApplicationId } from "@/lib/actions/interview.action";
import { Application, Job, Feedback } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Calendar, Award, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ViewApplicationsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadData();
      }
    });
    return () => unsubscribe();
  }, [router, jobId]);

  const loadData = async () => {
    setLoading(true);
    const [jobData, apps] = await Promise.all([
      getJobById(jobId),
      getApplicationsByJob(jobId),
    ]);

    setJob(jobData);
    setApplications(apps);

    // Load feedbacks for applications with interviews
    const feedbackData: Record<string, Feedback> = {};
    for (const app of apps) {
      if (app.interviewId && app.interviewStatus === "completed") {
        const feedback = await getFeedbackByApplicationId(app.id);
        if (feedback) {
          feedbackData[app.id] = feedback;
        }
      }
    }
    setFeedbacks(feedbackData);

    setLoading(false);
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    const result = await updateApplication(applicationId, {
      status: newStatus as "pending" | "accepted" | "rejected",
    });

    if (result.success) {
      toast.success(`Application ${newStatus}`);
      await loadData();
    } else {
      toast.error("Failed to update application");
    }
  };

  const filterApplications = (status?: string) => {
    if (!status) return applications;
    return applications.filter((app) => app.status === status);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p>Job not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
            Applications for {job.title}
          </h1>
          <p className="text-gray-600 mt-2">{applications.length} total applications</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filterApplications("pending").length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({filterApplications("accepted").length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({filterApplications("rejected").length})
            </TabsTrigger>
          </TabsList>

          {["all", "pending", "accepted", "rejected"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              {(tab === "all" ? applications : filterApplications(tab)).length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12 text-gray-600">
                    No {tab !== "all" && tab} applications found
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(tab === "all" ? applications : filterApplications(tab)).map((app) => {
                    const feedback = feedbacks[app.id];
                    return (
                      <Card key={app.id} data-testid={`application-${app.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{app.applicantName}</CardTitle>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <Mail className="h-4 w-4" />
                                <span>{app.applicantEmail}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>Applied {formatDate(app.createdAt)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <Badge
                                variant={
                                  app.status === "accepted"
                                    ? "success"
                                    : app.status === "rejected"
                                    ? "destructive"
                                    : "warning"
                                }
                              >
                                {app.status}
                              </Badge>

                              <Select
                                value={app.status}
                                onValueChange={(value) => handleStatusChange(app.id, value)}
                              >
                                <SelectTrigger className="w-[140px]" data-testid={`status-select-${app.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="accepted">Accept</SelectItem>
                                  <SelectItem value="rejected">Reject</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Interview Status */}
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-gray-400" />
                            {app.interviewId ? (
                              app.interviewStatus === "completed" ? (
                                <Badge variant="success">Interview Completed</Badge>
                              ) : (
                                <Badge variant="warning">Interview Pending</Badge>
                              )
                            ) : (
                              <Badge variant="outline">No Interview Yet</Badge>
                            )}
                          </div>

                          {/* AI Interview Score */}
                          {feedback && (
                            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-blue-900">AI Interview Score</h3>
                                <span className={`text-2xl font-bold ${getScoreColor(feedback.totalScore)}`}>
                                  {feedback.totalScore}/100
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {feedback.categoryScores.map((cat, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span className="text-gray-700">{cat.name}:</span>
                                    <span className={`font-medium ${getScoreColor(cat.score)}`}>
                                      {cat.score}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-blue-900 mb-1">Strengths:</p>
                                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                                  {feedback.strengths.slice(0, 2).map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>

                              <p className="text-sm text-blue-800 italic">"{feedback.finalAssessment}"</p>

                              <Link href={`/interview/${app.interviewId}/feedback`}>
                                <Button variant="outline" size="sm" className="w-full" data-testid={`view-full-feedback-${app.id}`}>
                                  View Full Feedback
                                </Button>
                              </Link>
                            </div>
                          )}

                          {/* Resume */}
                          {app.resumeUrl && (
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Resume →
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
