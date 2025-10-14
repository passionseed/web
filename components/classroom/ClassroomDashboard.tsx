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
import { Users, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { ClassroomCard } from "./ClassroomCard";
import { CreateClassroomModal } from "./CreateClassroomModal";
import { ClassroomMapsManager } from "./ClassroomMapsManager";
import { useToast } from "@/hooks/use-toast";
import { checkClientAuth, UserRole } from "@/lib/supabase/auth-client";
import type { ClassroomWithAssignments } from "@/types/classroom";

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
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const { toast } = useToast();

  const loadClassrooms = async (roles: UserRole[] = []) => {
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

      // Check if user can create classrooms (instructors, TAs, and admins)
      const hasInstructorRole = memberships.some(
        (membership) =>
          membership.role === "instructor" || membership.role === "ta"
      );
      const isAdmin = roles.includes("admin");
      // Allow instructors, TAs, and admins to create classrooms
      setUserCanCreateClassrooms(hasInstructorRole || isAdmin);
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
    const loadData = async () => {
      // Load user roles first
      let roles: UserRole[] = [];
      try {
        const authResult = await checkClientAuth();
        if (authResult.isAuthenticated && authResult.userRoles) {
          roles = authResult.userRoles;
          setUserRoles(roles);
        }
      } catch (error) {
        console.error("Error loading user roles:", error);
      }

      // Then load classrooms with the roles
      await loadClassrooms(roles);
    };
    loadData();
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
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/classrooms/join">
              <Users className="h-4 w-4 mr-2" />
              Join Classroom
            </Link>
          </Button>
          {userCanCreateClassrooms && (
            <CreateClassroomModal onClassroomCreated={loadClassrooms} />
          )}
        </div>
      </div>

      {/* Classrooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Classrooms</CardTitle>
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
                      ? "Create your first classroom to start teaching or join an existing one"
                      : "Join a classroom with a code or ask your instructor to add you"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button asChild>
                      <Link href="/classrooms/join">Join with Code</Link>
                    </Button>
                    {userCanCreateClassrooms && (
                      <Button asChild>
                        <Link href="/classrooms/new">Create Classroom</Link>
                      </Button>
                    )}
                  </div>
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
