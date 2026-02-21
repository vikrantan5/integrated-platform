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
  FileText,
  Download,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

export default function ResumeAnalysisResultsPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        await loadAnalysis();
      }
    });
    return () => unsubscribe();
  }, [router, analysisId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const analysisData = await getResumeAnalysisById(analysisId);
      if (analysisData) {
        setAnalysis(analysisData);
      }
    } catch (error) {
      console.error("Error loading analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getCompatibilityColor = (compatibility: number) => {
    if (compatibility >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (compatibility >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    if (compatibility >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600 mb-4">Analysis not found</p>
          <Link href="/jobseeker/resume">
            <Button>Analyze New Resume</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/jobseeker/resume/history">
              <Button variant="ghost" className="mb-2" data-testid="back-button">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Resume Analysis Results
            </h1>
            <p className="text-gray-600 mt-1">
              {analysis.fileName} • {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>
          <a href={analysis.resumeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" data-testid="download-resume-button">
              <Download className="h-4 w-4 mr-2" />
              View Resume
            </Button>
          </a>
        </div>

        {/* Overall Score Card */}
        <Card className="mb-6 shadow-lg border-2 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                    <div
                      className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}
                      data-testid="overall-score"
                    >
                      {analysis.overallScore}
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Score</h2>
                  <Badge
                    className={`${getCompatibilityColor(analysis.atsCompatibility)} border px-3 py-1`}
                    data-testid="ats-compatibility"
                  >
                   {analysis.atsCompatibility >= 80 ? "Excellent" :
                      analysis.atsCompatibility >= 60 ? "Good" :
                      analysis.atsCompatibility >= 40 ? "Fair" : "Poor"} ATS Compatibility
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Link href="/jobseeker/resume">
                  <Button variant="outline" data-testid="analyze-new-button">
                    Analyze Another Resume
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Scores */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* {analysis.categoryScores.map((category, idx) => ( */}
              {Object.entries(analysis.categoryScores).map(([category, score], idx) => (
                <div key={idx} className="space-y-2" data-testid={`category-${idx}`}>
                  <div className="flex items-center justify-between">
                     <span className="font-medium text-gray-900 capitalize">{category}</span>
                    <span className={`font-bold ${getScoreColor(score as number)}`}>
                      {score}/100
                    </span>
                  </div>
                  <Progress value={score as number} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2" data-testid={`strength-${idx}`}>
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <TrendingUp className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2" data-testid={`improvement-${idx}`}>
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Keywords Analysis */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Keywords Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Matched Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                     {analysis.keywords.matched.length > 0 ? (
                    analysis.keywords.matched.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                   <p className="text-sm text-gray-600">No keywords matched</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.missing.length > 0 ? (
                    analysis.keywords.missing.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-red-100 text-red-800">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">All important keywords present</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/jobseeker/resume">
            <Button className="w-full sm:w-auto">Analyze Updated Resume</Button>
          </Link>
          <Link href="/jobseeker/resume/history">
            <Button variant="outline" className="w-full sm:w-auto">
              View All Analyses
            </Button>
          </Link>
          <Link href="/jobseeker/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
