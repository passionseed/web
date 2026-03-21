"use client";

import React, { useState, useCallback } from "react";
import { JourneyMapCanvas } from "@/components/journey";
import { DirectionResultsView } from "@/components/education/direction-finder/DirectionResultsView";
import { getUserDirectionFinderResult } from "@/app/actions/save-direction";
import {
  DirectionFinderResult,
  AssessmentAnswers,
} from "@/types/direction-finder";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { resetJourneyMap } from "@/app/actions/journey";
import { toast } from "sonner";

interface JourneyPageClientWrapperProps {
  userId: string;
  userName: string;
  userAvatar?: string;
}

/**
 * Context for milestone breadcrumb state
 */
export const MilestoneBreadcrumbContext = React.createContext<{
  milestoneTitle: string | null;
  setMilestoneTitle: (title: string | null) => void;
  setOnBackToOverview: (callback: () => void) => void;
}>({
  milestoneTitle: null,
  setMilestoneTitle: () => {},
  setOnBackToOverview: () => {},
});

/**
 * Client wrapper for journey page that manages breadcrumb state
 */
export function JourneyPageClientWrapper({
  userId,
  userName,
  userAvatar,
}: JourneyPageClientWrapperProps) {
  const [milestoneTitle, setMilestoneTitle] = useState<string | null>(null);
  const [backToOverviewCallback, setBackToOverviewCallback] = useState<
    () => void
  >(() => {});
  const [showDirection, setShowDirection] = useState(false);
  const [directionData, setDirectionData] = useState<{
    result: DirectionFinderResult;
    answers: AssessmentAnswers;
  } | null>(null);

  const handleJourneyMapClick = useCallback(() => {
    backToOverviewCallback();
  }, [backToOverviewCallback]);

  return (
    <MilestoneBreadcrumbContext.Provider
      value={{
        milestoneTitle,
        setMilestoneTitle,
        setOnBackToOverview: setBackToOverviewCallback,
      }}
    >
      <div className="flex h-screen flex-col bg-[linear-gradient(to_bottom,#020617_0%,#0f172a_28%,#1e1b4b_58%,#312e81_82%,#1e3a5f_100%)]">
        {/* Header with breadcrumb and back button */}
        <header className="border-b border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
          <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
            {/* Back button */}
            <Link href="/me">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>

            {/* Breadcrumb */}
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/me" className="hover:text-foreground">
                      Dashboard
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {milestoneTitle ? (
                    // Clickable link to go back to overview when viewing milestone
                    <button
                      onClick={handleJourneyMapClick}
                      className="hover:text-foreground cursor-pointer transition-colors"
                    >
                      Journey Map
                    </button>
                  ) : (
                    // Static page when already in overview
                    <BreadcrumbPage className="font-semibold">
                      Journey Map
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {/* Milestone breadcrumb - shown when in milestone layer */}
                {milestoneTitle && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold">
                        {milestoneTitle}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Spacer for layout */}
            <div className="flex-1" />

            {/* Title for mobile */}
            <h1 className="md:hidden text-lg font-bold text-white">
              {milestoneTitle ? `${milestoneTitle}` : "Journey Map"}
            </h1>

            {/* Reset Button (Dev only) */}
            {process.env.NODE_ENV === "development" && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  if (
                    confirm(
                      "ARE YOU SURE? This will delete ALL journey data (North Stars, Projects, Milestones) for your account. This cannot be undone.",
                    )
                  ) {
                    try {
                      const result = await resetJourneyMap();
                      if (result.success) {
                        toast.success("Journey map reset successfully");
                        window.location.reload();
                      } else {
                        toast.error("Failed to reset journey map");
                      }
                    } catch (error) {
                      toast.error("An error occurred");
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Reset Map</span>
              </Button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative">
          {showDirection && directionData ? (
            <div className="container mx-auto max-w-7xl px-4 py-8">
              <DirectionResultsView
                result={directionData.result}
                answers={directionData.answers}
                onBack={() => setShowDirection(false)}
                mode="journey_view"
              />
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden">
              <JourneyMapCanvas
                userId={userId}
                userName={userName}
                userAvatar={userAvatar}
              />
            </div>
          )}
        </main>
      </div>
    </MilestoneBreadcrumbContext.Provider>
  );
}
