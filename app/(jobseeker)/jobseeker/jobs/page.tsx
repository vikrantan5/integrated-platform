"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { getAllJobsMerged } from "@/lib/actions/job.action";
import { Job } from "@/types";
import Navbar from "@/components/Navbar";
import JobCard from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function BrowseJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "recruiter" | "external">("all");
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/sign-in");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchTerm, locationFilter, statusFilter, sourceFilter, jobs]);

  const loadJobs = async () => {
    setLoading(true);
    const allJobs = await getAllJobsMerged();
    setJobs(allJobs);
    setLoading(false);
  };

  const filterJobs = () => {
    let filtered = jobs;

    // Filter by status
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Filter by source
    if (sourceFilter && sourceFilter !== "all") {
      filtered = filtered.filter((job) => (job.source || "recruiter") === sourceFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(term) ||
          job.description.toLowerCase().includes(term) ||
          job.role.toLowerCase().includes(term) ||
          job.companyName?.toLowerCase().includes(term) ||
          job.externalCompany?.toLowerCase().includes(term) ||
          job.techStack.some((tech) => tech.toLowerCase().includes(term))
      );
    }

    // Filter by location
    if (locationFilter) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  };

  const handleTriggerScraping = async () => {
    setScraping(true);
    toast.info("Starting job scraping...");

    try {
      const response = await fetch("/api/jobs/scrape", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully scraped ${data.summary.saved} new jobs!`);
        // Reload jobs
        await loadJobs();
      } else {
        toast.warning(data.message || "Scraping completed with issues");
      }
    } catch (error: any) {
      toast.error("Failed to trigger scraping: " + error.message);
    } finally {
      setScraping(false);
    }
  };

  const recruiterJobsCount = jobs.filter((j) => (j.source || "recruiter") === "recruiter").length;
  const externalJobsCount = jobs.filter((j) => j.source === "external").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
                Browse Jobs
              </h1>
              <p className="text-gray-600 mt-2">
                Find your next opportunity from recruiter posts and external companies
              </p>
            </div>
            <Button
              onClick={handleTriggerScraping}
              disabled={scraping}
              variant="outline"
              data-testid="trigger-scrape-button"
            >
              {scraping ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh External Jobs
                </>
              )}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              {recruiterJobsCount} Recruiter Jobs
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              {externalJobsCount} External Jobs
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs, roles, tech..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>

            <Input
              placeholder="Location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              data-testid="location-filter"
            />

            <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
              <SelectTrigger data-testid="source-filter">
                <SelectValue placeholder="Job Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="recruiter">Recruiter Only</SelectItem>
                <SelectItem value="external">External Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          {loading ? "Loading..." : `${filteredJobs.length} jobs found`}
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No jobs found matching your criteria</p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setLocationFilter("");
                setStatusFilter("all");
                setSourceFilter("all");
              }}
              variant="outline"
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}