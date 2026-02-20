"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getJobsByRecruiter, updateJob, deleteJob } from "@/lib/actions/job.action";
import { getApplicationsByJob } from "@/lib/actions/application.action";
import { Job } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { formatSalary, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ManageJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadJobs(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadJobs = async (userId: string) => {
    setLoading(true);
    const jobsList = await getJobsByRecruiter(userId);
    setJobs(jobsList);

    // Load application counts
    const counts: Record<string, number> = {};
    for (const job of jobsList) {
      const apps = await getApplicationsByJob(job.id);
      counts[job.id] = apps.length;
    }
    setApplicationCounts(counts);

    setLoading(false);
  };

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === "open" ? "closed" : "open";
    const result = await updateJob(job.id, { status: newStatus });

    if (result.success) {
      toast.success(`Job ${newStatus === "open" ? "opened" : "closed"} successfully`);
      await loadJobs(auth.currentUser?.uid || "");
    } else {
      toast.error("Failed to update job status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Manage Jobs
            </h1>
            <p className="text-gray-600 mt-2">View and manage your job postings</p>
          </div>

          <Link href="/recruiter/jobs/new">
            <Button className="gap-2" data-testid="post-new-job-button">
              <Plus className="h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">No jobs posted yet</p>
              <Link href="/recruiter/jobs/new">
                <Button>Post Your First Job</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} data-testid={`job-item-${job.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <Badge variant={job.status === "open" ? "success" : "secondary"}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{job.companyName}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700 line-clamp-2">{job.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>{job.location}</span>
                      <span>{formatSalary(job.salary)}</span>
                      <span>{job.experience} years exp</span>
                      <span>{job.openings} openings</span>
                    </div>

                    {job.techStack && job.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.techStack.slice(0, 5).map((tech, idx) => (
                          <Badge key={idx} variant="outline">
                            {tech}
                          </Badge>
                        ))}
                        {job.techStack.length > 5 && (
                          <Badge variant="outline">+{job.techStack.length - 5} more</Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{applicationCounts[job.id] || 0} applications</span>
                        </div>
                        <span className="text-gray-500">Posted {formatDate(job.createdAt)}</span>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/recruiter/applications/${job.id}`}>
                          <Button variant="outline" size="sm" className="gap-2" data-testid={`view-applications-${job.id}`}>
                            <Eye className="h-4 w-4" />
                            View Applications
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(job)}
                          className="gap-2"
                          data-testid={`toggle-status-${job.id}`}
                        >
                          {job.status === "open" ? (
                            <>
                              <ToggleRight className="h-4 w-4" />
                              Close
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4" />
                              Open
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
