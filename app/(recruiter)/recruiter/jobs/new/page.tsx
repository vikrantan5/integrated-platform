"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { createJob } from "@/lib/actions/job.action";
import { getCompaniesByOwner, getCompanyById } from "@/lib/actions/job.action";
import { Company } from "@/types";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function PostJobPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [techInput, setTechInput] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    role: "",
    salary: "",
    experience: "",
    location: "",
    openings: "",
    companyId: "",
    techStack: [] as string[],
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/sign-in");
      } else {
        setCurrentUserId(user.uid);
        await loadCompanies(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadCompanies = async (userId: string) => {
    setLoading(true);
    const comps = await getCompaniesByOwner(userId);
    setCompanies(comps);
    setLoading(false);
  };

  const handleAddTech = () => {
    if (techInput.trim() && !formData.techStack.includes(techInput.trim())) {
      setFormData({
        ...formData,
        techStack: [...formData.techStack, techInput.trim()],
      });
      setTechInput("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      techStack: formData.techStack.filter((t) => t !== tech),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    if (companies.length === 0) {
      toast.error("Please create a company first");
      router.push("/recruiter/companies");
      return;
    }

    if (!formData.companyId) {
      toast.error("Please select a company");
      return;
    }

    setSubmitting(true);
    try {
      const company = await getCompanyById(formData.companyId);

      const result = await createJob({
        title: formData.title,
        description: formData.description,
        role: formData.role,
        salary: parseInt(formData.salary),
        experience: parseInt(formData.experience),
        location: formData.location,
        openings: parseInt(formData.openings),
        companyId: formData.companyId,
        companyName: company?.name,
        companyLogo: company?.logo,
        recruiterId: currentUserId,
        techStack: formData.techStack,
        status: "open",
      });

      if (result.success) {
        toast.success("Job posted successfully!");
        router.push("/recruiter/jobs");
      } else {
        toast.error(result.error || "Failed to post job");
      }
    } catch (error) {
      toast.error("Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">You need to create a company first</p>
              <Button onClick={() => router.push("/recruiter/companies")}>
                Go to Companies
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
            Post New Job
          </h1>
          <p className="text-gray-600 mt-2">
            Create a job posting with AI-powered interview generation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Selection */}
              <div>
                <Label htmlFor="company">Company *</Label>
                <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })}>
                  <SelectTrigger data-testid="company-select">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Job Title */}
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Full Stack Developer"
                  required
                  data-testid="job-title-input"
                />
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Full Stack Developer"
                  required
                  data-testid="job-role-input"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed job description, responsibilities, requirements..."
                  required
                  rows={6}
                  data-testid="job-description-input"
                />
              </div>

              {/* Tech Stack */}
              <div>
                <Label>Tech Stack * (For AI Interview Questions)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTech())}
                    placeholder="e.g. React, Node.js, MongoDB"
                    data-testid="tech-stack-input"
                  />
                  <Button type="button" onClick={handleAddTech} data-testid="add-tech-button">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.techStack.map((tech, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tech}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveTech(tech)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  AI will generate interview questions based on these technologies
                </p>
              </div>

              {/* Grid for numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary">Annual Salary (USD) *</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="80000"
                    required
                    data-testid="salary-input"
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Experience (Years) *</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="3"
                    required
                    data-testid="experience-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    required
                    data-testid="location-input"
                  />
                </div>

                <div>
                  <Label htmlFor="openings">Number of Openings *</Label>
                  <Input
                    id="openings"
                    type="number"
                    value={formData.openings}
                    onChange={(e) => setFormData({ ...formData, openings: e.target.value })}
                    placeholder="2"
                    required
                    data-testid="openings-input"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-job-button">
                  {submitting ? "Posting..." : "Post Job"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
