"use client";

import React, { useState, useCallback } from "react";
import { JourneyMapCanvas } from "@/components/journey";
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
      <div className="flex h-screen flex-col bg-slate-950">
        {/* Header with breadcrumb and back button */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
          <div className="container mx-auto max-w-7xl flex items-center justify-between gap-4">
            {/* Back button */}
            <Link href="/me">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
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
                      "ARE YOU SURE? This will delete ALL journey data (North Stars, Projects, Milestones) for your account. This cannot be undone."
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

        {/* Main content - full screen journey map */}
        <main className="flex-1 overflow-hidden">
          <JourneyMapCanvas
            userId={userId}
            userName={userName}
            userAvatar={userAvatar}
          />
        </main>
      </div>
    </MilestoneBreadcrumbContext.Provider>
  );
}
