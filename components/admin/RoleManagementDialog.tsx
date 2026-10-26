"use client";

import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  FlaskConical,
  GraduationCap,
  Loader2,
  Save,
  ShieldAlert,
  Sprout,
  Users,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import {
  PRIMARY_ROLES,
  ROLE_LABELS,
  canRemoveAdminRole,
  userDisplayName,
  type AdminUserRole,
  type AdminUserRow,
  type PrimaryRole,
  type RoleChangeAction,
} from "@/lib/supabase/admin-users";

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null while the user behind `?id=` is still loading. */
  user: AdminUserRow | null;
  /** The signed-in admin, so they cannot remove their own admin role. */
  currentUserId: string;
  /** Called after any successful (or partly successful) change. */
  onChanged: () => void;
}

const PRIMARY_ROLE_INFO: Record<PrimaryRole, { description: string; icon: ComponentType<{ className?: string }> }> = {
  student: { description: "Can open learning maps and join classrooms.", icon: BookOpen },
  TA: { description: "Can help in classrooms and with grading.", icon: Users },
  instructor: { description: "Can create and run classrooms and assignments.", icon: GraduationCap },
};

type Pending = "primary" | "beta-tester" | "admin" | "passion-seed-team" | "profile" | null;

export function RoleBadges({ roles }: { roles: AdminUserRole[] }) {
  if (roles.length === 0) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
        No roles
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge
          key={role}
          variant={role === "admin" ? "destructive" : role === "instructor" || role === "TA" ? "secondary" : "outline"}
          className="text-xs"
        >
          {ROLE_LABELS[role]}
        </Badge>
      ))}
    </div>
  );
}

async function postRoleChange(userId: string, role: AdminUserRole, action: RoleChangeAction) {
  const response = await fetch("/api/admin/users/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role, action }),
  });
  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: string; partial?: boolean }
    | null;
  return {
    ok: response.ok,
    partial: Boolean(body?.partial),
    message: body?.message ?? body?.error ?? (response.ok ? "Role updated" : "Could not update the role"),
  };
}

function ProfileSection({
  user,
  disabled,
  onSaved,
  setPending,
}: {
  user: AdminUserRow;
  disabled: boolean;
  onSaved: () => void;
  setPending: (pending: Pending) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", discord_uid: "" });

  useEffect(() => {
    setForm({
      username: user.username ?? "",
      full_name: user.full_name ?? "",
      discord_uid: user.discord_uid ?? "",
    });
    setEditing(false);
  }, [user.id, user.username, user.full_name, user.discord_uid]);

  const save = async () => {
    setPending("profile");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: form.username.trim(),
          full_name: form.full_name.trim(),
          discord_uid: form.discord_uid.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Could not update the profile");
      }
      toast.success("Profile updated");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the profile");
    } finally {
      setPending(null);
    }
  };

  const fields = [
    { key: "username", label: "Username", placeholder: "username" },
    { key: "full_name", label: "Full name", placeholder: "Full name" },
    { key: "discord_uid", label: "Discord user ID", placeholder: "Numeric Discord ID" },
  ] as const;

  return (
    <section className="space-y-3" aria-labelledby="role-dialog-profile">
      <div className="flex items-center justify-between">
        <h3 id="role-dialog-profile" className="text-sm font-medium">
          Profile
        </h3>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 active:bg-accent"
            onClick={() => setEditing(true)}
            disabled={disabled}
          >
            Edit profile
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`profile-${field.key}`}>{field.label}</Label>
              <Input
                id={`profile-${field.key}`}
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                disabled={disabled}
                className="h-11"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button className="min-h-11" onClick={save} disabled={disabled}>
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              className="min-h-11 active:bg-accent"
              onClick={() => setEditing(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {fields.map((field) => (
            <div key={field.key} className="contents">
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="min-w-0 truncate">{user[field.key] || "Not set"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function AccessSwitch({
  id,
  icon: Icon,
  label,
  description,
  checked,
  disabled,
  note,
  onCheckedChange,
  danger,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  note?: string;
  onCheckedChange: (checked: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className={danger ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} aria-hidden="true" />
          <Label htmlFor={id} className="font-medium">
            {label}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function RoleManagementDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onChanged,
}: RoleManagementDialogProps) {
  const [pending, setPending] = useState<Pending>(null);
  const { confirm, confirmDialog } = useConfirm();

  const runChange = async (key: Exclude<Pending, null>, role: AdminUserRole, action: RoleChangeAction) => {
    if (!user || pending) return;
    setPending(key);
    try {
      const result = await postRoleChange(user.id, role, action);
      if (result.ok) toast.success(result.message);
      else if (result.partial) toast.warning(result.message);
      else toast.error(result.message);
      if (result.ok || result.partial) onChanged();
    } catch {
      toast.error("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  };

  const roles = user?.roles ?? [];
  const primaryRoles = PRIMARY_ROLES.filter((r) => roles.includes(r));
  const primaryRole = primaryRoles[0] ?? "";
  const isAdmin = roles.includes("admin");
  const isSelf = user ? !canRemoveAdminRole(currentUserId, user.id) : false;
  const name = user ? userDisplayName(user) : "";

  const handleAdminChange = async (enable: boolean) => {
    if (!user) return;
    if (!enable && isSelf) {
      toast.error("You cannot remove your own admin role. Ask another admin to do it.");
      return;
    }
    const ok = await confirm(
      enable
        ? {
            title: `Give ${name} admin access?`,
            description:
              "Admins can see every student's data, change anyone's roles and delete content. Only give this to PassionSeed staff.",
            confirmLabel: "Give admin access",
            destructive: true,
          }
        : {
            title: `Remove admin access from ${name}?`,
            description: "They lose access to the admin workspace straight away.",
            confirmLabel: "Remove admin access",
            destructive: true,
          },
    );
    if (!ok) return;
    await runChange("admin", "admin", enable ? "add" : "remove");
  };

  const handleTeamChange = async (enable: boolean) => {
    if (!user) return;
    if (enable) {
      const ok = await confirm({
        title: `Add ${name} to the PassionSeed team?`,
        description:
          "Team members can open internal tools such as the ProjectSeed roster, which shows student details. Only add PassionSeed staff.",
        confirmLabel: "Add to team",
      });
      if (!ok) return;
    }
    await runChange("passion-seed-team", "passion-seed-team", enable ? "add" : "remove");
  };

  const busy = pending !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{user ? name : "Loading user"}</DialogTitle>
            <DialogDescription>
              {user ? user.email ?? "No email on file" : "Fetching the latest profile and roles."}
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Current roles</p>
                <RoleBadges roles={roles} />
                <p className="text-xs text-muted-foreground">
                  User ID <span className="select-all font-mono text-foreground">{user.id}</span>
                </p>
              </div>

              <ProfileSection user={user} disabled={busy} onSaved={onChanged} setPending={setPending} />

              <section className="space-y-3" aria-labelledby="role-dialog-primary">
                <h3 id="role-dialog-primary" className="text-sm font-medium">
                  Primary role
                </h3>
                <Select
                  value={primaryRole}
                  onValueChange={(value) => runChange("primary", value as PrimaryRole, "set_primary")}
                  disabled={busy}
                >
                  <SelectTrigger className="h-11" aria-label="Primary role">
                    <SelectValue placeholder="No primary role" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_ROLES.map((role) => {
                      const Icon = PRIMARY_ROLE_INFO[role].icon;
                      return (
                        <SelectItem key={role} value={role}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {ROLE_LABELS[role]}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {primaryRole
                    ? PRIMARY_ROLE_INFO[primaryRole].description
                    : "Pick a role to give this person access to learning tools."}
                </p>
                {primaryRoles.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    This user has more than one primary role. Picking one removes the others.
                  </p>
                )}
                {pending === "primary" && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Updating role
                  </p>
                )}
              </section>

              <section className="space-y-3 border-t pt-4" aria-labelledby="role-dialog-access">
                <h3 id="role-dialog-access" className="text-sm font-medium">
                  Special access
                </h3>
                <AccessSwitch
                  id="beta-access"
                  icon={FlaskConical}
                  label="Beta tester"
                  description="Sees experimental features before everyone else."
                  checked={roles.includes("beta-tester")}
                  disabled={busy}
                  onCheckedChange={(checked) => runChange("beta-tester", "beta-tester", checked ? "add" : "remove")}
                />
                <AccessSwitch
                  id="passion-seed-team"
                  icon={Sprout}
                  label="PassionSeed team"
                  description="Internal team tools, including student rosters. Does not open the admin workspace."
                  checked={roles.includes("passion-seed-team")}
                  disabled={busy}
                  onCheckedChange={handleTeamChange}
                />
                <AccessSwitch
                  id="admin-access"
                  icon={ShieldAlert}
                  danger
                  label="Admin access"
                  description="Full access to the admin workspace, including student data. Asks you to confirm."
                  checked={isAdmin}
                  disabled={busy || (isAdmin && isSelf)}
                  note={isAdmin && isSelf ? "This is you. Another admin has to remove your admin role." : undefined}
                  onCheckedChange={handleAdminChange}
                />
              </section>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-11 active:bg-accent"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
