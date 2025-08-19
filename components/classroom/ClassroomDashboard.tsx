"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { ClassroomCard } from "./ClassroomCard";
import { CreateClassroomModal } from "./CreateClassroomModal";
import { ClassroomMapsManager } from "./ClassroomMapsManager";
import { useToast } from "@/hooks/use-toast";
import type { ClassroomWithAssignments } from "@/types/classroom";

interface DashboardStats {
  totalClassrooms: number;
  totalStudents: number;
  totalAssignments: number;
  activeAssignments: number;
}

interface ClassroomMembership {
  id: string;
  classroom_id: string;
  user_id: string;
  role: "instructor" | "ta" | "student";
  joined_at: string;
  classroom: ClassroomWithAssignments & {
    member_count: number;
    student_count: number;
  };
}

export function ClassroomDashboard() {
  const [classrooms, setClassrooms] = useState<
    (ClassroomWithAssignments & {
      member_count: number;
      student_count: number;
      userRole: string;
    })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCanCreateClassrooms, setUserCanCreateClassrooms] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClassrooms: 0,
    totalStudents: 0,
    totalAssignments: 0,
    activeAssignments: 0,
  });
  const { toast } = useToast();

  const loadClassrooms = async () => {
    setIsLoading(true);
    try {
      // Fetch user's classroom memberships (works for all roles)
      const response = await fetch("/api/classrooms");
      if (!response.ok) {
        throw new Error("Failed to fetch classrooms");
      }

      const memberships: ClassroomMembership[] = await response.json();

      // Transform memberships to classroom format with user role
      const classroomList = memberships.map((membership) => ({
        ...membership.classroom,
        userRole: membership.role,
        member_count: 0, // Will be fetched separately if needed
        student_count: 0, // Will be fetched separately if needed
        assignments: [], // Will be fetched separately if needed
        assignment_count: 0,
        active_assignment_count: 0,
      }));

      setClassrooms(classroomList);

      // Check if user can create classrooms (has instructor or TA role in any classroom)
      const hasInstructorRole = memberships.some(
        (membership) =>
          membership.role === "instructor" || membership.role === "ta"
      );
      setUserCanCreateClassrooms(hasInstructorRole);

      // Calculate stats
      const totalClassrooms = classroomList.length;
      const totalStudents = classroomList.reduce(
        (sum: number, classroom) => sum + (classroom.member_count || 0),
        0
      );
      const totalAssignments = classroomList.reduce(
        (sum: number, classroom) => sum + (classroom.assignments?.length || 0),
        0
      );
      const activeAssignments = classroomList.reduce(
        (sum: number, classroom) =>
          sum +
          (classroom.assignments?.filter((a: any) => a.is_active).length || 0),
        0
      );

      setStats({
        totalClassrooms,
        totalStudents,
        totalAssignments,
        activeAssignments,
      });
    } catch (error) {
      console.error("Load classrooms error:", error);
      toast({
        title: "Error",
        description: "Failed to load classrooms",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const activeClassrooms = classrooms.filter((c) => c.is_active);
  const inactiveClassrooms = classrooms.filter((c) => !c.is_active);

  if (isLoading) {
    return <ClassroomDashboardSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classroom Dashboard</h1>
          <p className="text-muted-foreground">
            {userCanCreateClassrooms
              ? "Manage your classrooms, assignments, and track student progress"
              : "View your classrooms, assignments, and track your learning progress"}
          </p>
        </div>
        {userCanCreateClassrooms && (
          <CreateClassroomModal onClassroomCreated={loadClassrooms} />
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Classrooms
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
            <p className="text-xs text-muted-foreground">
              {activeClassrooms.length} active
            </p>
          </CardContent>
        </Card>

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
              Across all classrooms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAssignments} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAssignments > 0
                ? Math.round(
                    (stats.activeAssignments / stats.totalAssignments) * 100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Assignment activity rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classrooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Classrooms</CardTitle>
          <CardDescription>
            Manage and monitor all your active classrooms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active ({activeClassrooms.length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive ({inactiveClassrooms.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeClassrooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeClassrooms.map((classroom) => (
                    <ClassroomCard key={classroom.id} classroom={classroom} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Active Classrooms
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {userCanCreateClassrooms
                      ? "Create your first classroom to start teaching"
                      : "Join a classroom with a code or ask your instructor to add you"}
                  </p>
                  {userCanCreateClassrooms ? (
                    <CreateClassroomModal onClassroomCreated={loadClassrooms} />
                  ) : (
                    <Button asChild>
                      <Link href="/classrooms/join">Join with Code</Link>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inactive" className="space-y-4">
              {inactiveClassrooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveClassrooms.map((classroom) => (
                    <ClassroomCard key={classroom.id} classroom={classroom} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Inactive Classrooms
                  </h3>
                  <p className="text-muted-foreground">
                    All your classrooms are currently active
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Learning Maps Management */}
      {/* {activeClassrooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Maps Management</CardTitle>
            <CardDescription>
              Link learning maps to your classrooms to create assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeClassrooms[0]?.id} className="w-full">
              <TabsList
                className="grid w-full overflow-x-auto"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(activeClassrooms.length, 4)}, 1fr)`,
                }}
              >
                {activeClassrooms.slice(0, 4).map((classroom) => (
                  <TabsTrigger
                    key={classroom.id}
                    value={classroom.id}
                    className="text-xs"
                  >
                    {classroom.name.length > 20
                      ? `${classroom.name.substring(0, 17)}...`
                      : classroom.name}
                  </TabsTrigger>
                ))}
                {activeClassrooms.length > 4 && (
                  <TabsTrigger value="more" className="text-xs">
                    +{activeClassrooms.length - 4} more
                  </TabsTrigger>
                )}
              </TabsList>

              {activeClassrooms.slice(0, 4).map((classroom) => (
                <TabsContent
                  key={classroom.id}
                  value={classroom.id}
                  className="mt-6"
                >
                  <ClassroomMapsManager classroomId={classroom.id} />
                </TabsContent>
              ))}

              {activeClassrooms.length > 4 && (
                <TabsContent value="more" className="mt-6">
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      More Classrooms
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Visit individual classroom pages to manage maps for
                      classrooms beyond the first 4
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                      {activeClassrooms.slice(4).map((classroom) => (
                        <Button key={classroom.id} variant="outline" asChild>
                          <Link href={`/classrooms/${classroom.id}`}>
                            {classroom.name}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )} */}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to help you manage your classrooms efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" asChild>
              <Link href="/maps">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Learning Maps
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/classrooms/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/help/classroom-guide">
                <CheckCircle className="h-4 w-4 mr-2" />
                Classroom Guide
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClassroomDashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Classrooms Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
