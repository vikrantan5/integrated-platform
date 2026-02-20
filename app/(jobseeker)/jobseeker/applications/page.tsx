"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getApplicationsByApplicant } from "@/lib/actions/application.action";
import { Application } from "@/types";
import Navbar from "@/components/Navbar";
import ApplicationCard from "@/components/ApplicationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setCurrentUserId(user.uid);
        await loadApplications(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadApplications = async (userId: string) => {
    setLoading(true);
    const apps = await getApplicationsByApplicant(userId);
    setApplications(apps);
    setLoading(false);
  };

  const filterApplications = (status?: string) => {
    if (!status) return applications;
    return applications.filter((app) => app.status === status);
  };

  const pendingInterviews = applications.filter(
    (app) => app.interviewId && app.interviewStatus === "pending"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
            My Applications
          </h1>
          <p className="text-gray-600 mt-2">
            Track your job applications and interview progress
          </p>
        </div>

        {pendingInterviews.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-900 font-semibold">
              ⚠️ You have {pendingInterviews.length} pending interview{pendingInterviews.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Complete your interviews to improve your chances of getting hired!
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">No applications yet</p>
            <button
              onClick={() => router.push("/jobseeker/jobs")}
              className="text-blue-600 hover:underline"
            >
              Browse jobs and apply
            </button>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({applications.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({filterApplications("pending").length})
              </TabsTrigger>
              <TabsTrigger value="accepted" data-testid="tab-accepted">
                Accepted ({filterApplications("accepted").length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Rejected ({filterApplications("rejected").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {applications.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterApplications("pending").map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="accepted" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterApplications("accepted").map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterApplications("rejected").map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
