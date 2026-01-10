"use client";

import { useState, useEffect, useCallback } from "react";
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
  GraduationCap,
  Compass,
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
import { ClassroomGrading } from "./ClassroomGrading";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import StudentMapsViewWrapper from "./StudentMapsViewWrapper";
import { ClassroomDirectionFinder } from "./ClassroomDirectionFinder";

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
  totalMembers: number;
  totalStudents: number;
  totalInstructors: number;
  totalTAs: number;
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
    totalMembers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalTAs: 0,
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
            totalMembers: 0,
            totalStudents: 0,
            totalInstructors: 0,
            totalTAs: 0,
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

      setStats(statsData);
      setAssignments(assignmentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Failed to load classroom data:", error);
      // Set default values on error
      setStats({
        totalMembers: 0,
        totalStudents: 0,
        totalInstructors: 0,
        totalTAs: 0,
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

  const defaultTab =
    classroom.enable_assignments === false ? "maps" : "assignments";
  const currentTab = searchParams?.get("tab") ?? defaultTab;

  const loadStudentsData = useCallback(async () => {
    console.log("🔄 [DEBUG] Loading students data for tab click...");
    try {
      // Add cache busting to force fresh API call
      const cacheBuster = `?t=${Date.now()}`;
      const studentsResponse = await fetch(
        `/api/classrooms/${classroom.id}/students${cacheBuster}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      console.log("📡 [DEBUG] API Response status:", studentsResponse.status);
      console.log(
        "📡 [DEBUG] API Response headers:",
        Object.fromEntries(studentsResponse.headers.entries())
      );

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        console.log("📋 [DEBUG] Students data received in dashboard:");
        console.table(studentsData);
        console.log(
          "🔍 [DEBUG] Full students data:",
          JSON.stringify(studentsData, null, 2)
        );
        setStudents(studentsData);
      } else {
        console.error(
          "❌ [DEBUG] Failed to fetch students:",
          studentsResponse.status,
          studentsResponse.statusText
        );
        setStudents([]);
      }
    } catch (error) {
      console.error("💥 [DEBUG] Error loading students:", error);
      setStudents([]);
    }
  }, [classroom.id]);

  const debugUser = async (userId: string) => {
    console.log("🔍 [DEBUG] Checking user data for:", userId);
    try {
      const response = await fetch(`/api/debug/user/${userId}`);
      const data = await response.json();
      console.log("🎯 [DEBUG] User diagnostic data:", data);
    } catch (error) {
      console.error("💥 [DEBUG] Error fetching user debug data:", error);
    }
  };

  // Load students data when students tab is initially active
  useEffect(() => {
    if (currentTab === "students") {
      console.log(
        "🎯 [DEBUG] Students tab is initially active, loading students data..."
      );
      loadStudentsData();
    }
  }, [currentTab, loadStudentsData]);

  const handleTabChange = (value: string) => {
    console.log("🔀 [DEBUG] Tab changed to:", value);

    // Load students data when students tab is clicked
    if (value === "students") {
      loadStudentsData();
    }

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Redirect to maps tab if currently on assignments tab but assignments are disabled
  useEffect(() => {
    if (
      classroom.enable_assignments === false &&
      currentTab === "assignments"
    ) {
      handleTabChange("maps");
    }
  }, [classroom.enable_assignments]);

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
            {classroom.enable_assignments !== false && (
              <CreateAssignmentModal
                classroomId={classroom.id}
                onAssignmentCreated={loadClassroomData}
              />
            )}
            <ClassroomSettingsModal
              classroom={classroom}
              onSettingsUpdated={() => {
                // Refresh the entire page to get updated classroom data
                router.refresh();
              }}
            />
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Classroom Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{stats.totalMembers}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Students</span>
                <span className="font-medium text-blue-600">
                  {stats.totalStudents}
                </span>
              </div>
              {stats.totalInstructors > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Instructors</span>
                  <span className="font-medium text-purple-600">
                    {stats.totalInstructors}
                  </span>
                </div>
              )}
              {stats.totalTAs > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">TAs</span>
                  <span className="font-medium text-green-600">
                    {stats.totalTAs}
                  </span>
                </div>
              )}
            </div>
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
          {classroom.enable_assignments !== false && (
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          )}
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="maps">Learning Maps</TabsTrigger>
          {canManage && (
            <TabsTrigger value="grading" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Grading
            </TabsTrigger>
          )}
          {canManage && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {canManage && (
            <TabsTrigger
              value="direction-results"
              className="flex items-center gap-2"
            >
              <Compass className="h-4 w-4" />
              Direction Results
            </TabsTrigger>
          )}
        </TabsList>

        {classroom.enable_assignments !== false && (
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {classroom.enable_assignments === false
                  ? "Learning Maps"
                  : "Assignments"}
              </h3>
              {canManage && classroom.enable_assignments !== false && (
                <CreateAssignmentModal
                  classroomId={classroom.id}
                  onAssignmentCreated={loadClassroomData}
                  variant="outline"
                />
              )}
            </div>

            {classroom.enable_assignments === false ? (
              // Show learning maps when assignments are disabled
              <div className="space-y-4">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                      <BookOpen className="w-3 h-3 text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Map-Based Progress Tracking
                      </p>
                      <p className="text-sm text-blue-700">
                        Assignment system is disabled. Student progress is
                        tracked through completion of linked learning maps.
                        Students work directly with maps and their progress is
                        calculated based on node completion.
                      </p>
                    </div>
                  </div>
                </div>

                <ClassroomMapsManager
                  classroomId={classroom.id}
                  canManage={canManage}
                  enableAssignments={classroom.enable_assignments !== false}
                  onMapsUpdated={loadClassroomData}
                />
              </div>
            ) : loading ? (
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
                <h3 className="text-lg font-semibold mb-2">
                  No assignments yet
                </h3>
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
        )}

        <TabsContent value="teams" className="space-y-4">
          <Tabs defaultValue="manage" className="space-y-6">
            <TabsList>
              <TabsTrigger value="manage">Team Management</TabsTrigger>
              {canManage && (
                <TabsTrigger value="grading">Team Grading</TabsTrigger>
              )}
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
                  {classroom.enable_assignments === false
                    ? "Link learning maps for student progress tracking"
                    : "Link learning maps to create assignments from their nodes"}
                </p>
              </div>

              <ClassroomMapsManager
                classroomId={classroom.id}
                canManage={canManage}
                enableAssignments={classroom.enable_assignments !== false}
                onMapsUpdated={loadClassroomData}
              />
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
              Members ({stats.totalMembers})
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

        {canManage && (
          <TabsContent value="grading" className="space-y-4">
            <ClassroomGrading
              classroomId={classroom.id}
              canManage={canManage}
            />
          </TabsContent>
        )}

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

        {canManage && (
          <TabsContent value="direction-results" className="space-y-4">
            <ClassroomDirectionFinder classroomId={classroom.id} />
            {/* <div className="p-4 border rounded">
              Debugging: Feature disabled temporarily
            </div> */}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
