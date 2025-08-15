"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, BookOpen, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ClassroomWithAssignments } from "@/types/classroom";

interface ClassroomCardProps {
  classroom: ClassroomWithAssignments & {
    member_count?: number;
    assignment_count?: number;
    active_assignments_count?: number;
  };
}

export function ClassroomCard({ classroom }: ClassroomCardProps) {
  const memberCount = classroom.member_count || 0;
  const assignmentCount =
    classroom.assignment_count || classroom.assignments?.length || 0;
  const activeAssignments =
    classroom.active_assignments_count ||
    classroom.assignments?.filter((a) => a.is_active).length ||
    0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {classroom.name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {classroom.description || "No description provided"}
            </CardDescription>
          </div>
          <Badge variant={classroom.is_active ? "default" : "secondary"}>
            {classroom.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{memberCount} students</span>
          </div>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">
              {assignmentCount} assignments
            </span>
          </div>
        </div>

        {/* Join Code */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Join Code</p>
            <p className="text-lg font-mono font-bold">{classroom.join_code}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(classroom.join_code)}
          >
            Copy
          </Button>
        </div>

        {/* Active Assignments Badge */}
        {activeAssignments > 0 && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              {activeAssignments} active assignment
              {activeAssignments !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button asChild className="flex-1">
            <Link href={`/classrooms/${classroom.id}`}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/classrooms/${classroom.id}/assignments`}>
              Assignments
            </Link>
          </Button>
        </div>

        {/* Created Date */}
        <p className="text-xs text-muted-foreground pt-2">
          Created {new Date(classroom.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
