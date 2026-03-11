"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Users, Eye } from "lucide-react";

interface Student {
  id: string;
  user_id: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  joined_at: string;
  assignment_progress?: {
    assignment_id: string;
    status: "not_started" | "in_progress" | "submitted" | "completed";
    progress_percentage: number;
    due_date?: string;
    completed_at?: string;
  }[];
}

interface Assignment {
  id: string;
  title: string;
  default_due_date?: string;
}

interface StudentProgressViewProps {
  students: Student[];
  assignments: Assignment[];
  currentUserId: string;
}

export function StudentProgressView({
  students,
  assignments,
  currentUserId,
}: StudentProgressViewProps) {
  // Memoize student progress lookups to prevent O(N*M) calculations on every render
  const { overallProgressByStudent, assignmentProgressLookup } = useMemo(() => {
    const overallProgress = new Map<string, number>();
    const progressLookup = new Map<string, Map<string, NonNullable<Student["assignment_progress"]>[0]>>();

    students.forEach((student) => {
      // Calculate overall progress
      if (!student.assignment_progress || assignments.length === 0) {
        overallProgress.set(student.id, 0);
      } else {
        const totalProgress = student.assignment_progress.reduce(
          (sum, progress) => sum + progress.progress_percentage,
          0
        );
        overallProgress.set(student.id, Math.round(totalProgress / assignments.length));
      }

      // Build assignment progress lookup for O(1) access
      const studentAssignmentProgress = new Map<string, NonNullable<Student["assignment_progress"]>[0]>();
      student.assignment_progress?.forEach((p) => {
        studentAssignmentProgress.set(p.assignment_id, p);
      });
      progressLookup.set(student.id, studentAssignmentProgress);
    });

    return { overallProgressByStudent: overallProgress, assignmentProgressLookup: progressLookup };
  }, [students, assignments]);

  const getStudentName = (student: Student) => {
    return (
      student.user?.full_name ||
      student.user?.email?.split("@")[0] ||
      "Unknown Student"
    );
  };

  const getStudentInitials = (student: Student) => {
    const name = getStudentName(student);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            Completed
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="default" className="bg-blue-500">
            Submitted
          </Badge>
        );
      case "in_progress":
        return (
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-600"
          >
            In Progress
          </Badge>
        );
      case "not_started":
        return <Badge variant="secondary">Not Started</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleViewProgress = (student: Student) => {
    // TODO: Open detailed progress modal or navigate to student page
    console.log("View progress for student:", student.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Class Progress</h3>
        <Badge variant="outline">
          <Users className="h-4 w-4 mr-1" />
          {students.length} students
        </Badge>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Overall Progress</TableHead>
                {assignments.slice(0, 3).map((assignment) => (
                  <TableHead key={assignment.id} className="min-w-[120px]">
                    {assignment.title}
                  </TableHead>
                ))}
                {assignments.length > 3 && (
                  <TableHead>+{assignments.length - 3} more</TableHead>
                )}
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      4 +
                      (assignments.length > 3
                        ? 1
                        : Math.min(assignments.length, 3))
                    }
                    className="text-center py-8 text-muted-foreground"
                  >
                    No students enrolled yet
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow 
                    key={student.id} 
                    className={student.user_id === currentUserId ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getStudentInitials(student)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {getStudentName(student)}
                            {student.user_id === currentUserId && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {overallProgressByStudent.get(student.id) || 0}%
                          </span>
                        </div>
                        <Progress
                          value={overallProgressByStudent.get(student.id) || 0}
                          className="h-2"
                        />
                      </div>
                    </TableCell>

                    {assignments.slice(0, 3).map((assignment) => {
                      const progress = assignmentProgressLookup.get(student.id)?.get(assignment.id);
                      return (
                        <TableCell key={assignment.id}>
                          {progress ? (
                            <div className="space-y-1">
                              {getStatusBadge(progress.status)}
                              <div className="text-xs text-muted-foreground">
                                {progress.progress_percentage}%
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary">Not Enrolled</Badge>
                          )}
                        </TableCell>
                      );
                    })}

                    {assignments.length > 3 && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProgress(student)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}

                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(student.joined_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}