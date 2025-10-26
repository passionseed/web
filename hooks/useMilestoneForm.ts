/**
 * useMilestoneForm - Custom hook for milestone form state and logic
 * Handles validation, state management, and submission
 */

import { useState, useEffect } from "react";
import { ProjectMilestone, MilestoneStatus } from "@/types/journey";
import { createMilestone, updateMilestone } from "@/lib/supabase/journey";
import { toast } from "sonner";

interface UseMilestoneFormProps {
  projectId: string;
  milestone?: ProjectMilestone | null;
  onSuccess?: () => void;
  existingMilestones?: ProjectMilestone[];
}

interface MilestoneFormData {
  title: string;
  description: string;
  details: string;
  progress: number;
  status: MilestoneStatus;
}

export function useMilestoneForm({
  projectId,
  milestone,
  onSuccess,
  existingMilestones = [],
}: UseMilestoneFormProps) {
  // Form state
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: "",
    description: "",
    details: "",
    progress: 0,
    status: "not_started" as MilestoneStatus,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data from milestone (for edit mode)
  useEffect(() => {
    if (milestone) {
      setFormData({
        title: milestone.title || "",
        description: milestone.description || "",
        details: milestone.details || "",
        progress: milestone.progress_percentage || 0,
        status: milestone.status,
      });
    } else {
      // Reset for create mode
      resetForm();
    }
  }, [milestone]);

  // Update individual fields
  const updateField = <K extends keyof MilestoneFormData>(
    field: K,
    value: MilestoneFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 500) {
      newErrors.title = "Title must be 500 characters or less";
    }

    if (formData.description.length > 2000) {
      newErrors.description = "Description must be 2000 characters or less";
    }

    if (formData.details.length > 10000) {
      newErrors.details = "Details must be 10,000 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate position for new milestone
  const calculatePosition = () => {
    if (existingMilestones.length === 0) {
      return { x: 0, y: 0 };
    }

    // Find the rightmost milestone and place new one to the right
    const rightmostMilestone = existingMilestones.reduce((max, m) => {
      const x = m.position_x ?? 0;
      return x > (max.position_x ?? 0) ? m : max;
    });

    return {
      x: (rightmostMilestone.position_x ?? 0) + 250,
      y: rightmostMilestone.position_y ?? 0,
    };
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      if (milestone) {
        // Edit mode - update existing milestone
        await updateMilestone(milestone.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          details: formData.details.trim() || null,
          progress_percentage: formData.progress,
          status: formData.status,
        });
        toast.success("Milestone updated successfully");
      } else {
        // Create mode - create new milestone
        const position = calculatePosition();
        await createMilestone(projectId, {
          project_id: projectId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          metadata: {
            details: formData.details.trim() || undefined,
          },
          status: formData.status,
          position: position,
        });
        toast.success("Milestone created successfully");
        resetForm();
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error submitting milestone:", error);
      toast.error(milestone ? "Failed to update milestone" : "Failed to create milestone");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      details: "",
      progress: 0,
      status: "not_started",
    });
    setErrors({});
  };

  return {
    formData,
    updateField,
    errors,
    isSubmitting,
    handleSubmit,
    resetForm,
    isEditMode: !!milestone,
  };
}
