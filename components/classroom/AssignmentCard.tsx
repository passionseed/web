"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Users,
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";
import { ClassroomAssignment } from "@/types/classroom";
import { AssignmentDetailsModal } from "./AssignmentDetailsModal";

interface AssignmentCardProps {
  assignment: ClassroomAssignment & {
    _count?: {
      assignment_nodes: number;
      assignment_enrollments: number;
    };
    progress_stats?: {
      total_students: number;
      completed: number;
      in_progress: number;
      not_started: number;
    };
  };
  canManage: boolean;
  onAssignmentUpdated: () => void;
}

export function AssignmentCard({
  assignment,
  canManage,
  onAssignmentUpdated,
}: AssignmentCardProps) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = () => {
    if (!assignment.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (assignment.default_due_date) {
      const dueDate = new Date(assignment.default_due_date);
      const now = new Date();

      if (dueDate < now) {
        return <Badge variant="destructive">Overdue</Badge>;
      } else if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
        return (
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-600"
          >
            Due Soon
          </Badge>
        );
      }
    }

    return <Badge variant="default">Active</Badge>;
  };

  const getCompletionRate = () => {
    if (
      !assignment.progress_stats ||
      assignment.progress_stats.total_students === 0
    ) {
      return 0;
    }
    return Math.round(
      (assignment.progress_stats.completed /
        assignment.progress_stats.total_students) *
        100
    );
  };

  const handleEdit = () => {
    // For now, show a simple alert with assignment info
    // TODO: Open edit assignment modal
    alert(
      `Edit Assignment:\n\nTitle: ${assignment.title}\nDescription: ${assignment.description || "No description"}\n\nEdit functionality will be implemented in a future update.`
    );
    console.log("Edit assignment:", assignment.id);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this assignment? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/assignments?assignment_id=${assignment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete assignment");
      }

      onAssignmentUpdated();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment. Please try again.");
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await fetch("/api/assignments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignment_id: assignment.id,
          is_active: !assignment.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update assignment status"
        );
      }

      onAssignmentUpdated();
    } catch (error) {
      console.error("Error updating assignment status:", error);
      alert("Failed to update assignment status. Please try again.");
    }
  };

  const handleViewDetails = () => {
    setIsDetailsModalOpen(true);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg leading-tight">
              {assignment.title}
            </CardTitle>
            {assignment.description && (
              <CardDescription className="line-clamp-2">
                {assignment.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {getStatusBadge()}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Assignment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    <Settings className="h-4 w-4 mr-2" />
                    {assignment.is_active ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Assignment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Assignment Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{assignment._count?.assignment_nodes || 0} nodes</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {assignment._count?.assignment_enrollments || 0} students
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {assignment.progress_stats &&
          assignment.progress_stats.total_students > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">{getCompletionRate()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${getCompletionRate()}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{assignment.progress_stats.completed} completed</span>
                <span>{assignment.progress_stats.in_progress} in progress</span>
                <span>{assignment.progress_stats.not_started} not started</span>
              </div>
            </div>
          )}

        {/* Due Date */}
        {assignment.default_due_date && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due {formatDate(assignment.default_due_date)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>

      <AssignmentDetailsModal
        assignment={assignment}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        canManage={canManage}
      />
    </Card>
  );
}
