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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Shuffle, 
  Plus, 
  Trash2, 
  UserPlus, 
  UserMinus,
  RotateCcw,
  Loader2,
  Settings
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getAssessmentGroups,
  getClassroomStudentsForAssessment,
  createAssessmentGroupsShuffle,
  updateAssessmentGroupsManual,
  deleteAssessmentGroups,
} from "@/lib/supabase/assessment-groups";
import {
  AssessmentGroupWithMembers,
  NodeAssessment,
  GroupFormationMethod,
} from "@/types/map";

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: NodeAssessment;
  onGroupsUpdated: () => void;
  onAssessmentChange?: (assessment: NodeAssessment) => void;
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
}: GroupManagementModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<AssessmentGroupWithMembers[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState("groups");

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && assessment.id) {
      loadData();
    }
  }, [isOpen, assessment.id]);

  const loadData = useCallback(async () => {
    if (!assessment.id) return;
    
    setLoading(true);
    try {
      console.log("📊 Loading group management data...");
      
      // Load groups and students in parallel
      const [groupsData, studentsData] = await Promise.all([
        getAssessmentGroups(assessment.id),
        getClassroomStudentsForAssessment(assessment.id),
      ]);

      console.log("👥 Loaded groups:", groupsData);
      console.log("🎓 Loaded students:", studentsData);

      setGroups(groupsData);
      setStudents(studentsData);

      // Calculate unassigned students
      const assignedUserIds = new Set(
        groupsData.flatMap(group => group.members.map(member => member.user_id))
      );
      const unassigned = studentsData.filter(
        student => !assignedUserIds.has(student.user_id)
      );
      setUnassignedStudents(unassigned);

      console.log("📋 Unassigned students:", unassigned);
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

    setLoading(true);
    try {
      console.log("🔀 Auto-shuffling groups...");
      
      await createAssessmentGroupsShuffle({
        assessment_id: assessment.id,
        target_group_size: assessment.target_group_size || 3,
        allow_uneven_groups: assessment.allow_uneven_groups ?? true,
      });

      toast({ title: "Groups shuffled successfully!" });
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
  }, [assessment, toast, loadData, onGroupsUpdated]);

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
      
      const groupsData: GroupData[] = groups.map((group, index) => ({
        group_name: group.group_name || `Group ${index + 1}`,
        member_ids: group.members.map(member => member.user_id),
      }));

      await updateAssessmentGroupsManual({
        assessment_id: assessment.id,
        groups: groupsData,
      });

      toast({ title: "Groups saved successfully!" });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Assessment Groups
          </DialogTitle>
          <DialogDescription>
            Create and manage groups for this assessment. Students in the same group will share submissions.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="groups">
                Groups ({groups.length})
              </TabsTrigger>
              <TabsTrigger value="students">
                Students ({students.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="mt-4 h-[200px] overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100" style={{overflowY: 'scroll', scrollbarWidth: 'thin'}}>
              <div className="space-y-4">
                {/* Group Settings */}
                <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Group Setup</h4>
                  
                  {/* Group Formation Method */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Group Formation Method</Label>
                    <RadioGroup
                      value={assessment.group_formation_method || 'manual'}
                      onValueChange={(value) => 
                        onAssessmentChange?.({ ...assessment, group_formation_method: value })
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="text-sm flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          Manual Assignment
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="shuffle" id="shuffle" />
                        <Label htmlFor="shuffle" className="text-sm flex items-center gap-1">
                          <Shuffle className="h-3 w-3" />
                          Auto Shuffle
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Manual: Instructors assign students to groups manually. Auto Shuffle: Students are randomly assigned to groups.
                    </p>
                  </div>

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
                      value={assessment.target_group_size || 3}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (value >= 2 && value <= 20) {
                          onAssessmentChange?.({ ...assessment, target_group_size: value });
                        }
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
                    onClick={handleAutoShuffle}
                    disabled={loading}
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
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    💾 Save Changes
                  </Button>
                  <Button
                    onClick={handleResetGroups}
                    disabled={loading}
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
                    <p className="text-lg font-medium mb-2">No groups created yet</p>
                    <p className="text-sm">Use "Auto Shuffle" to automatically create groups</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groups.map((group, groupIndex) => (
                      <Card key={group.id} className="relative">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            {group.group_name}
                            <Badge variant="secondary">
                              {group.members.length} members
                            </Badge>
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
                                {groups.map((_, groupIndex) => (
                                  <Button
                                    key={groupIndex}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moveStudentToGroup(student.user_id, groupIndex)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    G{groupIndex + 1}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-4 h-[200px] overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100" style={{overflowY: 'scroll', scrollbarWidth: 'thin'}}>
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
                    <p>No students found in this classroom</p>
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
                            className={`flex items-center justify-between p-3 border rounded ${
                              isAssigned ? 'bg-green-50 border-green-200' : 'bg-gray-50'
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

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}