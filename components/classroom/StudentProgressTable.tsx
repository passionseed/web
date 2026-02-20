"use client";

import { useState } from "react";
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
import { MoreVertical, Mail, User, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  joined_at: string;
  map_progress?: {
    map_id: string;
    map_title: string;
    progress_percentage: number;
    completed_nodes: number;
    total_nodes: number;
    status: "not_started" | "in_progress" | "completed";
  }[];
}

interface ClassroomMap {
  id: string;
  map_id: string;
  map_title: string;
  display_order: number;
}

interface StudentProgressTableProps {
  students: Student[];
  assignments?: ClassroomMap[]; // Legacy prop name, actually contains classroom maps
  classroomMaps?: ClassroomMap[];
  canManage: boolean;
  classroomId?: string;
  onStudentRemoved?: () => void;
}

export function StudentProgressTable({
  students,
  assignments,
  classroomMaps,
  canManage,
  classroomId,
  onStudentRemoved,
}: StudentProgressTableProps) {
  // Use assignments if provided (legacy), otherwise classroomMaps
  const maps = assignments || classroomMaps || [];
  const supabase = createClient();
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const getStudentName = (student: Student) => {
    console.log("🎭 [DEBUG] Getting student name for student ID:", student.user_id);
    console.log("🔍 [DEBUG] Full student object:", JSON.stringify(student, null, 2));
    console.log("👤 [DEBUG] User object:", JSON.stringify(student.user, null, 2));
    
    const name = (
      student.user?.full_name ||
      student.user?.username ||
      student.user?.email?.split("@")[0] ||
      "Unknown Student"
    );
    
    console.log("📝 [DEBUG] Name resolution steps:", {
      full_name: student.user?.full_name,
      username: student.user?.username, 
      email_part: student.user?.email?.split("@")[0],
      final_name: name
    });
    
    return name;
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

  const getOverallProgress = (student: Student) => {
    if (!student.map_progress || maps.length === 0) {
      return 0;
    }

    const totalProgress = student.map_progress.reduce(
      (sum, progress) => {
        return sum + progress.progress_percentage;
      },
      0
    );

    return Math.round(totalProgress / maps.length);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleContactStudent = (student: Student) => {
    if (student.user?.email) {
      window.open(`mailto:${student.user.email}`, "_blank");
    }
  };

  const handleViewProgress = (student: Student) => {
    // TODO: Open detailed progress modal or navigate to student page
    console.log("View progress for student:", student.id);
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !classroomId) {
      console.log("❌ [RemoveStudent] Missing studentToRemove or classroomId");
      return;
    }

    console.log("🔵 [RemoveStudent] Starting removal process", {
      studentId: studentToRemove.id,
      userId: studentToRemove.user_id,
      classroomId,
      studentName: getStudentName(studentToRemove),
    });

    setIsRemoving(true);
    try {
      console.log("🔵 [RemoveStudent] Deleting classroom_memberships record...");

      const { data, error } = await supabase
        .from("classroom_memberships")
        .delete()
        .eq("id", studentToRemove.id)
        .eq("classroom_id", classroomId)
        .select();

      console.log("🔵 [RemoveStudent] Delete result:", { data, error });

      if (error) {
        console.error("❌ [RemoveStudent] Database error:", error);
        throw error;
      }

      console.log("✅ [RemoveStudent] Student removed successfully!");
      toast.success(`${getStudentName(studentToRemove)} has been removed from the classroom`);

      setStudentToRemove(null);
      onStudentRemoved?.();
    } catch (error) {
      console.error("❌ [RemoveStudent] Error:", error);
      toast.error("Failed to remove student. Please try again.");
    } finally {
      setIsRemoving(false);
      console.log("🔵 [RemoveStudent] Process complete");
    }
  };

  return (
    <>
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Overall Progress</TableHead>
              {maps.slice(0, 3).map((map) => (
                <TableHead key={map.map_id} className="min-w-[120px]">
                  {map.map_title}
                </TableHead>
              ))}
              {maps.length > 3 && (
                <TableHead>+{maps.length - 3} more</TableHead>
              )}
              <TableHead>Joined</TableHead>
              {canManage && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    5 +
                    (maps.length > 3
                      ? 1
                      : Math.min(maps.length, 3)) +
                    (canManage ? 1 : 0)
                  }
                  className="text-center py-8 text-muted-foreground"
                >
                  No students enrolled yet
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
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
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {student.user?.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          User ID: {student.user_id}
                        </div>
                        {(student.user?.email === "No email available" || student.user?.full_name === null) && (
                          <button 
                            onClick={async () => {
                              console.log("🔍 [DEBUG] Checking user data for:", student.user_id);
                              try {
                                const response = await fetch(`/api/debug/user/${student.user_id}`);
                                const data = await response.json();
                                console.log("🎯 [DEBUG] User diagnostic data:", data);
                              } catch (error) {
                                console.error("💥 [DEBUG] Error fetching user debug data:", error);
                              }
                            }}
                            className="text-xs text-yellow-400 hover:text-yellow-300 mt-1 underline cursor-pointer block"
                          >
                            🔍 Debug Missing Data
                          </button>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {getOverallProgress(student)}%
                        </span>
                      </div>
                      <Progress
                        value={getOverallProgress(student)}
                        className="h-2"
                      />
                    </div>
                  </TableCell>

                  {maps.slice(0, 3).map((map) => {
                    const progress = student.map_progress?.find(
                      (p) => p.map_id === map.map_id
                    );
                    return (
                      <TableCell key={map.map_id}>
                        {progress ? (
                          <div className="space-y-1">
                            {getStatusBadge(progress.status)}
                            <div className="text-xs text-muted-foreground">
                              {progress.progress_percentage}% ({progress.completed_nodes}/{progress.total_nodes} nodes)
                            </div>
                          </div>
                        ) : (
                          <Badge variant="secondary">Not Started</Badge>
                        )}
                      </TableCell>
                    );
                  })}

                  {maps.length > 3 && (
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

                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewProgress(student)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleContactStudent(student)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact Student
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              console.log("🔵 [RemoveStudent] Remove button clicked for:", student.user_id);
                              setStudentToRemove(student);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Remove from Classroom
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>

    <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Student from Classroom</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-semibold">
              {studentToRemove ? getStudentName(studentToRemove) : ""}
            </span>{" "}
            from this classroom? This will remove their access to all classroom materials and assignments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveStudent}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? "Removing..." : "Remove Student"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
