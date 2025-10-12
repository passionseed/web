"use client";

import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";
import { CreateClassroomButton } from "./CreateClassroomButton";

interface ClassroomActionButtonsProps {
  onClassroomCreated?: () => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "outline";
}

export function ClassroomActionButtons({
  onClassroomCreated,
  className = "",
  orientation = "horizontal",
  variant = "default"
}: ClassroomActionButtonsProps) {
  const containerClass = orientation === "horizontal" 
    ? "flex items-center space-x-2" 
    : "flex flex-col space-y-2";

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Join Classroom Button */}
      <Button variant={variant} asChild>
        <Link href="/classrooms/join">
          <Users className="h-4 w-4 mr-2" />
          Join with Code
        </Link>
      </Button>

      {/* Create Classroom Button (only shows for instructors/admins) */}
      <CreateClassroomButton 
        onClassroomCreated={onClassroomCreated}
        variant={variant}
      />
    </div>
  );
}