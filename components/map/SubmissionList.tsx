"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  Users,
  User,
  RefreshCw,
} from "lucide-react";
import { SubmissionWithDetails } from "@/lib/supabase/grading";

interface SubmissionListProps {
  submissions: SubmissionWithDetails[];
  onSelectSubmission: (submission: SubmissionWithDetails) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  selectedNode?: any;
}

export function SubmissionList({
  submissions,
  onSelectSubmission,
  onRefresh,
  isLoading = false,
  selectedNode,
}: SubmissionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nodeFilter, setNodeFilter] = useState<string>("all");

  // Filter submissions based on selected node if provided
  const filteredByNode = selectedNode
    ? submissions.filter(
        (sub) => sub.node_assessments?.map_nodes?.id === selectedNode.id
      )
    : submissions;

  // Get unique nodes for filtering
  const uniqueNodes = Array.from(
    new Set(
      filteredByNode
        .map((s) => s.node_assessments?.map_nodes?.title)
        .filter(Boolean)
    )
  );

  // Apply filters
  const filteredSubmissions = filteredByNode.filter((submission) => {
    const matchesSearch = submission.student_node_progress.profiles.username
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && submission.submission_grades.length === 0) ||
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

    return matchesSearch && matchesStatus && matchesNode;
  });

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

  const getAssessmentTypeBadge = (submission: SubmissionWithDetails) => (
    <Badge variant="outline" className="capitalize text-xs">
      {submission.node_assessments.assessment_type.replace("_", " ")}
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading submissions...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            Submissions ({filteredSubmissions.length})
          </h3>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {uniqueNodes.length > 0 && (
            <Select value={nodeFilter} onValueChange={setNodeFilter}>
              <SelectTrigger className="w-32">
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
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {submissions.length === 0 ? (
              <>
                <Clock className="h-12 w-12 mx-auto mb-2" />
                <p>No submissions yet</p>
              </>
            ) : (
              <>
                <Search className="h-12 w-12 mx-auto mb-2" />
                <p>No submissions match your filters</p>
              </>
            )}
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectSubmission(submission)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {submission.student_node_progress.profiles.username
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">
                      {submission.student_node_progress.profiles.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {submission.node_assessments?.map_nodes?.title || "Unknown Node"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getAssessmentTypeBadge(submission)}
                  {getStatusBadge(submission)}
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
              </div>

              {/* Quick preview */}
              {submission.text_answer && (
                <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {submission.text_answer.length > 80
                    ? `${submission.text_answer.substring(0, 80)}...`
                    : submission.text_answer}
                </div>
              )}

              {submission.file_urls && submission.file_urls.length > 0 && (
                <div className="mt-1 text-xs text-blue-600">
                  📎 {submission.file_urls.length} file(s)
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}