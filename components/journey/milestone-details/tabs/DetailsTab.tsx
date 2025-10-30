/**
 * DetailsTab - Main details view with inline editing
 */

"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ProjectMilestone, MilestoneWithPaths } from "@/types/journey";
import { InlineEditableDescription } from "../details/InlineEditableDescription";
import { InlineEditableDetails } from "../details/InlineEditableDetails";
import { QuickProgressControls } from "../details/QuickProgressControls";
import { DependenciesSection } from "../details/DependenciesSection";
import { MilestoneMetadata } from "../details/MilestoneMetadata";

interface DetailsTabProps {
  milestone: ProjectMilestone;
  milestoneDetails: MilestoneWithPaths | null;
  allMilestones: ProjectMilestone[];
  journalCount: number;
  onUpdate: (updatedMilestone?: ProjectMilestone) => void;
}

export function DetailsTab({
  milestone,
  milestoneDetails,
  allMilestones,
  journalCount,
  onUpdate,
}: DetailsTabProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Description */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <Label className="text-sm font-semibold text-slate-200 mb-2 block">
          Description
        </Label>
        <InlineEditableDescription milestone={milestone} onUpdate={onUpdate} />
      </div>

      {/* Detailed Notes */}
      <div className="bg-slate-800/30 rounded-lg p-3">
        <Label className="text-sm font-semibold text-slate-200 mb-2 block">
          Detailed Notes
        </Label>
        <InlineEditableDetails milestone={milestone} onUpdate={onUpdate} />
      </div>

      <Separator className="bg-slate-800" />

      {/* Quick Controls */}
      <QuickProgressControls milestone={milestone} onUpdate={onUpdate} />

      {/* Dependencies */}
      {milestoneDetails &&
        (milestoneDetails.paths_source?.length > 0 ||
          milestoneDetails.paths_destination?.length > 0) && (
          <>
            <Separator className="bg-slate-700" />
            <DependenciesSection
              milestoneDetails={milestoneDetails}
              allMilestones={allMilestones}
            />
          </>
        )}

      <Separator className="bg-slate-800" />

      {/* Metadata */}
      <MilestoneMetadata milestone={milestone} journalCount={journalCount} />
    </div>
  );
}
