"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { ViewAndGradeDialog } from "./view-and-grade-dialog";
import { ViewSubmissionDialog } from "./view-submission-dialog";
import { GradeSubmissionForm } from "./grade-submission-form";
import { SubmissionWithDetails } from "@/lib/supabase/grading";
import { User, Bot } from "lucide-react";

interface GradingTableProps {
  submissions: SubmissionWithDetails[];
  userId: string;
  mapId?: string;
  assignmentId?: string;
}

export function GradingTable({
  submissions,
  userId,
  mapId,
  assignmentId,
}: GradingTableProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nodeFilter, setNodeFilter] = useState<string>("all");

  // Filter out submissions that do not belong to the current map
  const validSubmissions = submissions.filter(
    (s) =>
      s &&
      s.node_assessments &&
      s.node_assessments.map_nodes &&
      s.node_assessments.map_nodes.title &&
      (!mapId || s.node_assessments.map_nodes.map_id === mapId)
  );

  // Get unique nodes for filtering
  const uniqueNodes = Array.from(
    new Set(validSubmissions.map((s) => s.node_assessments.map_nodes.title))
  );

  // Get unique maps for filtering (when showing classroom-wide submissions)
  const uniqueMaps = Array.from(
    new Set(validSubmissions.map((s) => 
      s.node_assessments?.map_nodes?.learning_maps?.title || "Unknown Map"
    ))
  );

  const [mapFilter, setMapFilter] = useState<string>("all");

  // Filter submissions
  const filteredSubmissions = validSubmissions.filter((submission) => {
    const matchesSearch = submission.student_node_progress.profiles.username
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" &&
        submission.submission_grades.length === 0) ||
      (statusFilter === "graded" && submission.submission_grades.length > 0) ||
      (statusFilter === "passed" &&
        submission.submission_grades[0]?.grade === "pass") ||
      (statusFilter === "failed" &&
        submission.submission_grades[0]?.grade === "fail");

    const matchesNode =
      nodeFilter === "all" ||
      (submission.node_assessments &&
        submission.node_assessments.map_nodes &&
        submission.node_assessments.map_nodes.title === nodeFilter);

    const matchesMap =
      mapFilter === "all" ||
      (submission.node_assessments?.map_nodes?.learning_maps?.title === mapFilter);

    return matchesSearch && matchesStatus && matchesNode && matchesMap;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      // Reset after a short delay to show the refresh animation
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getStatusIcon = (submission: SubmissionWithDetails) => {
    if (submission.submission_grades.length === 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    const grade = submission.submission_grades[0];
    if (grade.grade === "pass") {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (submission: SubmissionWithDetails) => {
    if (submission.submission_grades.length === 0) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    const grade = submission.submission_grades[0];
    if (grade.grade === "pass") {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const getSubmissionTypeIcon = (submission: SubmissionWithDetails) => {
    const type = submission.node_assessments.assessment_type;
    switch (type) {
      case "file_upload":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "text_answer":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "quiz":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Assignment Filter Note */}
      {assignmentId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <GraduationCap className="h-4 w-4" />
            <span className="font-medium">Assignment Filter Active</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Showing submissions filtered for a specific classroom assignment.
          </p>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={nodeFilter} onValueChange={setNodeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Nodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Nodes</SelectItem>
              {uniqueNodes.map((node) => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!mapId && uniqueMaps.length > 1 && (
            <Select value={mapFilter} onValueChange={setMapFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Maps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Maps</SelectItem>
                {uniqueMaps.map((map) => (
                  <SelectItem key={map} value={map}>
                    {map}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSubmissions.length} of {validSubmissions.length} valid
        submissions
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              {!mapId && <TableHead>Map</TableHead>}
              <TableHead>Node</TableHead>
              <TableHead>Assessment Type</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Graded By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={!mapId ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {submissions.length === 0
                    ? "No submissions found for this classroom."
                    : "No submissions match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredSubmissions.map((submission) => {
                const grade = submission.submission_grades[0];
                const isAutoGraded = grade && grade.graded_by === null;
                const graderInfo = grade
                  ? isAutoGraded
                    ? {
                        name: "System",
                        icon: <Bot className="h-3 w-3 text-purple-600" />,
                      }
                    : {
                        name: "Instructor",
                        icon: <User className="h-3 w-3 text-blue-600" />,
                      }
                  : null;

                return (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.student_node_progress.profiles.username}
                    </TableCell>
                    {!mapId && (
                      <TableCell>
                        <span className="text-sm">
                          {submission.node_assessments?.map_nodes?.learning_maps?.title || "Unknown Map"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      {submission.node_assessments?.map_nodes?.title ||
                        "Unknown Node"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {submission.node_assessments.assessment_type.replace(
                          "_",
                          " "
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {submission.submission_grades.length > 0 ? (
                          <>
                            <Badge
                              variant={
                                submission.submission_grades[0].grade === "pass"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {submission.submission_grades[0].grade.toUpperCase()}
                            </Badge>
                            {isAutoGraded && (
                              <Badge variant="secondary" className="text-xs">
                                🤖 Auto
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">PENDING</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {graderInfo ? (
                        <div className="flex items-center gap-2">
                          {graderInfo.icon}
                          <span className="text-sm">{graderInfo.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ViewSubmissionDialog submission={submission} />
                        {/* Only show grade button for non-auto-graded submissions */}
                        {(submission.submission_grades.length === 0 ||
                          submission.submission_grades[0].graded_by !==
                            null) && (
                          <GradeSubmissionForm
                            submission={submission}
                            userId={userId}
                          />
                        )}
                        {/* Show "Auto-Graded" indicator for system grades */}
                        {submission.submission_grades.length > 0 &&
                          submission.submission_grades[0].graded_by ===
                            null && (
                            <Badge variant="outline" className="text-xs">
                              Auto-Graded
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
