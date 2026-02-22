"use client";


import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { uploadResumeFile, createResumeAnalysis } from "@/lib/actions/resume-supabase.action";
import { getJobById } from "@/lib/actions/job.action";
import { Job } from "@/types";
import { JOB_CATEGORIES, JOB_ROLES } from "@/lib/constants";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function ResumeAnalyzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [userId, setUserId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [jobCategory, setJobCategory] = useState<string>("");
  const [jobRole, setJobRole] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setUserId(user.uid);
        if (jobId) {
          try {
            const jobData = await getJobById(jobId);
            setJob(jobData);
          } catch (error) {
            console.error("Error fetching job:", error);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [router, jobId]);

  // Reset job role when category changes
  useEffect(() => {
    setJobRole("");
  }, [jobCategory]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!fileExtension || !["pdf", "docx"].includes(fileExtension)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !userId) return;

    // Validation: Category and role must be selected
    if (!jobCategory) {
      toast.error("Please select a job category");
      return;
    }
    if (!jobRole) {
      toast.error("Please select a job role");
      return;
    }

    setUploading(true);
    setAnalyzing(true);

    try {
       // Convert File to ArrayBuffer, then to Uint8Array (works in browser)
      const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log("📤 File upload info:");
      console.log("  - File name:", file.name);
      console.log("  - File size:", file.size, "bytes");
      console.log("  - File type:", file.type);
      console.log("  - Uint8Array length:", uint8Array.length);

      toast.info("Uploading resume...");
      const uploadResult = await uploadResumeFile(uint8Array, file.name, userId);
      if (!uploadResult.success || !uploadResult.resumeUrl || !uploadResult.resumeText) {
        toast.error(uploadResult.error || "Failed to upload resume");
        setUploading(false);
        setAnalyzing(false);
        return;
      }

      setUploading(false);

      // Get role label for better AI context
      const categoryLabel = JOB_CATEGORIES.find(c => c.value === jobCategory)?.label || jobCategory;
      const roleLabel = JOB_ROLES[jobCategory]?.find(r => r.value === jobRole)?.label || jobRole;

      toast.info(`Analyzing resume for ${roleLabel} position...`);
      const analysisResult = await createResumeAnalysis({
        studentId: userId,
        jobId: jobId || undefined,
        fileName: file.name,
        resumeUrl: uploadResult.resumeUrl,
        resumeText: uploadResult.resumeText,
        jobDescription: job?.description || "",
        jobCategory: categoryLabel,
        jobRole: roleLabel,
      });

      if (analysisResult.success && analysisResult.analysisId) {
        toast.success("Resume analyzed successfully!");
        router.push(`/jobseeker/resume/results/${analysisResult.analysisId}`);
      } else {
        toast.error(analysisResult.error || "Failed to analyze resume");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("An error occurred during analysis");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const availableRoles = jobCategory ? JOB_ROLES[jobCategory] || [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="page-title">
            ATS Resume Checker
          </h1>
          <p className="text-gray-600">
            Upload your resume to get AI-powered ATS analysis and improvement suggestions
          </p>
          {job && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Analyzing for:</strong> {job.title} at {job.companyName}
              </p>
            </div>
          )}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Job Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="job-category" className="text-sm font-semibold">
                Job Category <span className="text-red-500">*</span>
              </Label>
              <Select value={jobCategory} onValueChange={setJobCategory}>
                <SelectTrigger id="job-category" data-testid="job-category-select">
                  <SelectValue placeholder="Select job category" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="job-role" className="text-sm font-semibold">
                Specific Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={jobRole}
                onValueChange={setJobRole}
                disabled={!jobCategory}
              >
                <SelectTrigger id="job-role" data-testid="job-role-select">
                  <SelectValue
                    placeholder={
                      jobCategory
                        ? "Select specific role"
                        : "Select category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jobCategory && !jobRole && (
                <p className="text-xs text-gray-500">
                  Choose the role you're applying for to get targeted feedback
                </p>
              )}
            </div>

            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="file-input"
              />

              {!file ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-16 w-16 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      Drop your resume here, or click to browse
                    </p>
                    <p className="text-sm text-gray-600">
                      Supports PDF and DOCX (Max 10MB)
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    data-testid="browse-button"
                  >
                    Browse Files
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <FileText className="h-16 w-16 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setFile(null)}
                      variant="outline"
                      disabled={uploading || analyzing}
                      data-testid="remove-file-button"
                    >
                      Remove
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={uploading || analyzing}
                    >
                      Change File
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleAnalyze}
                disabled={!file || !jobCategory || !jobRole || uploading || analyzing}
                className="px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="analyze-button"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2 text-sm text-blue-900">
                  <p className="font-semibold">What we analyze (role-specific):</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Experience - Relevance to your selected role</li>
                    <li>Education - Degree, institution, and field relevance</li>
                    <li>Skills - Technical & soft skills for the role</li>
                    <li>Keywords - Role-specific keyword optimization</li>
                    <li>Formatting - ATS-friendly structure</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => router.push("/jobseeker/resume/history")}
            data-testid="view-history-button"
          >
            View Analysis History
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResumeAnalyzerLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    </div>
  );
}

export default function ResumeAnalyzerPage() {
  return (
    <Suspense fallback={<ResumeAnalyzerLoading />}>
      <ResumeAnalyzerContent />
    </Suspense>
  );
}