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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";
import { addGroupMember } from "@/lib/supabase/assignment-groups";
import type { GroupMemberRole } from "@/types/classroom";
import { UserPlus, Search, Crown, User } from "lucide-react";

interface Student {
  user_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    email: string;
  };
}

interface AddStudentToGroupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classroomId: string;
  groupId: string;
  onStudentAdded?: () => void;
}

export function AddStudentToGroupModal({
  isOpen,
  onOpenChange,
  classroomId,
  groupId,
  onStudentAdded,
}: AddStudentToGroupModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState<GroupMemberRole>("member");
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const { toast } = useToast();

  const fetchAvailableStudents = async () => {
    if (!groupId || !classroomId) return;

    try {
      setFetchingStudents(true);
      const supabase = createClient();

      // Get all students in the classroom who are not already in the group
      // Use separate queries to avoid relationship issues
      const { data: memberships, error: membershipsError } = await supabase
        .from("classroom_memberships")
        .select("user_id")
        .eq("classroom_id", classroomId)
        .eq("role", "student");

      if (membershipsError) {
        throw new Error(membershipsError.message);
      }

      if (!memberships || memberships.length === 0) {
        setStudents([]);
        setFilteredStudents([]);
        return;
      }

      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, email")
        .in("id", userIds);

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      const classroomStudents = memberships.map(membership => ({
        user_id: membership.user_id,
        profiles: profiles?.find(p => p.id === membership.user_id) || {
          full_name: null,
          username: null,
          email: ""
        }
      }));

      // Get students already in the group - use count query to avoid RLS recursion
      let memberCount = 0;
      try {
        const { count, error: countError } = await supabase
          .from("assignment_group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", groupId);

        if (countError) {
          console.warn("Could not get member count:", countError.message);
        } else {
          memberCount = count || 0;
        }
      } catch (error) {
        console.warn("Error getting member count:", error);
      }

      // If no members, skip the detailed query
      let memberIds = new Set();
      if (memberCount > 0) {
        try {
          const { data: groupMembers, error: membersError } = await supabase
            .from("assignment_group_members")
            .select("user_id")
            .eq("group_id", groupId);

          if (membersError) {
            console.warn("Could not fetch group members:", membersError.message);
          } else if (groupMembers) {
            memberIds = new Set(groupMembers.map(m => m.user_id));
          }
        } catch (error) {
          console.warn("Error fetching group members:", error);
        }
      }

      // Filter out students who are already group members
      const availableStudents = classroomStudents.filter(
        student => !memberIds.has(student.user_id)
      );

      setStudents(availableStudents);
      setFilteredStudents(availableStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setFetchingStudents(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      fetchAvailableStudents();
      setSelectedStudents([]);
      setSearchTerm("");
    }
  }, [isOpen, groupId, classroomId]);

  useEffect(() => {
    const filtered = students.filter(student => {
      const name = student.profiles.full_name || student.profiles.username || "";
      const email = student.profiles.email || "";
      const search = searchTerm.toLowerCase();
      
      return (
        name.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search)
      );
    });
    
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const handleStudentToggle = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.user_id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one student to add",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Add each selected student to the group
      const promises = selectedStudents.map(studentId =>
        addGroupMember(groupId, studentId, defaultRole)
      );

      await Promise.all(promises);

      toast({
        title: "Success",
        description: `Added ${selectedStudents.length} student(s) to the group`,
      });

      // Reset form
      setSelectedStudents([]);
      setSearchTerm("");

      onStudentAdded?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Add students error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add students to group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (student: Student) => {
    return (
      student.profiles.full_name ||
      student.profiles.username ||
      student.profiles.email ||
      "Unknown Student"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-100">
            <UserPlus className="h-5 w-5 text-blue-400" />
            Add Students to Group
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select students from your classroom to add to this assignment group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-gray-200">Search Students</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10 bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Default Role Selection */}
          <div className="space-y-2">
            <Label className="text-gray-200">Default Role</Label>
            <Select
              value={defaultRole}
              onValueChange={(value: GroupMemberRole) => setDefaultRole(value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="member" className="text-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Member
                  </div>
                </SelectItem>
                <SelectItem value="leader" className="text-gray-100">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    Leader
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Students List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-200">
                Available Students ({filteredStudents.length})
              </Label>
              {filteredStudents.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedStudents.length === filteredStudents.length
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-slate-500"
                  />
                  <Label
                    htmlFor="select-all"
                    className="text-sm text-gray-300 cursor-pointer"
                  >
                    Select All
                  </Label>
                </div>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800">
              {fetchingStudents ? (
                <div className="p-4 text-center text-gray-400">
                  Loading students...
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-1 p-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.user_id}
                      className="flex items-center space-x-3 p-2 hover:bg-slate-700 rounded"
                    >
                      <Checkbox
                        id={`student-${student.user_id}`}
                        checked={selectedStudents.includes(student.user_id)}
                        onCheckedChange={(checked) =>
                          handleStudentToggle(student.user_id, checked as boolean)
                        }
                        className="border-slate-500"
                      />
                      <Label
                        htmlFor={`student-${student.user_id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-gray-100 font-medium">
                          {getDisplayName(student)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {student.profiles.email}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>
                    {searchTerm 
                      ? "No students match your search"
                      : "All students are already in this group"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <div className="text-sm text-blue-400">
              {selectedStudents.length} student(s) selected
            </div>
          )}
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
            disabled={loading || selectedStudents.length === 0}
          >
            {loading 
              ? "Adding..." 
              : `Add ${selectedStudents.length || ""} Student${selectedStudents.length !== 1 ? "s" : ""}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}