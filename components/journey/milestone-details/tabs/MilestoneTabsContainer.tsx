/**
 * MilestoneTabsContainer - Tabs navigation and content routing
 * Only 2 tabs: Details and Journal (Edit tab removed, inline editing instead)
 */

"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectMilestone, MilestoneWithPaths } from "@/types/journey";
import { DetailsTab } from "./DetailsTab";
import { JournalTab } from "./JournalTab";

interface MilestoneTabsContainerProps {
  milestone: ProjectMilestone;
  milestoneDetails: MilestoneWithPaths | null;
  allMilestones: ProjectMilestone[];
  journalCount: number;
  onUpdate: () => void;
}

export function MilestoneTabsContainer({
  milestone,
  milestoneDetails,
  allMilestones,
  journalCount,
  onUpdate,
}: MilestoneTabsContainerProps) {
  return (
    <ScrollArea className="flex-1">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-slate-800/50 m-4">
          <TabsTrigger value="details" className="text-xs">
            Details
          </TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
          <DetailsTab
            milestone={milestone}
            milestoneDetails={milestoneDetails}
            allMilestones={allMilestones}
            journalCount={journalCount}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-0">
          <JournalTab milestone={milestone} />
        </TabsContent>
      </Tabs>
    </ScrollArea>
  );
}
