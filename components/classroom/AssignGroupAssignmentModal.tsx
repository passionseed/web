"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { assignAssignmentToGroup } from "@/lib/supabase/assignment-groups";
import type { ClassroomAssignment } from "@/types/classroom";
import { Target, Calendar, FileText } from "lucide-react";

interface AssignGroupAssignmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
  groupId: string;
  onAssignmentAssigned?: () => void;
}

export function AssignGroupAssignmentModal({
  isOpen,
  onOpenChange,
  classroomId,
  groupId,
  onAssignmentAssigned,
}: AssignGroupAssignmentModalProps) {
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingAssignments, setFetchingAssignments] = useState(false);
  const { toast } = useToast();

  const fetchAvailableAssignments = async () => {
    if (!classroomId || !groupId) return;

    try {
      setFetchingAssignments(true);
      const supabase = createClient();

      // Get all assignments in the classroom
      const { data: classroomAssignments, error: assignmentsError } = await supabase
        .from("classroom_assignments")
        .select("*")
        .eq("classroom_id", classroomId)
        .eq("is_active", true)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (assignmentsError) {
        throw new Error(assignmentsError.message);
      }

      // Get assignments already assigned to this group
      const { data: groupAssignments, error: groupError } = await supabase
        .from("assignment_group_assignments")
        .select("assignment_id")
        .eq("group_id", groupId);

      if (groupError) {
        throw new Error(groupError.message);
      }

      const assignedIds = new Set(groupAssignments.map(ga => ga.assignment_id));
      
      // Filter out assignments already assigned to this group
      const availableAssignments = classroomAssignments.filter(
        assignment => !assignedIds.has(assignment.id)
      );

      setAssignments(availableAssignments);
    } catch (error: any) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load assignments",
        variant: "destructive",
      });
    } finally {
      setFetchingAssignments(false);
    }
  };

  useEffect(() => {
    if (isOpen && classroomId && groupId) {
      fetchAvailableAssignments();
      setSelectedAssignmentId("");
      setCustomInstructions("");
      setDueDate("");
    }
  }, [isOpen, classroomId, groupId]);

  const handleSubmit = async () => {
    if (!selectedAssignmentId) {
      toast({
        title: "Validation Error",
        description: "Please select an assignment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await assignAssignmentToGroup(
        selectedAssignmentId,
        groupId,
        dueDate || undefined,
        customInstructions.trim() || undefined
      );

      const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
      
      toast({
        title: "Success",
        description: `Assignment "${selectedAssignment?.title}" assigned to group`,
      });

      // Reset form
      setSelectedAssignmentId("");
      setCustomInstructions("");
      setDueDate("");

      onAssignmentAssigned?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Assign assignment error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign assignment to group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  // Format date for input (YYYY-MM-DDTHH:MM)
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-100">
            <Target className="h-5 w-5 text-blue-400" />
            Assign Assignment to Group
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Assign an existing assignment to this group with optional custom settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Selection */}
          <div className="space-y-2">
            <Label className="text-gray-200">Assignment *</Label>
            {fetchingAssignments ? (
              <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
                <div className="text-gray-400 text-center">Loading assignments...</div>
              </div>
            ) : assignments.length > 0 ? (
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-gray-100">
                  <SelectValue placeholder="Select an assignment..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {assignments.map((assignment) => (
                    <SelectItem 
                      key={assignment.id} 
                      value={assignment.id}
                      className="text-gray-100"
                    >
                      <div className="flex flex-col">
                        <div className="font-medium">{assignment.title}</div>
                        {assignment.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">
                            {assignment.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-8 text-center border border-slate-700 rounded-lg bg-slate-800">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                <p className="text-gray-400">
                  No available assignments to assign to this group
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  All assignments in this classroom are already assigned to this group
                </p>
              </div>
            )}
          </div>

          {/* Assignment Details */}
          {selectedAssignment && (
            <div className="space-y-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h4 className="font-medium text-gray-200">Assignment Details</h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Title: </span>
                  <span className="text-gray-200">{selectedAssignment.title}</span>
                </div>
                
                {selectedAssignment.description && (
                  <div>
                    <span className="text-gray-400">Description: </span>
                    <span className="text-gray-200">{selectedAssignment.description}</span>
                  </div>
                )}
                
                {selectedAssignment.default_due_date && (
                  <div>
                    <span className="text-gray-400">Default Due Date: </span>
                    <span className="text-gray-200">
                      {formatDisplayDate(selectedAssignment.default_due_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-200 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Custom Due Date
            </Label>
            <input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500">
              Leave empty to use the assignment's default due date
            </p>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-gray-200">
              Group-Specific Instructions
            </Label>
            <Textarea
              id="instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Enter any special instructions for this group..."
              className="bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400 resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Optional instructions specific to this group assignment
            </p>
          </div>
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
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || !selectedAssignmentId || assignments.length === 0}
          >
            {loading ? "Assigning..." : "Assign to Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}