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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { TeamWithMembers, TEAM_CONSTANTS } from "@/types/teams";
import { useToast } from "@/hooks/use-toast";

interface TeamSettingsModalProps {
  team: TeamWithMembers;
  classroomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamUpdated: () => void;
}

const TEAM_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#84cc16", // lime
];

const COMMON_SKILLS = [
  "Frontend Development",
  "Backend Development",
  "UI/UX Design",
  "Project Management",
  "Data Analysis",
  "Mobile Development",
  "DevOps",
  "Machine Learning",
  "Quality Assurance",
  "Database Design",
];

export function TeamSettingsModal({
  team,
  classroomId,
  open,
  onOpenChange,
  onTeamUpdated,
}: TeamSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_members: 6,
    is_active: true,
    team_metadata: {
      color: TEAM_COLORS[0],
      skills: [] as string[],
      goals: "",
      preferred_meeting_times: [] as string[],
      communication_platform: "",
    },
  });
  const { toast } = useToast();

  // Initialize form data when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        max_members: team.max_members || 6,
        is_active: team.is_active,
        team_metadata: {
          color: team.team_metadata?.color || TEAM_COLORS[0],
          skills: team.team_metadata?.skills || [],
          goals: team.team_metadata?.goals || "",
          preferred_meeting_times:
            team.team_metadata?.preferred_meeting_times || [],
          communication_platform:
            team.team_metadata?.communication_platform || "",
        },
      });
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.name.length < TEAM_CONSTANTS.MIN_TEAM_NAME_LENGTH) {
      toast({
        title: "Error",
        description: `Team name must be at least ${TEAM_CONSTANTS.MIN_TEAM_NAME_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_details",
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            max_members: formData.max_members,
            is_active: formData.is_active,
            team_metadata: formData.team_metadata,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team updated successfully!",
        });
        onTeamUpdated();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/classrooms/${classroomId}/teams/${team.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team deleted successfully",
        });
        onTeamUpdated();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !formData.team_metadata.skills.includes(trimmedSkill)) {
      setFormData((prev) => ({
        ...prev,
        team_metadata: {
          ...prev.team_metadata,
          skills: [...prev.team_metadata.skills, trimmedSkill],
        },
      }));
    }
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      team_metadata: {
        ...prev.team_metadata,
        skills: prev.team_metadata.skills.filter(
          (skill) => skill !== skillToRemove
        ),
      },
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Settings</DialogTitle>
          <DialogDescription>
            Manage your team's information, preferences, and settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="general" className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter team name"
                    maxLength={TEAM_CONSTANTS.MAX_TEAM_NAME_LENGTH}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.name.length}/{TEAM_CONSTANTS.MAX_TEAM_NAME_LENGTH}{" "}
                    characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What's your team about? What are your goals?"
                    rows={3}
                    maxLength={TEAM_CONSTANTS.MAX_TEAM_DESCRIPTION_LENGTH}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/
                    {TEAM_CONSTANTS.MAX_TEAM_DESCRIPTION_LENGTH} characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_members">Max Members</Label>
                    <Select
                      value={formData.max_members?.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_members: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          {
                            length:
                              TEAM_CONSTANTS.MAX_TEAM_SIZE -
                              TEAM_CONSTANTS.MIN_TEAM_SIZE +
                              1,
                          },
                          (_, i) => TEAM_CONSTANTS.MIN_TEAM_SIZE + i
                        ).map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} members
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Team Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.team_metadata.color === color
                              ? "border-foreground"
                              : "border-muted"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              team_metadata: { ...prev.team_metadata, color },
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="is_active">Team Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Inactive teams won't appear in team lists
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              {/* Skills */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Skills & Interests</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={handleSkillKeyPress}
                      placeholder="Add a skill or interest"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addSkill(skillInput)}
                      disabled={!skillInput.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Common Skills */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Quick add:</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SKILLS.filter(
                        (skill) =>
                          !formData.team_metadata.skills.includes(skill)
                      ).map((skill) => (
                        <Button
                          key={skill}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSkill(skill)}
                          className="text-xs"
                        >
                          {skill}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Skills */}
                  {formData.team_metadata.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.team_metadata.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="pr-1">
                          {skill}
                          <button
                            type="button"
                            className="ml-1 hover:text-destructive"
                            onClick={() => removeSkill(skill)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label htmlFor="goals">Team Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.team_metadata.goals}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      team_metadata: {
                        ...prev.team_metadata,
                        goals: e.target.value,
                      },
                    }))
                  }
                  placeholder="What does your team want to achieve together?"
                  rows={3}
                />
              </div>

              {/* Communication */}
              <div className="space-y-2">
                <Label htmlFor="communication">Communication Platform</Label>
                <Input
                  id="communication"
                  value={formData.team_metadata.communication_platform}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      team_metadata: {
                        ...prev.team_metadata,
                        communication_platform: e.target.value,
                      },
                    }))
                  }
                  placeholder="Discord, Slack, WhatsApp, etc."
                />
              </div>
            </TabsContent>

            <TabsContent value="danger" className="space-y-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Danger Zone</span>
                  </CardTitle>
                  <CardDescription>
                    These actions cannot be undone. Please proceed with caution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-800">
                          Delete Team
                        </h4>
                        <p className="text-sm text-red-600">
                          Permanently delete this team and remove all members.
                          This action cannot be undone.
                        </p>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={loading}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Team
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the team "{team.name}" and
                              remove all {team.member_count} members from the
                              team.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteTeam}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Form Actions - Only show for general and preferences tabs */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
