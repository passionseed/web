"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UserRole } from "@/lib/supabase/auth-client";
import { Loader2, Shield, GraduationCap, Users, BookOpen, Save, X } from "lucide-react";

interface UserWithRoles {
  id: string;
  email: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  user_roles: {
    role: UserRole;
  }[];
}

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  onRoleUpdated: () => void;
}

// Only show roles that admins can assign to others (exclude admin role)
const ASSIGNABLE_ROLES: { role: UserRole; label: string; description: string; icon: any }[] = [
  {
    role: "student",
    label: "Student",
    description: "Can access learning maps and participate in classrooms",
    icon: BookOpen,
  },
  {
    role: "TA",
    label: "Moderator",
    description: "Can assist in classrooms and help with grading",
    icon: Users,
  },
  {
    role: "instructor",
    label: "Instructor",
    description: "Can create and manage classrooms and assignments",
    icon: GraduationCap,
  },
];

export function RoleManagementDialog({
  open,
  onOpenChange,
  user,
  onRoleUpdated
}: RoleManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    full_name: "",
  });
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const { toast } = useToast();

  // Reset form data when user changes - always call this hook
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.profiles?.username || "",
        full_name: user.profiles?.full_name || "",
      });
      setSelectedRole("");
      setEditingProfile(false);
    } else {
      setProfileData({
        username: "",
        full_name: "",
      });
      setSelectedRole("");
      setEditingProfile(false);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const currentRoles = new Set(user.user_roles.map(r => r.role));
  const assignableRoles = user.user_roles.filter(r => ASSIGNABLE_ROLES.some(ar => ar.role === r.role));
  const primaryRole = assignableRoles.length > 0 ? assignableRoles[0].role : "";

  const handleRoleChange = async (newRole: UserRole) => {
    if (loading || !newRole) return;

    setLoading(true);

    try {
      // Remove all current assignable roles
      for (const roleData of assignableRoles) {
        await fetch("/api/admin/users/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            role: roleData.role,
            action: "remove",
          }),
        });
      }

      // Add the new role
      const response = await fetch("/api/admin/users/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: newRole,
          action: "add",
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Role updated to ${newRole} successfully`,
        });
        onRoleUpdated();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: profileData.username.trim(),
          full_name: profileData.full_name.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User profile updated successfully",
        });
        setEditingProfile(false);
        onRoleUpdated();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin": return "destructive";
      case "instructor": return "default";
      case "TA": return "secondary";
      case "student": return "outline";
      default: return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User Profile & Role</DialogTitle>
          <DialogDescription>
            Update profile information and role for {user.profiles?.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current User Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="font-medium">
              {user.profiles?.full_name || user.profiles?.username || "Unknown User"}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {user.user_roles.map((roleData, index) => (
                <Badge
                  key={index}
                  variant={getRoleBadgeVariant(roleData.role)}
                  className="text-xs"
                >
                  {roleData.role === "TA" ? "moderator" : roleData.role}
                </Badge>
              ))}
              {user.user_roles.length === 0 && (
                <Badge variant="outline">No roles assigned</Badge>
              )}
            </div>
          </div>

          {/* Profile Editing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Profile Information</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProfile(!editingProfile)}
                disabled={loading}
              >
                {editingProfile ? <X className="h-4 w-4" /> : "Edit"}
              </Button>
            </div>
            
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileData({
                        username: user?.profiles?.username || "",
                        full_name: user?.profiles?.full_name || "",
                      });
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Username:</span> {user.profiles?.username || "Not set"}
                </div>
                <div>
                  <span className="text-muted-foreground">Full Name:</span> {user.profiles?.full_name || "Not set"}
                </div>
              </div>
            )}
          </div>

          {/* Role Management */}
          <div className="space-y-3">
            <h4 className="font-medium">Role Assignment</h4>
            <div>
              <Label htmlFor="role-select">Primary Role</Label>
              <Select
                value={selectedRole || primaryRole}
                onValueChange={(value) => {
                  setSelectedRole(value as UserRole);
                  handleRoleChange(value as UserRole);
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((roleInfo) => {
                    const Icon = roleInfo.icon;
                    return (
                      <SelectItem key={roleInfo.role} value={roleInfo.role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{roleInfo.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Admins cannot assign admin roles to other users
              </p>
            </div>

            {/* Role descriptions */}
            <div className="grid gap-2">
              {ASSIGNABLE_ROLES.map((roleInfo) => {
                const Icon = roleInfo.icon;
                const isSelected = (selectedRole || primaryRole) === roleInfo.role;
                
                return (
                  <div
                    key={roleInfo.role}
                    className={`p-3 border rounded-lg transition-colors ${
                      isSelected ? 'bg-primary/5 border-primary' : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{roleInfo.label}</span>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roleInfo.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}