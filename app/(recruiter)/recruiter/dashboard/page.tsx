"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getUserById } from "@/lib/actions/auth.action";
import { getJobsByRecruiter } from "@/lib/actions/job.action";
import { getCompaniesByOwner } from "@/lib/actions/job.action";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Building2, Users, TrendingUp, Plus } from "lucide-react";

export default function RecruiterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    openJobs: 0,
    companies: 0,
    totalApplications: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }

      const userData = await getUserById(user.uid);
      if (userData?.role !== "recruiter") {
        router.push("/jobseeker/jobs");
        return;
      }

      await loadStats(user.uid);
    });
    return () => unsubscribe();
  }, [router]);

  const loadStats = async (userId: string) => {
    setLoading(true);
    const [jobs, companies] = await Promise.all([
      getJobsByRecruiter(userId),
      getCompaniesByOwner(userId),
    ]);

    const openJobs = jobs.filter((j) => j.status === "open").length;

    setStats({
      totalJobs: jobs.length,
      openJobs,
      companies: companies.length,
      totalApplications: 0, // Will be calculated from applications
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Recruiter Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your jobs, companies, and view applicant analytics
            </p>
          </div>
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
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-jobs">{stats.totalJobs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="open-jobs">{stats.openJobs}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-companies">{stats.companies}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/recruiter/jobs/new" className="block">
                    <Button className="w-full gap-2" data-testid="post-job-button">
                      <Plus className="h-4 w-4" />
                      Post New Job
                    </Button>
                  </Link>

                  <Link href="/recruiter/companies" className="block">
                    <Button variant="outline" className="w-full gap-2" data-testid="manage-companies-button">
                      <Building2 className="h-4 w-4" />
                      Manage Companies
                    </Button>
                  </Link>

                  <Link href="/recruiter/jobs" className="block">
                    <Button variant="outline" className="w-full gap-2" data-testid="view-jobs-button">
                      <Briefcase className="h-4 w-4" />
                      View All Jobs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Getting Started */}
            {stats.totalJobs === 0 && (
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">🚀 Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-800">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Create a company profile</li>
                    <li>Post your first job with tech stack requirements</li>
                    <li>AI will generate tailored interview questions for applicants</li>
                    <li>Review applications with AI interview scores and feedback</li>
                  </ol>
                  <Link href="/recruiter/companies">
                    <Button className="mt-4">Create Company</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
