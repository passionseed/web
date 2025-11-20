"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { University } from "@/types/education";
import { Target, BookOpen, Users, FileText, Clock } from "lucide-react";

interface CreateUniversityMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (milestoneData: any) => void;
  university: University;
}

export function CreateUniversityMilestoneDialog({
  open,
  onOpenChange,
  onSuccess,
  university,
}: CreateUniversityMilestoneDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal: "",
    why: "",
    category: "academic",
    importance: "important",
    target_timeframe: "",
    projectType: "learning",
    icon: "📚",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = [
    { value: "academic", label: "Academic", icon: BookOpen, description: "Academic achievements and coursework" },
    { value: "skill", label: "Skill Development", icon: Target, description: "Building specific skills and competencies" },
    { value: "experience", label: "Experience", icon: Users, description: "Leadership and extracurricular activities" },
    { value: "application", label: "Application", icon: FileText, description: "University application process" },
  ];

  const importanceOptions = [
    { value: "critical", label: "Critical", color: "text-red-400", description: "Essential for admission" },
    { value: "important", label: "Important", color: "text-yellow-400", description: "Strongly recommended" },
    { value: "beneficial", label: "Beneficial", color: "text-green-400", description: "Nice to have" },
  ];

  const timeframeOptions = [
    "Freshman Year",
    "Sophomore Year", 
    "Junior Year",
    "Senior Year",
    "Year 1-2",
    "Year 2-3",
    "Year 3-4",
    "Summer before Junior Year",
    "Summer before Senior Year",
    "Throughout High School",
    "Application Season"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSuccess({
        ...formData,
        title: formData.title,
        description: formData.description || `A milestone toward admission to ${university.name}`,
        goal: formData.goal || `Complete this milestone to improve chances of admission to ${university.name}`,
        why: formData.why || `This milestone is important for demonstrating readiness for ${university.name}`,
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        goal: "",
        why: "",
        category: "academic",
        importance: "important", 
        target_timeframe: "",
        projectType: "learning",
        icon: "📚",
      });
    } catch (error) {
      console.error("Error creating milestone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const option = categoryOptions.find(opt => opt.value === category);
    if (option) {
      const IconComponent = option.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <Target className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} suppressHydrationWarning>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getCategoryIcon(formData.category)}
            Add Milestone for {university.name}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Milestone Title *</Label>
            <Input
              id="milestone-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Achieve 4.0 GPA in STEM courses"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                suppressHydrationWarning
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance Level</Label>
              <Select
                value={formData.importance}
                onValueChange={(value) => setFormData(prev => ({ ...prev, importance: value }))}
                suppressHydrationWarning
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  {importanceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-timeframe" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Target Timeframe
            </Label>
            <Select
              value={formData.target_timeframe}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_timeframe: value }))}
              suppressHydrationWarning
            >
              <SelectTrigger>
                <SelectValue placeholder="When should this be completed?" />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map((timeframe) => (
                  <SelectItem key={timeframe} value={timeframe}>
                    {timeframe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what the student needs to accomplish..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-goal">Goal/Outcome</Label>
            <Textarea
              id="milestone-goal"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              placeholder="What will the student achieve by completing this milestone?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-why">Why is this important?</Label>
            <Textarea
              id="milestone-why"
              value={formData.why}
              onChange={(e) => setFormData(prev => ({ ...prev, why: e.target.value }))}
              placeholder="Why is this milestone crucial for university admission?"
              rows={2}
            />
          </div>

          {/* Show selected category info */}
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-1">
              {getCategoryIcon(formData.category)}
              {categoryOptions.find(opt => opt.value === formData.category)?.label}
            </div>
            <p className="text-xs text-slate-400">
              {categoryOptions.find(opt => opt.value === formData.category)?.description}
            </p>
            <div className="mt-2 text-xs">
              <span className="text-slate-400">Importance: </span>
              <span className={importanceOptions.find(opt => opt.value === formData.importance)?.color || "text-slate-300"}>
                {importanceOptions.find(opt => opt.value === formData.importance)?.label}
              </span>
              {formData.target_timeframe && (
                <>
                  <span className="text-slate-400 ml-3">Timeline: </span>
                  <span className="text-blue-400">{formData.target_timeframe}</span>
                </>
              )}
            </div>
          </div>
        </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Adding..." : "Add Milestone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}