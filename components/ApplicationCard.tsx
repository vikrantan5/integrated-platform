import Link from "next/link";
import { Application } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Award } from "lucide-react";
import { formatSalary, formatDate } from "@/lib/utils";

interface ApplicationCardProps {
  application: Application;
  showInterviewButton?: boolean;
}

export default function ApplicationCard({
  application,
  showInterviewButton = true,
}: ApplicationCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "accepted":
        return "success";
      case "rejected":
        return "destructive";
      default:
        return "warning";
    }
  };

  const getInterviewStatusBadge = () => {
    if (!application.interviewId) {
      return <Badge variant="outline">No Interview</Badge>;
    }
    switch (application.interviewStatus) {
      case "completed":
        return <Badge variant="success">Interview Completed</Badge>;
      case "pending":
        return <Badge variant="warning">Interview Pending</Badge>;
      case "skipped":
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card data-testid={`application-card-${application.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold" data-testid="application-job-title">
              {application.jobName}
            </h3>
            {application.companyName && (
              <p className="text-sm text-gray-600 mt-1">{application.companyName}</p>
            )}
          </div>
          <Badge variant={getStatusVariant(application.status)} data-testid="application-status">
            {application.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{formatSalary(application.jobSalary)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Applied {formatDate(application.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-gray-600" />
          {getInterviewStatusBadge()}
        </div>

        {showInterviewButton &&
          application.interviewId &&
          application.interviewStatus === "pending" && (
            <Link href={`/interview/${application.interviewId}`}>
              <Button className="w-full mt-2" data-testid="take-interview-button">
                Take Interview
              </Button>
            </Link>
          )}

        {application.interviewId && application.interviewStatus === "completed" && (
          <Link href={`/interview/${application.interviewId}/feedback`}>
            <Button variant="outline" className="w-full mt-2" data-testid="view-feedback-button">
              View Feedback
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
