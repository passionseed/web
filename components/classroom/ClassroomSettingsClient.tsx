"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClassroomSettings } from "./ClassroomSettings";

interface ClassroomSettingsData {
  id: string;
  name: string;
  description?: string;
  join_code: string;
  max_students: number;
  enable_assignments: boolean;
  settings: Record<string, any>;
}

interface ClassroomSettingsClientProps {
  classroom: ClassroomSettingsData;
  canManage: boolean;
}

export function ClassroomSettingsClient({ 
  classroom, 
  canManage 
}: ClassroomSettingsClientProps) {
  const router = useRouter();

  const handleSave = async (settings: Partial<ClassroomSettingsData>) => {
    const response = await fetch(`/api/classrooms/${classroom.id}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update settings");
    }

    // Refresh the page to show updated data
    router.refresh();
  };

  return (
    <ClassroomSettings
      classroom={classroom}
      onSave={handleSave}
      canManage={canManage}
    />
  );
}