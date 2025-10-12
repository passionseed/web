"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, School } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClassroom } from "@/lib/supabase/classrooms";

interface CreateClassroomButtonProps {
  onClassroomCreated?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export function CreateClassroomButton({
  onClassroomCreated,
  variant = "default",
  size = "default",
  className = "",
  showText = true
}: CreateClassroomButtonProps) {
  const [userCanCreate, setUserCanCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_students: 30,
  });
  const { toast } = useToast();

  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        // Check if user has instructor or admin role by checking existing classrooms
        const response = await fetch("/api/classrooms");
        if (response.ok) {
          const memberships = await response.json();
          const hasInstructorRole = memberships.some(
            (membership: any) =>
              membership.role === "instructor" || membership.role === "ta"
          );
          setUserCanCreate(hasInstructorRole);
        }
      } catch (error) {
        console.error("Failed to check user permissions:", error);
        setUserCanCreate(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserPermissions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Classroom name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const result = await createClassroom({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        max_students: formData.max_students || 30,
      });

      toast({
        title: "Success",
        description: `Classroom "${result.classroom.name}" created with join code: ${result.join_code}`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        max_students: 30,
      });

      setOpen(false);
      onClassroomCreated?.();
    } catch (error) {
      console.error("Create classroom error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create classroom",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render if user doesn't have permission or still loading
  if (isLoading || !userCanCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {size === "icon" ? (
            <Plus className="h-4 w-4" />
          ) : (
            <>
              <School className="h-4 w-4 mr-2" />
              {showText && "Create Classroom"}
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
            <DialogDescription>
              Set up a new classroom for your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Classroom Name *</Label>
              <Input
                id="name"
                placeholder="e.g., JavaScript Fundamentals - Spring 2025"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isCreating}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the classroom..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Maximum Students</Label>
              <Input
                id="max_students"
                type="number"
                min="1"
                max="1000"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 30 }))}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Classroom
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}