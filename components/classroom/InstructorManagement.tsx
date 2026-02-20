"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCog, Trash2, Crown, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { InviteInstructorModal } from "./InviteInstructorModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Instructor {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface InstructorManagementProps {
  classroomId: string;
  ownerId: string;
  currentUserId: string;
  canManage: boolean;
}

export function InstructorManagement({
  classroomId,
  ownerId,
  currentUserId,
  canManage,
}: InstructorManagementProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  const loadInstructors = async () => {
    setLoading(true);
    try {
      // First, get classroom memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("classroom_memberships")
        .select("id, user_id, role, joined_at")
        .eq("classroom_id", classroomId)
        .in("role", ["instructor", "ta"])
        .order("joined_at", { ascending: true });

      if (membershipError) {
        console.error("Error loading memberships:", membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setInstructors([]);
        setLoading(false);
        return;
      }

      // Get user IDs
      const userIds = memberships.map((m) => m.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url")
        .in("id", userIds);

      if (profileError) {
        console.error("Error loading profiles:", profileError);
        throw profileError;
      }

      // Combine memberships with profiles
      const instructorsWithProfiles = memberships.map((membership) => {
        const profile = profiles?.find((p) => p.id === membership.user_id);
        return {
          ...membership,
          profiles: profile || {
            id: membership.user_id,
            email: "Unknown",
            full_name: null,
            username: null,
            avatar_url: null,
          },
        };
      }) as Instructor[];

      console.log("Loaded instructors:", instructorsWithProfiles);
      setInstructors(instructorsWithProfiles);
    } catch (error) {
      console.error("Error loading instructors:", error);
      toast({
        title: "Error",
        description: "Failed to load instructors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructors();
  }, [classroomId]);

  const handleRemoveInstructor = async (membershipId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("classroom_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast({
        title: "Instructor removed",
        description: "The instructor has been removed from this classroom",
      });

      loadInstructors();
    } catch (error) {
      console.error("Error removing instructor:", error);
      toast({
        title: "Error",
        description: "Failed to remove instructor",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <UserCog className="h-5 w-5" />
              <span>Manage Instructors</span>
            </CardTitle>
            <CardDescription>
              Add or remove instructors who can manage this classroom
            </CardDescription>
          </div>
          {canManage && (
            <InviteInstructorModal
              classroomId={classroomId}
              onInstructorAdded={loadInstructors}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading instructors...
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No instructors or TAs added yet</p>
            {canManage && (
              <p className="text-sm mt-2">
                Click "Add Instructor" to invite someone to help manage this classroom
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {instructors.map((instructor) => {
              const isOwner = instructor.user_id === ownerId;
              const isCurrentUser = instructor.user_id === currentUserId;
              const canRemove = canManage && !isOwner && !isCurrentUser;

              return (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={instructor.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {(instructor.profiles.full_name || instructor.profiles.username || instructor.profiles.email)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {instructor.profiles.full_name || instructor.profiles.username || instructor.profiles.email}
                        </p>
                        {isOwner && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Owner
                          </Badge>
                        )}
                        {!isOwner && instructor.role === "instructor" && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Instructor
                          </Badge>
                        )}
                        {instructor.role === "ta" && (
                          <Badge variant="outline">TA</Badge>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {instructor.profiles.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(instructor.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Instructor</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <span className="font-semibold">
                              {instructor.profiles.full_name || instructor.profiles.username || instructor.profiles.email}
                            </span>{" "}
                            as an instructor? They will lose access to classroom management features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveInstructor(instructor.id, instructor.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
