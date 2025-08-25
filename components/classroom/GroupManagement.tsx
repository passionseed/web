"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  getClassroomGroups,
  addGroupMember,
  removeGroupMember,
  deleteAssignmentGroup,
} from "@/lib/supabase/assignment-groups";
import { CreateGroupModal } from "./CreateGroupModal";
import { AddStudentToGroupModal } from "./AddStudentToGroupModal";
import { AssignGroupAssignmentModal } from "./AssignGroupAssignmentModal";
import { GroupMapGrading } from "./GroupMapGrading";
import type { AssignmentGroupWithMembers } from "@/types/classroom";
import {
  Users,
  Plus,
  MoreVertical,
  UserMinus,
  Settings,
  Trash2,
  Crown,
  User,
  Target,
  GraduationCap,
} from "lucide-react";

interface GroupManagementProps {
  classroomId: string;
  userRole: "instructor" | "ta" | "student";
}

export function GroupManagement({ classroomId, userRole }: GroupManagementProps) {
  const [groups, setGroups] = useState<AssignmentGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [showGrading, setShowGrading] = useState(false);
  const [selectedGroupForGrading, setSelectedGroupForGrading] = useState<AssignmentGroupWithMembers | null>(null);
  const { toast } = useToast();

  const canManageGroups = userRole === "instructor" || userRole === "ta";

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const fetchedGroups = await getClassroomGroups(classroomId);
      setGroups(fetchedGroups);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [classroomId]);

  const handleGroupCreated = (newGroup: any) => {
    setGroups([...groups, { ...newGroup, members: [], member_count: 0 }]);
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await removeGroupMember(groupId, userId);
      toast({
        title: "Success",
        description: "Member removed from group",
      });
      fetchGroups();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteAssignmentGroup(groupId);
      toast({
        title: "Success",
        description: `Group "${groupName}" deleted successfully`,
      });
      fetchGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleAddStudent = (groupId: string) => {
    setSelectedGroupId(groupId);
    setShowAddStudentModal(true);
  };

  const handleAssignToGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setShowAssignModal(true);
  };

  const handleGradeGroup = (group: AssignmentGroupWithMembers) => {
    setSelectedGroupForGrading(group);
    setShowGrading(true);
  };

  const renderGroupCard = (group: AssignmentGroupWithMembers) => (
    <Card
      key={group.id}
      className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border border-slate-600"
              style={{ backgroundColor: group.color }}
            />
            <div>
              <CardTitle className="text-lg text-gray-100">{group.name}</CardTitle>
              {group.description && (
                <CardDescription className="text-gray-400 mt-1">
                  {group.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-slate-600 text-gray-300"
            >
              {group.member_count}
              {group.max_members && ` / ${group.max_members}`} members
            </Badge>
            {canManageGroups && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGradeGroup(group)}
                className="h-8 text-xs bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200"
              >
                <GraduationCap className="mr-1 h-3 w-3" />
                Grade
              </Button>
            )}
            {canManageGroups && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-200 hover:bg-slate-700"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-slate-800 border-slate-700"
                >
                  <DropdownMenuItem
                    onClick={() => handleAddStudent(group.id)}
                    className="text-gray-200 hover:bg-slate-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Student
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAssignToGroup(group.id)}
                    className="text-gray-200 hover:bg-slate-700"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Assign Assignment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-600" />
                  <DropdownMenuItem
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    className="text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Members List */}
          {group.members.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </h4>
              <div className="grid gap-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {member.role === "leader" ? (
                        <Crown className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-200">
                          {member.profiles.full_name ||
                            member.profiles.username ||
                            "Unknown User"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {member.profiles.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={member.role === "leader" ? "default" : "outline"}
                        className={`text-xs ${
                          member.role === "leader"
                            ? "bg-yellow-600 text-yellow-100"
                            : "border-slate-600 text-gray-300"
                        }`}
                      >
                        {member.role}
                      </Badge>
                      {canManageGroups && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(group.id, member.user_id)}
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No members yet</p>
              {canManageGroups && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddStudent(group.id)}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                >
                  Add first member
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">Assignment Groups</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-600 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-600 rounded w-2/3"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-slate-600 rounded w-1/4"></div>
                  <div className="h-8 bg-slate-600 rounded"></div>
                  <div className="h-8 bg-slate-600 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Assignment Groups</h2>
          <p className="text-gray-400 text-sm mt-1">
            {canManageGroups
              ? "Create and manage groups for collaborative assignments"
              : "View your assignment groups and team members"}
          </p>
        </div>
        {canManageGroups && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        )}
      </div>

      {groups.length > 0 ? (
        <div className="grid gap-4">
          {groups.map(renderGroupCard)}
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No assignment groups yet
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              {canManageGroups
                ? "Create your first assignment group to enable collaborative learning and group assignments."
                : "No assignment groups have been created in this classroom yet."}
            </p>
            {canManageGroups && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Group
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onOpenChange={setShowCreateModal}
        classroomId={classroomId}
        onGroupCreated={handleGroupCreated}
      />

      <AddStudentToGroupModal
        isOpen={showAddStudentModal}
        onOpenChange={setShowAddStudentModal}
        classroomId={classroomId}
        groupId={selectedGroupId}
        onStudentAdded={fetchGroups}
      />

      <AssignGroupAssignmentModal
        isOpen={showAssignModal}
        onOpenChange={setShowAssignModal}
        classroomId={classroomId}
        groupId={selectedGroupId}
        onAssignmentAssigned={fetchGroups}
      />

      {/* Group Grading Modal/Interface */}
      {showGrading && selectedGroupForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Grade: {selectedGroupForGrading.name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Grade submissions from group members
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowGrading(false);
                  setSelectedGroupForGrading(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <GroupMapGrading
                groupId={selectedGroupForGrading.id}
                mapId={""}
                groupName={selectedGroupForGrading.name}
                onGraded={() => {
                  // Optionally refresh data
                  fetchGroups();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}