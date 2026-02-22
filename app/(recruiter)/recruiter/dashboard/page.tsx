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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent" data-testid="page-title">
              Recruiter Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Manage your jobs, companies, and view applicant analytics
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white" data-testid="total-jobs">{stats.totalJobs}</div>
                  <p className="text-xs text-gray-500 mt-1">All positions</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Open Jobs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400" data-testid="open-jobs">{stats.openJobs}</div>
                  <p className="text-xs text-gray-500 mt-1">Currently hiring</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400" data-testid="total-companies">{stats.companies}</div>
                  <p className="text-xs text-gray-500 mt-1">Organizations</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Applications</CardTitle>
                  <Users className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400">{stats.totalApplications}</div>
                  <p className="text-xs text-gray-500 mt-1">Total candidates</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-6 bg-gray-800/90 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-200">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/recruiter/jobs/new" className="block">
                    <Button className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/30" data-testid="post-job-button">
                      <Plus className="h-4 w-4" />
                      Post New Job
                    </Button>
                  </Link>

                  <Link href="/recruiter/companies" className="block">
                    <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg shadow-purple-500/30" data-testid="manage-companies-button">
                      <Building2 className="h-4 w-4" />
                      Manage Companies
                    </Button>
                  </Link>

                  <Link href="/recruiter/jobs" className="block">
                    <Button className="w-full gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg shadow-green-500/30" data-testid="view-jobs-button">
                      <Briefcase className="h-4 w-4" />
                      View All Jobs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Getting Started */}
            {stats.totalJobs === 0 && (
              <Card className="mt-6 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-blue-300 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Getting Started
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  <ol className="list-decimal list-inside space-y-2 mb-4">
                    <li>Create a company profile</li>
                    <li>Post your first job with tech stack requirements</li>
                    <li>AI will generate tailored interview questions for applicants</li>
                    <li>Review applications with AI interview scores and feedback</li>
                  </ol>
                  <Link href="/recruiter/companies">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30">
                      <Building2 className="h-4 w-4 mr-2" />
                      Create Company
                    </Button>
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