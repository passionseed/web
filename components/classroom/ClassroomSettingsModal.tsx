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
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to copy join code:", error);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Classroom Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage classroom settings and access controls.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

          {/* Join Code Section */}
          <div className="border-t pt-4 space-y-4">
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
          <div className="border-t pt-4 space-y-4">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
