"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createAssignmentGroup } from "@/lib/supabase/assignment-groups";
import { AssignmentGroup } from "@/types/classroom";
import { Users, Palette, Hash } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
  onGroupCreated?: (group: AssignmentGroup) => void;
}

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6B7280", // Gray
];

export function CreateGroupModal({
  isOpen,
  onOpenChange,
  classroomId,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: DEFAULT_COLORS[0],
    maxMembers: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Group name is required",
          variant: "destructive",
        });
        return;
      }

      const group = await createAssignmentGroup({
        classroom_id: classroomId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        max_members: formData.maxMembers ? parseInt(formData.maxMembers) : undefined,
      });

      toast({
        title: "Success",
        description: `Group "${group.name}" created successfully`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        color: DEFAULT_COLORS[0],
        maxMembers: "",
      });

      onGroupCreated?.(group);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Create group error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setFormData({ ...formData, color });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-100">
            <Users className="h-5 w-5 text-blue-400" />
            Create Assignment Group
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new group for collaborative assignments. Students can join groups
            and work together on assigned tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-200">
              Group Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name..."
              className="bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400"
              maxLength={255}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description for the group..."
              className="bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400 resize-none"
              rows={3}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="text-gray-200 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Group Color
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={`
                    w-10 h-10 rounded-lg border-2 transition-all
                    ${
                      formData.color === color
                        ? "border-white scale-110"
                        : "border-slate-600 hover:scale-105"
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Max Members */}
          <div className="space-y-2">
            <Label htmlFor="maxMembers" className="text-gray-200 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Maximum Members
            </Label>
            <Input
              id="maxMembers"
              type="number"
              min="1"
              max="50"
              value={formData.maxMembers}
              onChange={(e) =>
                setFormData({ ...formData, maxMembers: e.target.value })
              }
              placeholder="Leave empty for unlimited"
              className="bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400"
            />
            <p className="text-xs text-gray-500">
              Leave empty to allow unlimited members in this group
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-gray-300 hover:bg-slate-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}