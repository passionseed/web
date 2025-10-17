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
import { Users, Calendar, BookOpen, TrendingUp, Clock, CheckCircle, AlertCircle, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ClassroomWithAssignments } from "@/types/classroom";

interface ClassroomCardProps {
  classroom: ClassroomWithAssignments & {
    member_count?: number;
    student_count?: number;
    instructor_count?: number;
    ta_count?: number;
    assignment_count?: number;
    active_assignments_count?: number;
    userRole?: string;
    // Student-specific data
    pending_assignments?: number;
    completed_assignments?: number;
    overdue_assignments?: number;
    next_due_date?: string;
    recent_grade?: string;
    progress_percentage?: number;
  };
}

export function ClassroomCard({ classroom }: ClassroomCardProps) {
  const router = useRouter();
  const memberCount = classroom.member_count || 0;
  const studentCount = classroom.student_count || 0;
  const instructorCount = classroom.instructor_count || 0;
  const taCount = classroom.ta_count || 0;
  const assignmentCount =
    classroom.assignment_count || classroom.assignments?.length || 0;
  const activeAssignments =
    classroom.active_assignments_count ||
    classroom.assignments?.filter((a) => a.is_active).length ||
    0;

  const isStudent = classroom.userRole === "student";
  const isInstructor = classroom.userRole === "instructor";
  const isTA = classroom.userRole === "ta";

  // Student-specific data
  const pendingAssignments = classroom.pending_assignments || 0;
  const completedAssignments = classroom.completed_assignments || 0;
  const overdueAssignments = classroom.overdue_assignments || 0;
  const progressPercentage = classroom.progress_percentage || 0;

  // Show student count for students, member count for instructors/TAs
  const displayCount = isStudent ? studentCount : memberCount;
  const displayLabel = isStudent ? 'Student' : 'Member';

  // Debug logging
  console.log('ClassroomCard debug:', {
    classroomId: classroom.id,
    classroomName: classroom.name,
    userRole: classroom.userRole,
    memberCount,
    studentCount,
    instructorCount,
    taCount,
    rawClassroom: classroom
  });

  const handleCardClick = () => {
    router.push(`/classrooms/${classroom.id}`);
  };

  return (
      <Card 
        className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
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
          <div className="flex gap-2">
            {classroom.userRole && (
              <Badge
                variant={
                  classroom.userRole === "instructor" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {classroom.userRole === "instructor"
                  ? "Instructor"
                  : classroom.userRole === "ta"
                    ? "TA"
                    : "Student"}
              </Badge>
            )}
            <Badge variant={classroom.is_active ? "default" : "secondary"}>
              {classroom.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Student View */}
        {isStudent && (
          <>
            {/* Student Progress Overview */}
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Progress</span>
                  <span className="text-sm font-bold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Assignment Stats for Students */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      {pendingAssignments}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-500">Pending</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm font-bold text-green-700 dark:text-green-400">
                      {completedAssignments}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-500">Done</div>
                  </div>
                </div>
              </div>

              {/* Members Info for Students */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">Classroom Members ({memberCount})</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      {studentCount}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-500">Students</div>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-purple-50 dark:bg-purple-950/20 rounded">
                    <div className="text-sm font-bold text-purple-700 dark:text-purple-400">
                      {instructorCount}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-500">Instructors</div>
                  </div>
                  <div className="flex flex-col items-center p-1.5 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="text-sm font-bold text-green-700 dark:text-green-400">
                      {taCount}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-500">TAs</div>
                  </div>
                </div>
              </div>

              {/* Overdue Alert */}
              {overdueAssignments > 0 && (
                <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-sm font-medium text-red-700 dark:text-red-400">
                      {overdueAssignments} overdue assignment{overdueAssignments !== 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-500">Needs attention</div>
                  </div>
                </div>
              )}

              {/* Next Due Date */}
              {classroom.next_due_date && (
                <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-700 dark:text-orange-400">Next due:</span>
                  </div>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    {new Date(classroom.next_due_date).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Recent Grade */}
              {classroom.recent_grade && (
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-purple-700 dark:text-purple-400">Latest grade:</span>
                  </div>
                  <span className="text-sm font-bold text-purple-800 dark:text-purple-300">
                    {classroom.recent_grade}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Instructor/TA View */}
        {(isInstructor || isTA) && (
          <>
            {/* Members Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Members</span>
                </div>
                <span className="text-lg font-bold">{memberCount}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {studentCount}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">Students</div>
                </div>
                <div className="flex flex-col items-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                    {instructorCount}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-500">Instructors</div>
                </div>
                <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-lg font-bold text-green-700 dark:text-green-400">
                    {taCount}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500">TAs</div>
                </div>
              </div>

              {/* Assignments */}
              <div className="flex items-center space-x-2 pt-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''}
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
          </>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {isStudent ? (
            <>
              <Button 
                className="flex-1" 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/classrooms/${classroom.id}?tab=assignments`);
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Assignments
              </Button>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/classrooms/${classroom.id}?tab=students`);
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                My Progress
              </Button>
            </>
          ) : (
            <>
              <Button 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/classrooms/${classroom.id}`);
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/classrooms/${classroom.id}?tab=assignments`);
                }}
              >
                Assignments
              </Button>
            </>
          )}
        </div>

        {/* Created Date */}
        <p className="text-xs text-muted-foreground pt-2">
          Created {new Date(classroom.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
