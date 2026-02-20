"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

interface InviteInstructorModalProps {
  classroomId: string;
  onInstructorAdded?: () => void;
}

export function InviteInstructorModal({
  classroomId,
  onInstructorAdded,
}: InviteInstructorModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleInvite = async () => {
    console.log("🔵 [InviteInstructor] handleInvite called", { email, classroomId });

    if (!email.trim()) {
      console.log("❌ [InviteInstructor] Email is empty");
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("🔵 [InviteInstructor] Starting invite process for:", email.toLowerCase().trim());

    try {
      // Find user by email
      console.log("🔵 [InviteInstructor] Searching for user in profiles table...");
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, username")
        .eq("email", email.toLowerCase().trim())
        .single();

      console.log("🔵 [InviteInstructor] Profile search result:", { profiles, profileError });

      if (profileError || !profiles) {
        console.log("❌ [InviteInstructor] User not found");
        toast({
          title: "User not found",
          description: "No user found with this email address",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if user is already a member
      console.log("🔵 [InviteInstructor] Checking existing membership for user:", profiles.id);
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from("classroom_memberships")
        .select("id, role")
        .eq("classroom_id", classroomId)
        .eq("user_id", profiles.id)
        .maybeSingle();

      console.log("🔵 [InviteInstructor] Membership check result:", { existingMembership, membershipCheckError });

      if (membershipCheckError) {
        console.error("❌ [InviteInstructor] Error checking membership:", membershipCheckError);
      }

      if (existingMembership) {
        console.log("❌ [InviteInstructor] User is already a member with role:", existingMembership.role);
        toast({
          title: "Already a member",
          description: `This user is already a ${existingMembership.role} in this classroom`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Add user as instructor
      console.log("🔵 [InviteInstructor] Adding user as instructor...", {
        classroom_id: classroomId,
        user_id: profiles.id,
        role: "instructor"
      });

      const { data: insertData, error: addError } = await supabase
        .from("classroom_memberships")
        .insert({
          classroom_id: classroomId,
          user_id: profiles.id,
          role: "instructor",
        })
        .select();

      console.log("🔵 [InviteInstructor] Insert result:", { insertData, addError });

      if (addError) {
        console.error("❌ [InviteInstructor] Insert error:", addError);
        throw addError;
      }

      console.log("✅ [InviteInstructor] Instructor added successfully!");
      toast({
        title: "Instructor added successfully",
        description: `${profiles.full_name || profiles.username || profiles.email} has been added as an instructor`,
      });

      setEmail("");
      setOpen(false);
      onInstructorAdded?.();
    } catch (error) {
      console.error("❌ [InviteInstructor] Error adding instructor:", error);
      toast({
        title: "Error",
        description: "Failed to add instructor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("🔵 [InviteInstructor] Process complete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Instructor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Instructor</DialogTitle>
          <DialogDescription>
            Add another instructor to help manage this classroom. They will have
            full access to classroom management features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="instructor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleInvite();
                }
              }}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Enter the email address of the user you want to add as an
              instructor
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading || !email.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Adding..." : "Add Instructor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
