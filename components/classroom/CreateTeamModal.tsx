"use client";

import { useState } from "react";
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
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  TeamFormData,
  TEAM_CONSTANTS,
  TeamError,
  TeamValidationError,
} from "@/types/teams";
import { createTeam } from "@/lib/supabase/teams";

interface CreateTeamModalProps {
  classroomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: () => void;
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

export function CreateTeamModal({
  classroomId,
  open,
  onOpenChange,
  onTeamCreated,
}: CreateTeamModalProps) {
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    max_members: 6,
    team_metadata: {
      color: TEAM_COLORS[0],
      skills: [],
      goals: "",
      preferred_meeting_times: [],
      communication_platform: "",
    },
  });
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a team",
        variant: "destructive",
      });
      return;
    }

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

      const result = await createTeam({
        classroom_id: classroomId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        max_members: formData.max_members || undefined,
        team_metadata: formData.team_metadata,
      });

      toast({
        title: "Success",
        description: "Team created successfully!",
      });
      onTeamCreated();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating team:", error);

      let errorMessage = "Failed to create team";

      if (error instanceof TeamValidationError) {
        errorMessage = error.message;
      } else if (error instanceof TeamError) {
        // Provide user-friendly messages for common errors
        switch (error.code) {
          case "ALREADY_IN_TEAM":
            errorMessage =
              "You're already a member of a team in this classroom";
            break;
          case "NOT_IN_CLASSROOM":
            errorMessage =
              "You must be a member of this classroom to create a team";
            break;
          case "AUTH_ERROR":
            errorMessage = "Please log in to create a team";
            break;
          case "CREATE_FAILED":
            errorMessage = "Failed to create team. Please try again.";
            break;
          default:
            errorMessage = error.message;
        }
      } else {
        errorMessage = "An unexpected error occurred";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      max_members: 6,
      team_metadata: {
        color: TEAM_COLORS[0],
        skills: [],
        goals: "",
        preferred_meeting_times: [],
        communication_platform: "",
      },
    });
    setSkillInput("");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Start a new team to collaborate with your classmates on projects and
            assignments.
          </DialogDescription>
        </DialogHeader>

        {authLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                You must be logged in to create a team.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

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
                      (skill) => !formData.team_metadata.skills.includes(skill)
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
                rows={2}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || authLoading || !isAuthenticated}
              >
                {loading ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
