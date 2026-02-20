"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getJobById } from "@/lib/actions/job.action";
import { getUserById } from "@/lib/actions/auth.action";
import { createApplication, checkExistingApplication } from "@/lib/actions/application.action";
import { createInterview } from "@/lib/actions/interview.action";
import { Job } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Briefcase, MapPin, DollarSign, Clock, Building2, Award } from "lucide-react";
import { formatSalary, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setCurrentUserId(user.uid);
        await loadJob(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router, jobId]);

  const loadJob = async (userId: string) => {
    setLoading(true);
    const jobData = await getJobById(jobId);
    if (jobData) {
      setJob(jobData);
      // Check if user already applied
      const alreadyApplied = await checkExistingApplication(userId, jobId);
      setHasApplied(alreadyApplied);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!currentUserId || !job) return;

    setApplying(true);
    try {
      const user = await getUserById(currentUserId);
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Create application
      const result = await createApplication({
        jobId: job.id,
        applicantId: currentUserId,
        applicantName: user.name,
        applicantEmail: user.email,
        jobName: job.title,
        jobTitle: job.title,
        companyName: job.companyName,
        jobSalary: job.salary,
        resumeUrl: user.resumeUrl,
        interviewId: null,
        interviewStatus: "pending",
      });

      if (result.success && result.applicationId) {
        setApplicationId(result.applicationId);
        setHasApplied(true);
        toast.success("Application submitted successfully!");
        
        // Show interview modal
        setShowInterviewModal(true);
      } else {
        toast.error(result.error || "Failed to apply");
      }
    } catch (error: any) {
      console.error("Apply error:", error);
      toast.error(error.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  };

  const handleStartInterview = async () => {
    if (!job || !applicationId) return;

    try {
      const level = job.experience <= 2 ? "Junior" : job.experience <= 5 ? "Mid" : "Senior";

      const result = await createInterview({
        applicationId,
        jobId: job.id,
        role: job.role,
        level,
        techstack: job.techStack,
        userId: currentUserId,
        jobDescription: job.description,
        experience: job.experience,
      });

      if (result.success && result.interviewId) {
        toast.success("Interview generated! Redirecting...");
        router.push(`/interview/${result.interviewId}`);
      } else {
        toast.error(result.error || "Failed to generate interview");
      }
    } catch (error) {
      console.error("Interview error:", error);
      toast.error("Failed to start interview");
    }
  };

  const handleSkipInterview = () => {
    setShowInterviewModal(false);
    toast.info("You can take the interview later from My Applications");
    router.push("/jobseeker/applications");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Job not found</p>
          <Button onClick={() => router.push("/jobseeker/jobs")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl" data-testid="job-title">{job.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <Building2 className="h-5 w-5" />
                  <span className="text-lg">{job.companyName || "Company"}</span>
                </div>
              </div>
              <Badge variant={job.status === "open" ? "success" : "secondary"} className="text-lg px-4 py-2">
                {job.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <span className="font-semibold">{formatSalary(job.salary)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gray-400" />
                <span>{job.experience} years experience</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>{job.openings} openings</span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Button
              onClick={handleApply}
              disabled={applying || hasApplied || job.status === "closed"}
              className="w-full"
              size="lg"
              data-testid="apply-button"
            >
              {hasApplied
                ? "Already Applied"
                : applying
                ? "Applying..."
                : job.status === "closed"
                ? "Job Closed"
                : "Apply Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Role & Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Role</h3>
              <p className="text-gray-700">{job.role}</p>
            </div>

            {job.techStack && job.techStack.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {job.techStack.map((tech, idx) => (
                    <Badge key={idx} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Experience Required</h3>
              <p className="text-gray-700">{job.experience} years</p>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 p-4 rounded-lg">
              <Award className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">AI Interview Required</p>
                <p className="text-sm text-blue-700 mt-1">
                  After applying, you'll be invited to complete an AI-powered technical interview tailored to this role.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posted Date */}
        <p className="text-sm text-gray-500 text-center">
          Posted on {formatDate(job.createdAt)}
        </p>
      </div>

      {/* Interview Modal */}
      <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
        <DialogContent data-testid="interview-modal">
          <DialogHeader>
            <DialogTitle>🎉 Application Submitted!</DialogTitle>
            <DialogDescription>
              Your application has been received. Would you like to take the AI interview now or schedule it for later?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>AI Interview:</strong> The interview will be tailored to the {job.title} role with questions covering {job.techStack.slice(0, 3).join(", ")} and more.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSkipInterview} data-testid="skip-interview-button">
              Schedule Later
            </Button>
            <Button onClick={handleStartInterview} data-testid="start-interview-button">
              Take Interview Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
