"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

interface Classroom {
  id: string;
  name: string;
  description: string;
  instructor_id: string;
  join_code: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClassroomMembership {
  id: string;
  classroom_id: string;
  user_id: string;
  role: "instructor" | "ta" | "student";
  joined_at: string;
  classroom: Classroom;
}

interface ClassroomStats {
  total_classrooms: number;
  active_assignments: number;
  completed_assignments_this_week: number;
  role_distribution: {
    instructor: number;
    ta: number;
    student: number;
  };
}

export function ClassroomSection() {
  const { user, isAuthenticated } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomMembership[]>([]);
  const [stats, setStats] = useState<ClassroomStats>({
    total_classrooms: 0,
    active_assignments: 0,
    completed_assignments_this_week: 0,
    role_distribution: { instructor: 0, ta: 0, student: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClassroomData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user's classrooms
      const classroomsResponse = await fetch("/api/classrooms");
      if (!classroomsResponse.ok) {
        throw new Error("Failed to fetch classrooms");
      }
      const classroomsData = await classroomsResponse.json();
      setClassrooms(classroomsData);

      // Calculate stats
      const totalClassrooms = classroomsData.length;
      const roleDistribution = classroomsData.reduce(
        (acc: any, membership: ClassroomMembership) => {
          acc[membership.role] = (acc[membership.role] || 0) + 1;
          return acc;
        },
        { instructor: 0, ta: 0, student: 0 }
      );

      // TODO: Fetch assignment stats from API
      setStats({
        total_classrooms: totalClassrooms,
        active_assignments: 0, // Will be updated when assignment API is ready
        completed_assignments_this_week: 0,
        role_distribution: roleDistribution,
      });
    } catch (err) {
      console.error("Error fetching classroom data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load classroom data"
      );
    } finally {
      setLoading(false);
    }
  };

  const getClassroomsByRole = (role: "instructor" | "ta" | "student") => {
    return classrooms.filter((membership) => membership.role === role);
  };

  const instructorClassrooms = getClassroomsByRole("instructor");
  const studentClassrooms = getClassroomsByRole("student");
  const taClassrooms = getClassroomsByRole("ta");

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Your Classrooms</h2>
        </div>
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Sign in to access your classrooms and assignments
            </p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Your Classrooms</h2>
        <Button variant="ghost" asChild>
          <Link href="/classrooms" className="flex items-center gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-gray-200 p-4 mb-4">
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">
              Failed to Load Classrooms
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              {error}
            </p>
            <Button variant="outline" onClick={fetchClassroomData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Classroom Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Create Classroom Card */}
            <Card className="border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors group">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-primary/10 p-4 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create Classroom</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                  Start teaching and manage student progress with custom
                  assignments
                </p>
                <Button asChild>
                  <Link
                    href="/classrooms/new"
                    className="flex items-center gap-2"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Create New
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Join Classroom Card */}
            <Card className="border-2 border-dashed border-gray-200 hover:border-blue-500/50 transition-colors group">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-blue-500/10 p-4 mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Join Classroom</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                  Enter a join code to access assignments and track your
                  progress
                </p>
                <Button variant="outline" asChild>
                  <Link
                    href="/classrooms/join"
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Join with Code
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg text-blue-800">
                  <Calendar className="mr-2 h-5 w-5" />
                  Classroom Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">Total Classrooms</span>
                  <span className="font-semibold text-blue-800">
                    {stats.total_classrooms}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">As Instructor</span>
                  <span className="font-semibold text-blue-800">
                    {stats.role_distribution.instructor}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">As Student</span>
                  <span className="font-semibold text-blue-800">
                    {stats.role_distribution.student}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-blue-700 hover:bg-blue-200"
                  asChild
                >
                  <Link href="/classrooms">
                    View Details
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Classrooms */}
          {classrooms.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Classrooms</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classrooms.slice(0, 3).map((membership) => (
                  <Link
                    key={membership.id}
                    href={`/classrooms/${membership.classroom.id}`}
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {membership.classroom.name}
                          </CardTitle>
                          <Badge
                            variant={
                              membership.role === "instructor"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {membership.role}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {membership.classroom.description ||
                            "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            Joined{" "}
                            {new Date(
                              membership.joined_at
                            ).toLocaleDateString()}
                          </span>
                          {membership.classroom.is_active ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-300"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {classrooms.length === 0 && (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Classrooms Yet
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                  Create your first classroom or join one with a code to get
                  started
                </p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href="/classrooms/new">Create Classroom</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/classrooms/join">Join with Code</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
