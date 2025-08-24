"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createTeam } from "@/lib/supabase/teams";
import { CreateTeamRequest, TeamMetadata } from "@/types/teams";

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userClassrooms: { id: string; name: string; description: string | null }[];
  onTeamCreated: () => void;
}

const TEAM_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet  
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#84cc16", // Lime
];

const COMMON_SKILLS = [
  "Frontend Development",
  "Backend Development", 
  "UI/UX Design",
  "Data Science",
  "Mobile Development",
  "DevOps",
  "Machine Learning",
  "Project Management",
  "Quality Assurance",
  "Database Design",
];

export function CreateTeamModal({
  open,
  onOpenChange,
  userClassrooms,
  onTeamCreated,
}: CreateTeamModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    classroom_id: "",
    max_members: 6,
    color: TEAM_COLORS[0],
    skills: [] as string[],
    goals: "",
    communication_platform: "",
  });
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      classroom_id: "",
      max_members: 6,
      color: TEAM_COLORS[0],
      skills: [],
      goals: "",
      communication_platform: "",
    });
    setNewSkill("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Team name required",
        description: "Please enter a name for your team",
        variant: "destructive",
      });
      return;
    }

    if (!formData.classroom_id) {
      toast({
        title: "Classroom required",
        description: "Please select a classroom for your team",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const teamMetadata: TeamMetadata = {
        color: formData.color,
        skills: formData.skills,
        goals: formData.goals.trim() || undefined,
        communication_platform: formData.communication_platform.trim() || undefined,
      };

      const teamRequest: CreateTeamRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        classroom_id: formData.classroom_id,
        max_members: formData.max_members,
        team_metadata: teamMetadata,
      };

      await createTeam(teamRequest);
      
      toast({
        title: "Team created successfully!",
        description: `${formData.name} has been created and you are now the team leader.`,
      });
      
      resetForm();
      onTeamCreated();
    } catch (error: any) {
      console.error("Error creating team:", error);
      
      let errorMessage = "Failed to create team";
      if (error.code === "ALREADY_IN_TEAM") {
        errorMessage = "You are already in a team in this classroom";
      } else if (error.code === "NOT_IN_CLASSROOM") {
        errorMessage = "You must be a member of the classroom to create a team";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to create team",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    const skillToAdd = skill.trim();
    if (skillToAdd && !formData.skills.includes(skillToAdd)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillToAdd],
      });
    }
    setNewSkill("");
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a team to collaborate on learning maps with other students in your classroom.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                placeholder="Enter team name..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your team's purpose and goals..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <Label htmlFor="classroom">Classroom *</Label>
              <Select
                value={formData.classroom_id}
                onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select classroom..." />
                </SelectTrigger>
                <SelectContent>
                  {userClassrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_members">Maximum Members</Label>
              <Select
                value={formData.max_members.toString()}
                onValueChange={(value) => setFormData({ ...formData, max_members: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} members
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team Customization */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Team Customization</h3>
            
            {/* Team Color */}
            <div>
              <Label>Team Color</Label>
              <div className="flex gap-2 mt-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-foreground" : "border-muted"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label>Skills & Interests</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(newSkill);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkill(newSkill)}
                    disabled={!newSkill.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Common Skills */}
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.filter(skill => !formData.skills.includes(skill)).map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => addSkill(skill)}
                    >
                      + {skill}
                    </Button>
                  ))}
                </div>

                {/* Selected Skills */}
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Team Goals */}
            <div>
              <Label htmlFor="goals">Team Goals</Label>
              <Textarea
                id="goals"
                placeholder="What does your team want to achieve together?"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Communication Platform */}
            <div>
              <Label htmlFor="communication">Communication Platform</Label>
              <Input
                id="communication"
                placeholder="e.g., Discord, Slack, WhatsApp..."
                value={formData.communication_platform}
                onChange={(e) => setFormData({ ...formData, communication_platform: e.target.value })}
                maxLength={100}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Create Team"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}