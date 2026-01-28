"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Settings, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Classroom } from "@/types/classroom";

interface ClassroomSettingsModalProps {
  classroom: Classroom;
  onSettingsUpdated: () => void;
}

export function ClassroomSettingsModal({
  classroom,
  onSettingsUpdated,
}: ClassroomSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const [formData, setFormData] = useState({
    name: classroom.name,
    description: classroom.description || "",
    max_students: classroom.max_students,
    is_active: classroom.is_active,
    enable_assignments: classroom.enable_assignments ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/classrooms/${classroom.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update classroom");
      }

      setOpen(false);
      onSettingsUpdated();
    } catch (error) {
      console.error("Error updating classroom:", error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(classroom.join_code);
      toast.success("Join code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy join code:", error);
      toast.error("Failed to copy join code");
    }
  };

  const regenerateJoinCode = async () => {
    if (
      !confirm(
        "Are you sure? This will invalidate the current join code and students won't be able to join with the old code."
      )
    ) {
      return;
    }

    setGeneratingCode(true);
    try {
      const response = await fetch(
        `/api/classrooms/${classroom.id}/regenerate-code`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate join code");
      }

      onSettingsUpdated();
    } catch (error) {
      console.error("Error regenerating join code:", error);
      // TODO: Show error toast
    } finally {
      setGeneratingCode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Classroom Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage classroom settings and access controls.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6 pb-2">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Classroom Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
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
                onChange={(e) =>
                  handleInputChange("max_students", parseInt(e.target.value))
                }
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active Status</Label>
                <div className="text-sm text-muted-foreground">
                  Students can only join active classrooms
                </div>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  handleInputChange("is_active", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable_assignments">Assignment System</Label>
                <div className="text-sm text-muted-foreground">
                  Enable assignment creation and tracking features
                </div>
              </div>
              <Switch
                id="enable_assignments"
                checked={formData.enable_assignments}
                onCheckedChange={(checked) =>
                  handleInputChange("enable_assignments", checked)
                }
              />
            </div>

            {/* Progress System Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Progress Tracking</p>
                  <p className="text-sm text-blue-700">
                    Student progress is calculated based on completion of linked learning maps. 
                    {formData.enable_assignments 
                      ? " Assignments provide additional organization and tracking tools."
                      : " With assignments disabled, progress is purely map-based."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Join Code Section */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Join Code</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={classroom.join_code}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyJoinCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={regenerateJoinCode}
                  disabled={generatingCode}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${generatingCode ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with students to let them join your classroom.
                Click the refresh button to generate a new code.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-destructive">Danger Zone</Label>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to delete this classroom? This action cannot be undone and will remove all assignments and student progress."
                      )
                    ) {
                      // TODO: Implement classroom deletion
                      console.log("Delete classroom:", classroom.id);
                    }
                  }}
                >
                  Delete Classroom
                </Button>
              </div>
            </div>
          </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !formData.name.trim()}
            onClick={handleSubmit}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
