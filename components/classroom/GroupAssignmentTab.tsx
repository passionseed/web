"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { GroupManagement } from "./GroupManagement";
import { 
  getClassroomGroups, 
  getGroupAssignments,
  assignAssignmentToGroup 
} from "@/lib/supabase/assignment-groups";
import { getClassroomAssignments } from "@/lib/supabase/assignments";
import type { 
  AssignmentGroupWithMembers, 
  AssignmentGroupWithAssignments,
  ClassroomAssignment 
} from "@/types/classroom";
import {
  Users,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  BookOpen,
} from "lucide-react";

interface GroupAssignmentTabProps {
  classroomId: string;
  userRole: "instructor" | "ta" | "student";
}

export function GroupAssignmentTab({ classroomId, userRole }: GroupAssignmentTabProps) {
  const [groups, setGroups] = useState<AssignmentGroupWithMembers[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, AssignmentGroupWithAssignments>>({});
  const [classroomAssignments, setClassroomAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"groups" | "assignments">("groups");
  const { toast } = useToast();

  const canManageGroups = userRole === "instructor" || userRole === "ta";

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch groups
      const fetchedGroups = await getClassroomGroups(classroomId);
      setGroups(fetchedGroups);

      // Fetch classroom assignments for context
      if (canManageGroups) {
        const assignments = await getClassroomAssignments(classroomId);
        setClassroomAssignments(assignments);
      }

      // Fetch group assignments
      const groupAssignmentData: Record<string, AssignmentGroupWithAssignments> = {};
      
      for (const group of fetchedGroups) {
        try {
          const groupWithAssignments = await getGroupAssignments(group.id);
          groupAssignmentData[group.id] = groupWithAssignments;
        } catch (error) {
          console.error(`Error fetching assignments for group ${group.id}:`, error);
        }
      }
      
      setGroupAssignments(groupAssignmentData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load group data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [classroomId]);

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, variant: "destructive" as const };
    } else if (diffDays === 0) {
      return { text: "Due today", variant: "destructive" as const };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} day(s)`, variant: "default" as const };
    } else {
      return { text: `Due ${date.toLocaleDateString()}`, variant: "outline" as const };
    }
  };

  const renderGroupAssignments = () => {
    if (groups.length === 0) {
      return (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Create assignment groups first to assign tasks to teams
            </p>
            <Button
              onClick={() => setActiveTab("groups")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Manage Groups
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {groups.map((group) => {
          const groupData = groupAssignments[group.id];
          const assignments = groupData?.assignments || [];

          return (
            <Card key={group.id} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border border-slate-600"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <CardTitle className="text-lg text-gray-100">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {group.member_count} member(s) • {assignments.length} assignment(s)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-600 text-gray-300">
                    <Users className="h-3 w-3 mr-1" />
                    {group.member_count}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Group Assignments
                    </h4>
                    
                    {assignments.map((groupAssignment) => {
                      const assignment = groupAssignment.classroom_assignments;
                      const dueInfo = groupAssignment.due_date 
                        ? formatDueDate(groupAssignment.due_date)
                        : null;

                      return (
                        <div
                          key={groupAssignment.id}
                          className="p-4 bg-slate-700 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-100 mb-1">
                                {assignment.title}
                              </h5>
                              {assignment.description && (
                                <p className="text-sm text-gray-400 mb-2">
                                  {assignment.description}
                                </p>
                              )}
                              {groupAssignment.instructions && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-blue-400">
                                    Group Instructions:
                                  </span>
                                  <p className="text-sm text-gray-300 mt-1">
                                    {groupAssignment.instructions}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {dueInfo && (
                                <Badge variant={dueInfo.variant} className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {dueInfo.text}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No assignments for this group yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-32 bg-slate-700 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-slate-600 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-600 rounded w-2/3" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-2">
                <div className="h-16 bg-slate-600 rounded" />
                <div className="h-12 bg-slate-600 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Group Assignments</h2>
          <p className="text-gray-400 mt-1">
            {canManageGroups
              ? "Manage assignment groups and assign tasks to teams"
              : "View your group assignments and collaborate with team members"}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
        <button
          onClick={() => setActiveTab("groups")}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${activeTab === "groups"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-slate-700"
            }
          `}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Manage Groups
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${activeTab === "assignments"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-slate-700"
            }
          `}
        >
          <Target className="h-4 w-4 inline mr-2" />
          Group Assignments
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "groups" && (
          <GroupManagement classroomId={classroomId} userRole={userRole} />
        )}

        {activeTab === "assignments" && renderGroupAssignments()}
      </div>

      {/* Info Alert for Students */}
      {!canManageGroups && (
        <Alert className="bg-blue-900/20 border-blue-600/30">
          <AlertTriangle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            You can join available groups and view assignments assigned to your groups. 
            Contact your instructor if you need to switch groups or have questions about group assignments.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}