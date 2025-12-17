"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Shuffle,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  RotateCcw,
  Loader2,
  Lock,
  Unlock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getAssessmentGroups,
  getClassroomStudentsForAssessment,
  createAssessmentGroupsShuffle,
  updateAssessmentGroupsManual,
  deleteAssessmentGroups,
  getAssessmentMapContext,
} from "@/lib/supabase/assessment-groups";
import { convertMapToClassroomExclusive } from "@/lib/supabase/classrooms";
import {
  AssessmentGroupWithMembers,
  NodeAssessment,
} from "@/types/map";

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: NodeAssessment;
  onGroupsUpdated: () => void;
  onAssessmentChange?: (assessment: NodeAssessment) => void;
  classroomId?: string; // Optional: if provided, allows conversion to classroom-exclusive
}

interface Student {
  user_id: string;
  full_name: string | null;
  username: string | null;
  email: string;
}

interface GroupData {
  group_name: string;
  member_ids: string[];
}

export function GroupManagementModal({
  isOpen,
  onClose,
  assessment,
  onGroupsUpdated,
  onAssessmentChange,
  classroomId,
}: GroupManagementModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<AssessmentGroupWithMembers[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("groups");
  const [groupSizeInput, setGroupSizeInput] = useState<string>("");
  const [lockedGroupNames, setLockedGroupNames] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mapContext, setMapContext] = useState<{
    map_id: string;
    classroom_id: string | null;
    map_type: string;
    is_classroom_exclusive: boolean;
  } | null>(null);
  const [converting, setConverting] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && assessment.id) {
      loadData();
    }
  }, [isOpen, assessment.id]);

  // Initialize group size input when assessment changes
  useEffect(() => {
    setGroupSizeInput((assessment.target_group_size || 3).toString());
  }, [assessment.target_group_size]);

  const loadData = useCallback(async () => {
    if (!assessment.id) return;

    // Don't try to load data for temporary assessments (not yet saved)
    if (assessment.id.startsWith('temp_')) {
      console.log('⏭️ Skipping group data load for temporary assessment');
      setGroups([]);
      setStudents([]);
      setUnassignedStudents([]);
      setMapContext(null);
      return;
    }

    setLoading(true);
    try {
      console.log("📊 Loading group management data...");

      // Load groups, students, and map context in parallel
      const [groupsData, studentsData, mapContextData] = await Promise.all([
        getAssessmentGroups(assessment.id),
        getClassroomStudentsForAssessment(assessment.id),
        getAssessmentMapContext(assessment.id),
      ]);

      console.log("👥 Loaded groups:", groupsData);
      console.log("🎓 Loaded students:", studentsData);
      console.log("🗺️ Loaded map context:", mapContextData);

      setGroups(groupsData);
      setStudents(studentsData);
      setMapContext(mapContextData);

      // Calculate unassigned students
      const assignedUserIds = new Set(
        groupsData.flatMap(group => group.members.map(member => member.user_id))
      );
      const unassigned = studentsData.filter(
        student => !assignedUserIds.has(student.user_id)
      );

      console.log("🔍 Assigned user IDs:", Array.from(assignedUserIds));
      console.log("👥 All students:", studentsData.map(s => ({ id: s.user_id, name: s.full_name })));
      console.log("📋 Unassigned students:", unassigned.map(s => ({ id: s.user_id, name: s.full_name })));

      setUnassignedStudents(unassigned);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      toast({
        title: "Failed to load group data",
        description: (error as Error).message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assessment.id, toast]);

  const handleAutoShuffle = useCallback(async () => {
    if (!assessment.id) return;

    // Check if there are locked groups
    if (lockedGroupNames.size > 0) {
      // Custom shuffle that preserves locked groups
      setLoading(true);
      try {
        console.log("🔀 Auto-shuffling groups (preserving locked groups)...");

        // Get students from unlocked groups + unassigned students
        const studentsToShuffle: Student[] = [];
        const preservedGroups: AssessmentGroupWithMembers[] = [];
        const preservedGroupNames = new Set<string>();

        groups.forEach(group => {
          if (lockedGroupNames.has(group.group_name)) {
            // Keep locked groups as-is
            preservedGroups.push(group);
            preservedGroupNames.add(group.group_name);
          } else {
            // Add members of unlocked groups to shuffle pool
            group.members.forEach(member => {
              const student = students.find(s => s.user_id === member.user_id);
              if (student) studentsToShuffle.push(student);
            });
          }
        });

        // Add unassigned students to shuffle pool
        studentsToShuffle.push(...unassignedStudents);

        console.log(`💾 Preserving ${preservedGroups.length} locked groups: ${Array.from(preservedGroupNames).join(', ')}`);
        console.log(`🔄 Shuffling ${studentsToShuffle.length} students from ${groups.length - preservedGroups.length} unlocked groups`);

        // First, create all groups with both preserved and shuffled
        const allGroupsData: GroupData[] = [];

        // Add preserved groups first (they keep their exact composition)
        preservedGroups.forEach(group => {
          allGroupsData.push({
            group_name: group.group_name,
            member_ids: group.members.map(member => member.user_id),
          });
        });

        // Create shuffled groups for remaining students if any
        if (studentsToShuffle.length > 0) {
          // Calculate how many shuffled groups we need
          const targetSize = assessment.target_group_size || 3;
          const allowUneven = assessment.allow_uneven_groups ?? true;

          if (allowUneven) {
            // Use smart distribution to avoid groups of size 1
            const remainder = studentsToShuffle.length % targetSize;
            let shuffledGroups: Student[][];

            if (remainder === 0) {
              // Perfect division
              const numGroups = studentsToShuffle.length / targetSize;
              shuffledGroups = Array.from({ length: numGroups }, () => [] as Student[]);
            } else if (remainder === 1) {
              // Avoid size 1: create groups of (target-1) and target
              const numFullGroups = Math.floor(studentsToShuffle.length / targetSize) - 1;
              const numSmallGroups = 2;
              shuffledGroups = [
                ...Array.from({ length: numFullGroups }, () => [] as Student[]),
                ...Array.from({ length: numSmallGroups }, () => [] as Student[])
              ];
            } else {
              // remainder >= 2: normal distribution
              const numFullGroups = Math.floor(studentsToShuffle.length / targetSize);
              shuffledGroups = Array.from({ length: numFullGroups + 1 }, () => [] as Student[]);
            }

            // Distribute students evenly
            studentsToShuffle.forEach((student, index) => {
              const groupIndex = index % shuffledGroups.length;
              shuffledGroups[groupIndex].push(student);
            });

            // Add shuffled groups to the data
            shuffledGroups.forEach((groupStudents) => {
              if (groupStudents.length > 0) {
                allGroupsData.push({
                  group_name: `Group ${allGroupsData.length + 1}`,
                  member_ids: groupStudents.map(student => student.user_id),
                });
              }
            });
          } else {
            // Strict mode: only full groups
            const numFullGroups = Math.floor(studentsToShuffle.length / targetSize);
            const shuffledGroups = Array.from({ length: numFullGroups }, () => [] as Student[]);

            // Only assign students to full groups
            for (let i = 0; i < numFullGroups * targetSize; i++) {
              const groupIndex = Math.floor(i / targetSize);
              shuffledGroups[groupIndex].push(studentsToShuffle[i]);
            }

            shuffledGroups.forEach((groupStudents) => {
              allGroupsData.push({
                group_name: `Group ${allGroupsData.length + 1}`,
                member_ids: groupStudents.map(student => student.user_id),
              });
            });
          }
        }

        // Clear all existing groups and create new ones
        await deleteAssessmentGroups(assessment.id);

        if (allGroupsData.length > 0) {
          await updateAssessmentGroupsManual({
            assessment_id: assessment.id,
            groups: allGroupsData,
          });
        }

        // Preserve locked group names (they will be applied after data loads)
        // Don't clear lockedGroupNames since we want to maintain the lock state

        toast({
          title: "Groups shuffled successfully!",
          description: `${preservedGroups.length} groups were preserved, others shuffled`
        });
        setHasUnsavedChanges(false);
        await loadData();
        onGroupsUpdated();
      } catch (error) {
        console.error("❌ Failed to shuffle groups:", error);
        toast({
          title: "Failed to shuffle groups",
          description: (error as Error).message || "Unknown error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Normal shuffle (no locked groups)
      setLoading(true);
      try {
        console.log("🔀 Auto-shuffling groups...");

        await createAssessmentGroupsShuffle({
          assessment_id: assessment.id,
          target_group_size: assessment.target_group_size || 3,
          allow_uneven_groups: assessment.allow_uneven_groups ?? true,
        });

        toast({ title: "Groups shuffled successfully!" });
        setHasUnsavedChanges(false);
        await loadData();
        onGroupsUpdated();
      } catch (error) {
        console.error("❌ Failed to shuffle groups:", error);
        toast({
          title: "Failed to shuffle groups",
          description: (error as Error).message || "Unknown error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  }, [assessment, lockedGroupNames, groups, students, unassignedStudents, toast, loadData, onGroupsUpdated]);

  const handleResetGroups = useCallback(async () => {
    if (!assessment.id) return;

    if (!confirm("Are you sure you want to delete all groups? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      console.log("🗑️ Resetting all groups...");

      await deleteAssessmentGroups(assessment.id);

      toast({ title: "All groups deleted successfully!" });
      setHasUnsavedChanges(false);
      await loadData();
      onGroupsUpdated();
    } catch (error) {
      console.error("❌ Failed to reset groups:", error);
      toast({
        title: "Failed to reset groups",
        description: (error as Error).message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assessment.id, toast, loadData, onGroupsUpdated]);

  const moveStudentToGroup = useCallback((studentId: string, targetGroupIndex: number) => {
    if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;

    // Remove student from current group and unassigned list
    const updatedGroups = groups.map((group, index) => ({
      ...group,
      members: group.members.filter(member => member.user_id !== studentId)
    }));

    // Add student to target group
    const student = [...students, ...unassignedStudents].find(s => s.user_id === studentId);
    if (student) {
      updatedGroups[targetGroupIndex].members.push({
        user_id: student.user_id,
        full_name: student.full_name,
        username: student.username,
        assigned_at: new Date().toISOString(),
      });
    }

    setGroups(updatedGroups);
    setHasUnsavedChanges(true);

    // Update unassigned students
    setUnassignedStudents(prev => prev.filter(s => s.user_id !== studentId));
  }, [groups, students, unassignedStudents]);

  const removeStudentFromGroup = useCallback((studentId: string, groupIndex: number) => {
    // Remove student from group
    const updatedGroups = [...groups];
    const removedMember = updatedGroups[groupIndex].members.find(m => m.user_id === studentId);
    updatedGroups[groupIndex].members = updatedGroups[groupIndex].members.filter(
      member => member.user_id !== studentId
    );
    setGroups(updatedGroups);
    setHasUnsavedChanges(true);

    // Add back to unassigned if student still exists
    const student = students.find(s => s.user_id === studentId);
    if (student && removedMember) {
      setUnassignedStudents(prev => [...prev, student]);
    }
  }, [groups, students]);

  const saveManualChanges = useCallback(async () => {
    if (!assessment.id) return;

    setLoading(true);
    try {
      console.log("💾 Saving manual group changes...");
      console.log("📋 Current groups state:", groups);

      const groupsData: GroupData[] = groups.map((group, index) => ({
        group_name: group.group_name || `Group ${index + 1}`,
        member_ids: group.members.map(member => member.user_id),
      }));

      console.log("📤 Sending groups data to API:", groupsData);

      const result = await updateAssessmentGroupsManual({
        assessment_id: assessment.id,
        groups: groupsData,
      });

      console.log("✅ Groups saved successfully, result:", result);
      toast({ title: "Groups saved successfully!" });
      setHasUnsavedChanges(false);

      // Add a small delay to ensure database operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await loadData();
      onGroupsUpdated();
    } catch (error) {
      console.error("❌ Failed to save groups:", error);
      toast({
        title: "Failed to save groups",
        description: (error as Error).message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assessment.id, groups, toast, loadData, onGroupsUpdated]);

  const createNewGroup = useCallback(() => {
    const newGroupNumber = groups.length + 1;
    const newGroup: AssessmentGroupWithMembers = {
      id: `temp-${Date.now()}`, // Temporary ID for local state
      assessment_id: assessment.id || '',
      group_name: `Group ${newGroupNumber}`,
      group_number: newGroupNumber,
      created_at: new Date().toISOString(),
      created_by: '',
      members: []
    };

    setGroups(prevGroups => [...prevGroups, newGroup]);
    setHasUnsavedChanges(true);
    toast({ title: `Created ${newGroup.group_name}` });
  }, [groups.length, assessment.id, toast]);

  const deleteGroup = useCallback((groupIndex: number) => {
    const groupToDelete = groups[groupIndex];
    if (!groupToDelete) return;

    // Move all members back to unassigned students
    const membersToUnassign = groupToDelete.members.map(member => {
      const student = students.find(s => s.user_id === member.user_id);
      return student;
    }).filter(Boolean) as Student[];

    // Remove the group from groups array and locked groups
    const updatedGroups = groups.filter((_, index) => index !== groupIndex);
    setGroups(updatedGroups);
    setLockedGroupNames(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupToDelete.group_name);
      return newSet;
    });

    // Add members back to unassigned students
    setUnassignedStudents(prev => [...prev, ...membersToUnassign]);
    setHasUnsavedChanges(true);

    toast({
      title: `Deleted ${groupToDelete.group_name}`,
      description: `${membersToUnassign.length} students moved to unassigned`
    });
  }, [groups, students, toast]);

  const toggleGroupLock = useCallback((groupId: string, groupName: string) => {
    setLockedGroupNames(prev => {
      const newSet = new Set(prev);
      const wasLocked = newSet.has(groupName);

      if (wasLocked) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }

      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        if (wasLocked) {
          toast({ title: `Unlocked ${groupName}`, description: "Group will be included in shuffle" });
        } else {
          toast({ title: `Locked ${groupName}`, description: "Group will be excluded from shuffle" });
        }
      }, 0);

      return newSet;
    });
  }, [toast]);

  const handleConvertToClassroomExclusive = useCallback(async () => {
    if (!mapContext || !classroomId || mapContext.is_classroom_exclusive) {
      return;
    }

    const confirmMessage = `Convert this map to classroom-exclusive?\n\nThis will:\n• Make the map private to this classroom\n• Enable group management features\n• Allow you to create assessment groups\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setConverting(true);
    try {
      console.log("🔄 Converting map to classroom-exclusive...", {
        mapId: mapContext.map_id,
        classroomId,
      });

      await convertMapToClassroomExclusive(mapContext.map_id, classroomId);

      toast({
        title: "Map converted successfully!",
        description: "This map is now classroom-exclusive. You can create assessment groups.",
      });

      // Reload data to reflect the changes
      await loadData();
      onGroupsUpdated();
    } catch (error) {
      console.error("❌ Failed to convert map:", error);
      toast({
        title: "Failed to convert map",
        description: (error as Error).message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  }, [mapContext, classroomId, toast, loadData, onGroupsUpdated]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Assessment Groups
          </DialogTitle>
          <DialogDescription>
            Create and manage groups for this assessment. Students in the same group will share submissions.
          </DialogDescription>
        </DialogHeader>

        <div
          className="border"
          style={{
            maxHeight: "50vh",
            overflowY: "scroll",
            scrollbarWidth: "auto", // Firefox
            msOverflowStyle: "scrollbar" // IE/Edge
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="groups">
                Groups ({groups.length})
              </TabsTrigger>
              <TabsTrigger value="students">
                Students ({students.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-4">
              <div className="space-y-4">
                {/* Group Settings */}
                <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Group Setup</h4>


                  {/* Target Group Size */}
                  <div className="space-y-2">
                    <Label htmlFor="target_group_size" className="text-sm font-medium">
                      Target Group Size
                    </Label>
                    <Input
                      id="target_group_size"
                      type="number"
                      min="2"
                      max="20"
                      value={groupSizeInput}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setGroupSizeInput(inputValue);

                        // Update assessment only if it's a valid number
                        if (inputValue !== '') {
                          const value = parseInt(inputValue, 10);
                          if (!isNaN(value)) {
                            onAssessmentChange?.({ ...assessment, target_group_size: value });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10);
                        let finalValue: number;

                        if (isNaN(value) || value < 2) {
                          finalValue = 2;
                        } else if (value > 20) {
                          finalValue = 20;
                        } else {
                          finalValue = value;
                        }

                        setGroupSizeInput(finalValue.toString());
                        onAssessmentChange?.({ ...assessment, target_group_size: finalValue });
                      }}
                      className="w-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Preferred number of students per group (2-20)
                    </p>
                  </div>

                  {/* Allow Uneven Groups */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow_uneven_groups"
                      checked={assessment.allow_uneven_groups ?? true}
                      onCheckedChange={(checked) =>
                        onAssessmentChange?.({ ...assessment, allow_uneven_groups: checked as boolean })
                      }
                    />
                    <Label htmlFor="allow_uneven_groups" className="text-sm">
                      Allow groups with different sizes
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    When disabled, all groups must have exactly the target size (may leave some students unassigned)
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={createNewGroup}
                    disabled={loading || students.length === 0}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Group
                  </Button>
                  <Button
                    onClick={handleAutoShuffle}
                    disabled={loading || students.length === 0}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shuffle className="h-4 w-4" />
                    )}
                    Auto Shuffle
                  </Button>
                  <Button
                    onClick={saveManualChanges}
                    disabled={loading || !hasUnsavedChanges || students.length === 0}
                    size="sm"
                    variant={hasUnsavedChanges ? "default" : "outline"}
                    className={`flex items-center gap-2 ${hasUnsavedChanges
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : ""
                      }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "💾"
                    )}
                    {hasUnsavedChanges ? "Save Changes*" : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleResetGroups}
                    disabled={loading || students.length === 0}
                    size="sm"
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset All
                  </Button>
                </div>

                {/* Groups Display */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {students.length > 0 ? (
                      <>
                        <p className="text-lg font-medium mb-2">No groups created yet</p>
                        <p className="text-sm">Use "Auto Shuffle" to automatically create groups</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium mb-2">Group management not available</p>
                        <p className="text-sm">This assessment is not part of a classroom-exclusive learning map.</p>

                        {mapContext && !mapContext.is_classroom_exclusive && classroomId && (
                          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                            <p className="text-sm font-medium text-blue-900 mb-2">
                              Enable Group Management
                            </p>
                            <p className="text-xs text-blue-700 mb-4">
                              Convert this map to classroom-exclusive to enable group assessment features.
                            </p>
                            <Button
                              onClick={handleConvertToClassroomExclusive}
                              disabled={converting || loading}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {converting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Converting...
                                </>
                              ) : (
                                <>
                                  🔄 Convert Map
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, groupIndex) => (
                      <Card
                        key={group.id}
                        className={`relative ${lockedGroupNames.has(group.group_name)
                            ? "border-orange-200 bg-orange-50/30"
                            : ""
                          }`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            {group.group_name}
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {group.members.length} members
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleGroupLock(group.id, group.group_name)}
                                className={`h-6 w-6 p-0 ${lockedGroupNames.has(group.group_name)
                                    ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                  }`}
                                title={lockedGroupNames.has(group.group_name) ? "Unlock group" : "Lock group"}
                              >
                                {lockedGroupNames.has(group.group_name) ? (
                                  <Lock className="h-3 w-3" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteGroup(groupIndex)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete group"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {group.members.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">
                                No members assigned
                              </p>
                            ) : (
                              group.members.map((member) => (
                                <div
                                  key={member.user_id}
                                  className="flex items-center justify-between p-2 bg-muted rounded"
                                >
                                  <span className="text-sm">
                                    {member.full_name || member.username || "Unknown"}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeStudentFromGroup(member.user_id, groupIndex)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <UserMinus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Unassigned Students */}
                {unassignedStudents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Unassigned Students ({unassignedStudents.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 md:grid-cols-2">
                        {unassignedStudents.map((student) => (
                          <div
                            key={student.user_id}
                            className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded"
                          >
                            <span className="text-sm text-yellow-800">
                              {student.full_name || student.username || student.email}
                            </span>
                            <div className="flex gap-1">
                              {groups.length <= 7 ? (
                                // Show buttons for 7 or fewer groups
                                groups.map((_, groupIndex) => (
                                  <Button
                                    key={groupIndex}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moveStudentToGroup(student.user_id, groupIndex)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    G{groupIndex + 1}
                                  </Button>
                                ))
                              ) : (
                                // Show dropdown for 8 or more groups
                                <Select onValueChange={(value) => moveStudentToGroup(student.user_id, parseInt(value))}>
                                  <SelectTrigger className="h-6 w-24 text-xs">
                                    <SelectValue placeholder="Group" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {groups.map((group, groupIndex) => (
                                      <SelectItem key={groupIndex} value={groupIndex.toString()}>
                                        {group.group_name || `Group ${groupIndex + 1}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    All Students ({students.length})
                  </h3>
                  <Badge variant="outline">
                    {students.length - unassignedStudents.length} assigned
                  </Badge>
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Group management not available</p>
                    <p className="text-sm mt-2">This assessment is not part of a classroom-exclusive learning map.</p>
                    <p className="text-sm">Group management is only available for assessments within classroom maps.</p>

                    {mapContext && !mapContext.is_classroom_exclusive && classroomId && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Convert to Classroom-Exclusive Map
                        </p>
                        <p className="text-xs text-blue-700 mb-4">
                          Convert this map to be classroom-exclusive to enable group management features.
                        </p>
                        <Button
                          onClick={handleConvertToClassroomExclusive}
                          disabled={converting || loading}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {converting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Converting...
                            </>
                          ) : (
                            <>
                              🔄 Convert Map
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {students.map((student) => {
                      const isAssigned = !unassignedStudents.some(u => u.user_id === student.user_id);
                      const assignedGroup = groups.find(group =>
                        group.members.some(member => member.user_id === student.user_id)
                      );

                      return (
                        <div
                          key={student.user_id}
                          className={`flex items-center justify-between p-3 border rounded ${isAssigned ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                            }`}
                        >
                          <div>
                            <span className="font-medium">
                              {student.full_name || student.username || "Unknown"}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({student.email})
                            </span>
                          </div>
                          {isAssigned && assignedGroup && (
                            <Badge variant="default">
                              {assignedGroup.group_name}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}