"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { UserRole } from "@/lib/supabase/auth-client";
import { Loader2, Shield, GraduationCap, Users, BookOpen } from "lucide-react";

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

const AVAILABLE_ROLES: { role: UserRole; label: string; description: string; icon: any }[] = [
  {
    role: "student",
    label: "Student",
    description: "Can access learning maps and participate in classrooms",
    icon: BookOpen,
  },
  {
    role: "TA",
    label: "Teaching Assistant",
    description: "Can assist in classrooms and help with grading",
    icon: Users,
  },
  {
    role: "instructor",
    label: "Instructor",
    description: "Can create and manage classrooms and assignments",
    icon: GraduationCap,
  },
  {
    role: "admin",
    label: "Administrator",
    description: "Full platform access including user management",
    icon: Shield,
  },
];

export function RoleManagementDialog({ 
  open, 
  onOpenChange, 
  user, 
  onRoleUpdated 
}: RoleManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Set<UserRole>>(new Set());
  const { toast } = useToast();

  if (!user) {
    return null;
  }

  const currentRoles = new Set(user.user_roles.map(r => r.role));
  const hasRole = (role: UserRole) => currentRoles.has(role);

  const handleRoleToggle = async (role: UserRole, shouldHave: boolean) => {
    if (loading) return;

    setLoading(true);
    setPendingChanges(prev => new Set([...prev, role]));

    try {
      const response = await fetch("/api/admin/users/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: role,
          action: shouldHave ? "add" : "remove",
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Role ${role} ${shouldHave ? "added" : "removed"} successfully`,
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
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(role);
        return newSet;
      });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Update roles for {user.profiles?.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                  {roleData.role}
                </Badge>
              ))}
              {user.user_roles.length === 0 && (
                <Badge variant="outline">No roles assigned</Badge>
              )}
            </div>
          </div>

          {/* Role Management */}
          <div className="space-y-3">
            <h4 className="font-medium">Available Roles</h4>
            {AVAILABLE_ROLES.map((roleInfo) => {
              const Icon = roleInfo.icon;
              const userHasRole = hasRole(roleInfo.role);
              const isChanging = pendingChanges.has(roleInfo.role);

              return (
                <div key={roleInfo.role} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{roleInfo.label}</span>
                        <Badge 
                          variant={getRoleBadgeVariant(roleInfo.role)}
                          className="text-xs"
                        >
                          {roleInfo.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {roleInfo.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isChanging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Checkbox
                        checked={userHasRole}
                        onCheckedChange={(checked) => 
                          handleRoleToggle(roleInfo.role, checked as boolean)
                        }
                        disabled={loading}
                      />
                    )}
                  </div>
                </div>
              );
            })}
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