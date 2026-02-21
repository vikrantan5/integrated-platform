"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getResumeAnalysesByStudent, deleteResumeAnalysis } from "@/lib/actions/resume-supabase.action";
import { ResumeAnalysis } from "@/types";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Eye, Upload, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ResumeAnalysisHistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadAnalyses(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadAnalyses = async (userId: string) => {
    setLoading(true);
    try {
      const analysesData = await getResumeAnalysesByStudent(userId);
      setAnalyses(analysesData);
    } catch (error) {
      console.error("Error loading analyses:", error);
      toast.error("Failed to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (analysisId: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) {
      return;
    }

    setDeletingId(analysisId);
    try {
      const result = await deleteResumeAnalysis(analysisId);
      if (result.success) {
        toast.success("Analysis deleted successfully");
        setAnalyses(analyses.filter((a) => a.id !== analysisId));
      } else {
        toast.error(result.error || "Failed to delete analysis");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete analysis");
    } finally {
      setDeletingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

const getCompatibilityColor = (compatibility: number) => {
    if (compatibility >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (compatibility >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    if (compatibility >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Resume Analysis History
            </h1>
            <p className="text-gray-600 mt-2">View all your resume analyses</p>
          </div>
          <Link href="/jobseeker/resume">
            <Button className="gap-2" data-testid="analyze-new-button">
              <Upload className="h-4 w-4" />
              Analyze New Resume
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading history...</p>
          </div>
        ) : analyses.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analyses Yet</h2>
              <p className="text-gray-600 mb-6">
                Upload your first resume to get AI-powered ATS analysis
              </p>
              <Link href="/jobseeker/resume">
                <Button data-testid="first-analysis-button">
                  <Upload className="h-4 w-4 mr-2" />
                  Analyze Your Resume
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="shadow-lg hover:shadow-xl transition-shadow"
                data-testid={`analysis-card-${analysis.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" title={analysis.fileName}>
                        {analysis.fileName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}
                        data-testid={`score-${analysis.id}`}
                      >
                        {analysis.overallScore}
                      </div>
                      <div className="text-xs text-gray-500">/ 100</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Badge
                    className={`${getCompatibilityColor(analysis.atsCompatibility)} border w-full justify-center`}
                  >
                   {analysis.atsCompatibility >= 80 ? "Excellent" :
                      analysis.atsCompatibility >= 60 ? "Good" :
                      analysis.atsCompatibility >= 40 ? "Fair" : "Poor"} ATS
                  </Badge>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Top Categories:</span>
                      <div className="mt-1 space-y-1">
                        {/* {analysis.categoryScores.slice(0, 2).map((cat, idx) => ( */}
                        {Object.entries(analysis.categoryScores).slice(0, 2).map(([category, score], idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                           <span className="text-gray-600 capitalize">{category}</span>
                            <span className={`font-medium ${getScoreColor(score as number)}`}>
                              {score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/jobseeker/resume/results/${analysis.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        data-testid={`view-${analysis.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(analysis.id)}
                      disabled={deletingId === analysis.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-${analysis.id}`}
                    >
                      {deletingId === analysis.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
