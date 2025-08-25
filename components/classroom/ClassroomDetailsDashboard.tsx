"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Calendar,
  BookOpen,
  Plus,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
} from "lucide-react";
import { Classroom } from "@/types/classroom";
import { CreateAssignmentModal } from "./CreateAssignmentModal";
import { AssignmentCard } from "./AssignmentCard";
import { StudentProgressTable } from "./StudentProgressTable";
import { StudentProgressView } from "./StudentProgressView";
import { ClassroomSettingsModal } from "./ClassroomSettingsModal";
import { ClassroomMapsManager } from "./ClassroomMapsManager";
import { ClassroomTeamsManager } from "./ClassroomTeamsManager";
import { GroupManagement } from "./GroupManagement";
import { TeamGrading } from "./TeamGrading";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import StudentMapsViewWrapper from "./StudentMapsViewWrapper";

interface ClassroomDetailsDashboardProps {
  classroom: Classroom & {
    classroom_memberships: Array<{
      role: string;
      joined_at: string;
    }>;
  };
  userRole: string;
  canManage: boolean;
}

interface DashboardStats {
  totalStudents: number;
  activeAssignments: number;
  completionRate: number;
  averageProgress: number;
}

export function ClassroomDetailsDashboard({
  classroom,
  userRole,
  canManage,
}: ClassroomDetailsDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeAssignments: 0,
    completionRate: 0,
    averageProgress: 0,
  });
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassroomData();
  }, [classroom.id]);

  const loadClassroomData = async () => {
    try {
      setLoading(true);

      // Load stats, assignments, and students
      const [statsResponse, assignmentsResponse, studentsResponse] =
        await Promise.all([
          fetch(`/api/classrooms/${classroom.id}/stats`),
          fetch(`/api/classrooms/${classroom.id}/assignments`),
          fetch(`/api/classrooms/${classroom.id}/students`),
        ]);

      // Check for errors and parse responses
      const statsData = statsResponse.ok
        ? await statsResponse.json()
        : {
            totalStudents: 0,
            activeAssignments: 0,
            completionRate: 0,
            averageProgress: 0,
          };

      const assignmentsData = assignmentsResponse.ok
        ? await assignmentsResponse.json()
        : [];

      const studentsData = studentsResponse.ok
        ? await studentsResponse.json()
        : [];

      console.log("xx studentsData", studentsData);

      // Log errors for debugging
      if (!statsResponse.ok) {
        console.error("Failed to load stats:", await statsResponse.text());
      }
      if (!assignmentsResponse.ok) {
        console.error(
          "Failed to load assignments:",
          await assignmentsResponse.text()
        );
      }
      if (!studentsResponse.ok) {
        console.error(
          "Failed to load students:",
          await studentsResponse.text()
        );
      }

      setStats(statsData);
      setAssignments(assignmentsData);
      setStudents(studentsData);

      // Debug logging
      console.log("📊 Classroom Data Loaded:", {
        classroom: classroom.id,
        stats: statsData,
        assignments: assignmentsData,
        students: studentsData,
      });
    } catch (error) {
      console.error("Failed to load classroom data:", error);
      // Set default values on error
      setStats({
        totalStudents: 0,
        activeAssignments: 0,
        completionRate: 0,
        averageProgress: 0,
      });
      setAssignments([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sync active tab with URL query param `tab` (e.g. ?tab=teams)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams?.get("tab") ?? "assignments";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            <Badge variant={classroom.is_active ? "default" : "secondary"}>
              {classroom.is_active ? "active" : "inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{classroom.description}</p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>
              Join Code:{" "}
              <span className="font-mono font-bold">{classroom.join_code}</span>
            </span>
            <span>•</span>
            <span>Created {formatDate(classroom.created_at)}</span>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center space-x-2">
            <CreateAssignmentModal
              classroomId={classroom.id}
              onAssignmentCreated={loadClassroomData}
            />
            <ClassroomSettingsModal
              classroom={classroom}
              onSettingsUpdated={loadClassroomData}
            />
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in classroom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Assignments
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average across assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProgress}%</div>
            <p className="text-xs text-muted-foreground">Per student</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="maps">Learning Maps</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          {canManage && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Assignments</h3>
            {canManage && (
              <CreateAssignmentModal
                classroomId={classroom.id}
                onAssignmentCreated={loadClassroomData}
                variant="outline"
              />
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48 animate-pulse bg-muted" />
              ))}
            </div>
          ) : assignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments
                .filter((assignment: any) => assignment.is_active)
                .map((assignment: any) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    canManage={canManage}
                    onAssignmentUpdated={loadClassroomData}
                  />
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first assignment to get started.
              </p>
              {canManage && (
                <CreateAssignmentModal
                  classroomId={classroom.id}
                  onAssignmentCreated={loadClassroomData}
                />
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Tabs defaultValue="manage" className="space-y-6">
            <TabsList>
              <TabsTrigger value="manage">Team Management</TabsTrigger>
              {canManage && <TabsTrigger value="grading">Team Grading</TabsTrigger>}
            </TabsList>

            <TabsContent value="manage">
              <ClassroomTeamsManager
                classroomId={classroom.id}
                userRole={userRole}
                canManage={canManage}
              />
            </TabsContent>

            {canManage && (
              <TabsContent value="grading">
                <TeamGrading 
                  classroomId={classroom.id}
                  onGraded={() => {
                    // Optionally refresh data
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <GroupManagement
            classroomId={classroom.id}
            userRole={userRole as "instructor" | "ta" | "student"}
          />
        </TabsContent>

        <TabsContent value="maps" className="space-y-4">
          {canManage ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Learning Maps</h3>
                <p className="text-sm text-muted-foreground">
                  Link learning maps to create assignments from their nodes
                </p>
              </div>

              <ClassroomMapsManager classroomId={classroom.id} />
            </>
          ) : (
            // Student-focused, emphasized view
            <>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">🗺️ Learning Maps</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Fork learning maps to your team to create collaborative
                  workspaces where you can work through content and assessments
                  together.
                </p>
              </div>

              {/* Student maps view */}
              <div>
                <StudentMapsViewWrapper classroomId={classroom.id} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Students ({stats.totalStudents})
            </h3>
            {canManage && (
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
            )}
          </div>

          {loading ? (
            <Card className="h-64 animate-pulse bg-muted" />
          ) : students.length > 0 ? (
            canManage ? (
              <StudentProgressTable
                students={students}
                assignments={assignments}
                canManage={canManage}
              />
            ) : (
              <StudentProgressView
                students={students}
                assignments={assignments}
                currentUserId={user?.id || ""}
              />
            )
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No students enrolled
              </h3>
              <p className="text-muted-foreground">
                {canManage ? (
                  <>
                    Share the join code{" "}
                    <span className="font-mono font-bold">
                      {classroom.join_code}
                    </span>{" "}
                    with students to get started.
                  </>
                ) : (
                  "No students data available."
                )}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <h3 className="text-lg font-semibold">Overall Progress</h3>

          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
              <CardDescription>
                Real-time progress tracking across all assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>Progress visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="analytics" className="space-y-4">
            <h3 className="text-lg font-semibold">Analytics & Insights</h3>

            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed insights into student performance and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
