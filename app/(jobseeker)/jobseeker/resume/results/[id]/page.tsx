"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getResumeAnalysisById } from "@/lib/actions/resume-supabase.action";
import { ResumeAnalysis } from "@/types";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Download,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

export default function ResumeAnalysisResultsPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params?.id as string;

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------- AUTH CHECK ----------------
  useEffect(() => {
    if (!analysisId) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }
      await loadAnalysis();
    });

    return () => unsubscribe();
  }, [analysisId]);

  // ---------------- LOAD DATA ----------------
const loadAnalysis = async () => {
  setLoading(true);

  try {
    const data = await getResumeAnalysisById(analysisId);

    if (!data) {
      setAnalysis(null);
      return;
    }

    const safeAnalysis: ResumeAnalysis = {
      ...data,

      overallScore: Number(data.overallScore),
      atsCompatibility: Number(data.atsCompatibility),

      categoryScores: {
        experience: Number(data.categoryScores?.experience ?? 0),
        education: Number(data.categoryScores?.education ?? 0),
        skills: Number(data.categoryScores?.skills ?? 0),
        keywords: Number(data.categoryScores?.keywords ?? 0),
        formatting: Number(data.categoryScores?.formatting ?? 0),
      },
    };

    setAnalysis(safeAnalysis);

  } catch (error) {
    console.error("Error loading analysis:", error);
    setAnalysis(null);
  } finally {
    setLoading(false);
  }
};

  // ---------------- UI HELPERS ----------------
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80)
      return "bg-green-100 text-green-800 border-green-300";
    if (score >= 60)
      return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 40)
      return "bg-yellow-100 text-yellow-800 border-yellow-300";

    return "bg-red-100 text-red-800 border-red-300"; // ✅ FIXED DEFAULT
  };

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  // ---------------- NOT FOUND ----------------
  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-600 mb-4">Analysis not found</p>
          <Link href="/jobseeker/resume">
            <Button>Analyze New Resume</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/jobseeker/resume/history">
              <Button variant="ghost" className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </Link>

            <h1 className="text-3xl font-bold">
              Resume Analysis Results
            </h1>

            <p className="text-gray-600 mt-1">
              {analysis.fileName} •{" "}
              {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>

          <a href={analysis.resumeUrl} target="_blank">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              View Resume
            </Button>
          </a>
        </div>

        {/* OVERALL SCORE */}
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center justify-between">

            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full border-8 flex items-center justify-center">
                <span
                  className={`text-4xl font-bold ${getScoreColor(
                    analysis.overallScore
                  )}`}
                >
                  {analysis.overallScore}
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Overall Score
                </h2>

                <Badge
                  className={`${getCompatibilityColor(
                    analysis.atsCompatibility
                  )} border px-3 py-1`}
                >
                  {analysis.atsCompatibility >= 80
                    ? "Excellent"
                    : analysis.atsCompatibility >= 60
                    ? "Good"
                    : analysis.atsCompatibility >= 40
                    ? "Fair"
                    : "Poor"}{" "}
                  ATS Compatibility
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CATEGORY SCORES */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {Object.entries(analysis.categoryScores || {}).map(
              ([category, score], idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span className="capitalize font-medium">
                      {category}
                    </span>
                    <span className={getScoreColor(score)}>
                      {score}/100
                    </span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* STRENGTHS & IMPROVEMENTS */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.strengths.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-1" />
                  {s}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700 flex gap-2">
                <TrendingUp className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.improvements.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-1" />
                  {s}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}