"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, MapPin, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClassroomExclusiveMap } from "@/lib/supabase/classrooms";
import {
  CreateClassroomMapRequest,
  ClassroomMapFeatureType,
} from "@/types/classroom";

interface CreateClassroomMapModalProps {
  classroomId: string;
  onMapCreated?: () => void;
}

const AVAILABLE_FEATURES: {
  type: ClassroomMapFeatureType;
  label: string;
  description: string;
  icon: string;
  defaultConfig?: Record<string, any>;
}[] = [
  {
    type: "live_collaboration",
    label: "Live Collaboration",
    description: "Enable real-time editing and collaboration for classroom members",
    icon: "👥",
    defaultConfig: { max_concurrent_editors: 10, auto_save_interval: 30 },
  },
  {
    type: "auto_assessment",
    label: "Auto Assessment",
    description: "Automatic grading based on completion and performance",
    icon: "🤖",
    defaultConfig: { passing_score: 80, auto_grade_on_completion: true },
  },
  {
    type: "peer_review",
    label: "Peer Review",
    description: "Students can review and provide feedback on each other's work",
    icon: "🔄",
    defaultConfig: { reviews_per_student: 2, anonymous_reviews: true },
  },
  {
    type: "progress_tracking",
    label: "Progress Tracking",
    description: "Detailed analytics and progress monitoring for instructors",
    icon: "📊",
    defaultConfig: { track_time_spent: true, milestone_notifications: true },
  },
  {
    type: "time_boxed_access",
    label: "Time-boxed Access",
    description: "Control when students can access and work on the map",
    icon: "⏰",
    defaultConfig: { access_window_hours: 24, late_submission_penalty: 10 },
  },
  {
    type: "custom_branding",
    label: "Custom Branding",
    description: "Apply classroom-specific themes and branding",
    icon: "🎨",
    defaultConfig: { theme_color: "#3b82f6", show_classroom_logo: true },
  },
];

export function CreateClassroomMapModal({
  classroomId,
  onMapCreated,
}: CreateClassroomMapModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [selectedFeatures, setSelectedFeatures] = useState<Set<ClassroomMapFeatureType>>(new Set());
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Map title is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const mapRequest: CreateClassroomMapRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        initial_features: Array.from(selectedFeatures).map(featureType => {
          const feature = AVAILABLE_FEATURES.find(f => f.type === featureType);
          return {
            feature_type: featureType,
            feature_config: feature?.defaultConfig || {},
          };
        }),
      };

      await createClassroomExclusiveMap(classroomId, mapRequest);
      
      toast({
        title: "Success",
        description: `Classroom map "${formData.title}" has been created successfully`,
      });
      
      // Reset form
      setFormData({ title: "", description: "" });
      setSelectedFeatures(new Set());
      setOpen(false);
      
      // Notify parent component
      onMapCreated?.();
    } catch (error) {
      console.error("Failed to create classroom map:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create classroom map",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (featureType: ClassroomMapFeatureType) => {
    const newSelected = new Set(selectedFeatures);
    if (newSelected.has(featureType)) {
      newSelected.delete(featureType);
    } else {
      newSelected.add(featureType);
    }
    setSelectedFeatures(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Classroom Map
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span>Create Classroom-Exclusive Map</span>
          </DialogTitle>
          <DialogDescription>
            Create a special map that only members of this classroom can see and access.
            You can enable advanced features specific to classroom learning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Map Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter map title..."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn in this map..."
                rows={3}
              />
            </div>
          </div>

          {/* Feature Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <Label className="text-base font-semibold">Special Features</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Select advanced features to enable for this classroom map. You can modify these later.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_FEATURES.map((feature) => (
                <div
                  key={feature.type}
                  className={`
                    border rounded-lg p-3 cursor-pointer transition-colors
                    ${selectedFeatures.has(feature.type) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => toggleFeature(feature.type)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedFeatures.has(feature.type)}
                      onChange={() => toggleFeature(feature.type)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{feature.icon}</span>
                        <span className="font-medium text-sm">{feature.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedFeatures.size > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from(selectedFeatures).map(featureType => {
                  const feature = AVAILABLE_FEATURES.find(f => f.type === featureType);
                  return (
                    <Badge key={featureType} variant="secondary" className="text-xs">
                      {feature?.icon} {feature?.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()}>
              {isLoading ? "Creating..." : "Create Map"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}