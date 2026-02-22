import Link from "next/link";
import { Job } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, DollarSign, Clock, Building2, ExternalLink, Globe } from "lucide-react";
import { formatSalary, formatDate } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  showActions?: boolean;
  actionButton?: React.ReactNode;
}

export default function JobCard({ job, showActions = true, actionButton }: JobCardProps) {
    const isExternal = job.source === "external";
  const displayCompany = isExternal ? job.externalCompany : job.companyName;
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`job-card-${job.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
             {isExternal && job.externalUrl ? (
              <a href={job.externalUrl} target="_blank" rel="noopener noreferrer">
                <h3 className="text-xl font-semibold hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2" data-testid="job-title">
                  {job.title}
                  <ExternalLink className="h-4 w-4" />
                </h3>
              </a>
            ) : (
            <Link href={`/jobseeker/jobs/${job.id}`}>
              <h3 className="text-xl font-semibold hover:text-blue-600 transition-colors cursor-pointer" data-testid="job-title">
                {job.title}
              </h3>
            </Link>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="h-4 w-4" />
               <span>{displayCompany || "Company"}</span>
              </div>
              {isExternal && (
                <Badge variant="secondary" className="flex items-center gap-1" data-testid="external-badge">
                  <Globe className="h-3 w-3" />
                  External
                </Badge>
              )}
              {!isExternal && (
                <Badge variant="default" className="bg-green-600" data-testid="recruiter-badge">
                  Recruiter
                </Badge>
              )}
            </div>
          </div>
          <Badge variant={job.status === "open" ? "success" : "secondary"} data-testid="job-status">
            {job.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-gray-600 line-clamp-2">{job.description}</p>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          {!isExternal && (
          <div className="flex items-center gap-1 text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span>{formatSalary(job.salary)}</span>
          </div>
          )}
          <div className="flex items-center gap-1 text-gray-600">
            <Briefcase className="h-4 w-4" />
            <span>{job.experience} years exp</span>
          </div>
           {!isExternal && (
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{job.openings} openings</span>
          </div>
           )}
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

        <p className="text-xs text-gray-500">Posted {formatDate(job.createdAt)}</p>
      </CardContent>

      {showActions && (
        <CardFooter>
          {actionButton || (
            isExternal && job.externalUrl ? (
              <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full" data-testid="view-job-button">
                  Apply on Company Site
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            ) : (
            <Link href={`/jobseeker/jobs/${job.id}`} className="w-full">
              <Button className="w-full" data-testid="view-job-button">
                View Details
              </Button>
            </Link>
            )
          )}
        </CardFooter>
      )}
    </Card>
  );
}
