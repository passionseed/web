"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Node } from "@xyflow/react";
import { toast } from "sonner";
import { NodeViewPanel } from "@/components/map/NodeViewPanel";
import type { MapNode } from "@/types/map";
import { ContextPhase } from "./ContextPhase";
import { ReflectionForm, type DailyReflectionDraft } from "./ReflectionForm";
import { DecisionGate, type PathDecision } from "./DecisionGate";
import { ExitReflection } from "./ExitReflection";
import { EndReflection } from "./EndReflection";
import { TrendSummary } from "./TrendSummary";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type PathDaySummary = {
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];
  nodes: Array<{
    id: string;
    title: string;
  }>;
};

type PathLabExperienceProps = {
  enrollment: any;
  seed: any;
  path: any;
  day: any;
  dayNodes: MapNode[];
  pathDaySummaries: PathDaySummary[];
  availableDayNumbers: number[];
  currentDayNumber: number;
  reflections: any[];
  exitReflection: any | null;
  endReflection: any | null;
};

type Phase =
  | "context"
  | "action"
  | "reflection"
  | "decision"
  | "exit"
  | "end_reflection";

const STEPS = [
  { id: "context", label: "Intro", description: "Context" },
  { id: "action", label: "Do", description: "Action" },
  { id: "reflection", label: "Reflect", description: "Your thoughts" },
  { id: "decision", label: "Next", description: "Intentional step" },
];

function PhaseStepper({
  currentPhase,
  isFinalDay,
}: {
  currentPhase: Phase;
  isFinalDay: boolean;
}) {
  const stepsToShow = isFinalDay
    ? STEPS.map((s) =>
        s.id === "decision"
          ? { ...s, id: "end_reflection", label: "Finish" }
          : s,
      )
    : STEPS;

  const currentIndex = stepsToShow.findIndex((s) => s.id === currentPhase);

  if (currentIndex === -1) return null;

  return (
    <div className="mb-8 px-4">
      <div className="relative flex justify-between rounded-2xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-8 shadow-xl">
        {/* Background Line */}
        <div className="absolute top-1/2 left-8 right-8 h-[3px] -translate-y-1/2 rounded-full bg-neutral-800/50" />

        {/* Progress Line with Gradient */}
        <div
          className="absolute top-1/2 left-8 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-all duration-700 ease-out"
          style={{
            width: `calc(${(currentIndex / (stepsToShow.length - 1)) * 100}% - 1rem)`,
          }}
        />

        {stepsToShow.map((step, idx) => {
          const isActive = step.id === currentPhase;
          const isCompleted = idx < currentIndex;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-3"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  isActive
                    ? "scale-110 border-blue-500 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : isCompleted
                      ? "border-blue-500/70 bg-gradient-to-br from-neutral-900 to-neutral-950 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "border-neutral-700/50 bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-500"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-6 w-6 animate-in zoom-in duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${
                    isActive
                      ? "text-blue-300"
                      : isCompleted
                        ? "text-neutral-400"
                        : "text-neutral-600"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COMPLETE_STATUSES = new Set(["submitted", "passed", "failed"]);

function toSelectedNode(node: MapNode): Node<any> {
  return {
    id: node.id,
    type: "default",
    data: node as any,
    position: { x: 0, y: 0 },
  } as Node<any>;
}

export function PathLabExperience({
  enrollment,
  seed,
  path,
  day,
  dayNodes,
  pathDaySummaries,
  availableDayNumbers,
  currentDayNumber,
  reflections,
  exitReflection,
  endReflection,
}: PathLabExperienceProps) {
  const router = useRouter();
  const isFinalDay = day?.day_number === path?.total_days;
  const isCurrentDayView = day?.day_number === currentDayNumber;
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get(
        "phase",
      ) as Phase;
      if (
        p &&
        [
          "context",
          "action",
          "reflection",
          "decision",
          "end_reflection",
        ].includes(p)
      )
        return p;
    }
    return "context";
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    dayNodes[0]?.id || null,
  );

  // Map View State
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [actionStartTime, setActionStartTime] = useState<number | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState<DailyReflectionDraft>({
    energyLevel: 5,
    confusionLevel: 5,
    interestLevel: 5,
    openResponse: "",
    timeSpentMinutes: null,
  });
  const currentDayIndex = useMemo(
    () =>
      availableDayNumbers.findIndex(
        (dayNumber) => dayNumber === day?.day_number,
      ),
    [availableDayNumbers, day?.day_number],
  );
  const previousRenderedDay = useRef<number | null>(day?.day_number ?? null);
  const previousDayNumber =
    currentDayIndex > 0 ? availableDayNumbers[currentDayIndex - 1] : null;
  const nextDayNumber =
    currentDayIndex >= 0 && currentDayIndex < availableDayNumbers.length - 1
      ? availableDayNumbers[currentDayIndex + 1]
      : null;

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = dayNodes.find((item) => item.id === selectedNodeId);
    return node ? toSelectedNode(node) : null;
  }, [dayNodes, selectedNodeId]);

  const mapViewerDays = useMemo(() => {
    if (pathDaySummaries.length > 0) {
      return [...pathDaySummaries]
        .filter((entry) => Number.isFinite(entry.day_number))
        .sort((a, b) => a.day_number - b.day_number);
    }

    const totalDays = Number(path?.total_days || 0);
    if (!Number.isFinite(totalDays) || totalDays <= 0) {
      return [];
    }

    return Array.from({ length: totalDays }, (_, index) => ({
      day_number: index + 1,
      title: null,
      context_text: "",
      reflection_prompts: [],
      node_ids: [],
      nodes: [],
    }));
  }, [path?.total_days, pathDaySummaries]);

  const upcomingDays = useMemo(
    () => mapViewerDays.filter((entry) => entry.day_number >= currentDayNumber),
    [currentDayNumber, mapViewerDays],
  );

  const dayProgressMap = useMemo(() => {
    return mapViewerDays.reduce<Record<number, { completed: number; total: number }>>(
      (acc, entry) => {
        const nodeIds = Array.isArray(entry.node_ids) ? entry.node_ids : [];
        const completed = nodeIds.filter((nodeId) =>
          COMPLETE_STATUSES.has(progressMap[nodeId]?.status),
        ).length;
        acc[entry.day_number] = { completed, total: nodeIds.length };
        return acc;
      },
      {},
    );
  }, [mapViewerDays, progressMap]);

  const allNodesComplete = useMemo(() => {
    if (dayNodes.length === 0) return true;
    const result = dayNodes.every((node) => {
      const nodeProgress = progressMap[node.id];
      const status = nodeProgress?.status;
      const isComplete = COMPLETE_STATUSES.has(status);
      console.log(
        `[PathLab] Node ${node.title}: status="${status}", isComplete=${isComplete}`,
      );
      return isComplete;
    });
    console.log(`[PathLab] All nodes complete: ${result}`, {
      progressMap,
      dayNodes: dayNodes.map((n) => n.id),
    });
    return result;
  }, [dayNodes, progressMap]);

  async function refreshProgress() {
    if (!seed?.map_id) return;
    try {
      const response = await fetch(`/api/maps/${seed.map_id}/progress`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        return;
      }
      setProgressMap(payload.data?.progress_map || {});
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    refreshProgress();
  }, [seed?.map_id]);

  useEffect(() => {
    const activeDayNumber = day?.day_number ?? null;
    if (previousRenderedDay.current !== activeDayNumber) {
      setPhase("context");
      previousRenderedDay.current = activeDayNumber;
      // Reset reflection draft and time tracking for new day
      setReflectionDraft({
        energyLevel: 5,
        confusionLevel: 5,
        interestLevel: 5,
        openResponse: "",
        timeSpentMinutes: null,
      });
      setActionStartTime(null);
    }
  }, [day?.day_number]);

  useEffect(() => {
    if (!isCurrentDayView && !["context", "action"].includes(phase)) {
      setPhase("context");
    }
  }, [isCurrentDayView, phase]);

  useEffect(() => {
    if (!dayNodes.some((item) => item.id === selectedNodeId)) {
      setSelectedNodeId(dayNodes[0]?.id || null);
    }
  }, [dayNodes, selectedNodeId]);

  // Auto time tracking - start when entering action phase
  useEffect(() => {
    const storageKey = `pathlab_time_${enrollment.id}_day_${day?.day_number}`;

    if (phase === "action" && !actionStartTime) {
      // Check if we have a stored start time (in case of refresh)
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const storedTime = parseInt(stored, 10);
        if (!isNaN(storedTime)) {
          console.log("⏱️ Resumed time tracking from:", new Date(storedTime));
          setActionStartTime(storedTime);
        }
      } else {
        // Start new timer
        const now = Date.now();
        console.log("⏱️ Started time tracking at:", new Date(now));
        setActionStartTime(now);
        localStorage.setItem(storageKey, String(now));
      }
    }

    // When entering reflection phase, calculate elapsed time
    if (phase === "reflection" && actionStartTime) {
      const elapsedMs = Date.now() - actionStartTime;
      const elapsedMinutes = Math.round(elapsedMs / 60000); // Convert to minutes

      console.log("⏱️ Time tracking ended. Elapsed:", elapsedMinutes, "minutes");

      // Auto-fill time if not already set
      if (reflectionDraft.timeSpentMinutes === null) {
        setReflectionDraft((prev) => ({
          ...prev,
          timeSpentMinutes: elapsedMinutes,
        }));
        console.log("✅ Auto-filled time spent:", elapsedMinutes, "minutes");
      }

      // Clear localStorage for this day
      localStorage.removeItem(storageKey);
    }

    // Clean up on day change
    if (phase === "context") {
      setActionStartTime(null);
      localStorage.removeItem(storageKey);
    }
  }, [phase, actionStartTime, day?.day_number, enrollment.id, reflectionDraft.timeSpentMinutes]);

  const navigateToDay = (dayNumber: number) => {
    router.push(`/seeds/pathlab/${enrollment.id}?day=${dayNumber}`);
  };

  const submitDecision = async (
    decision: PathDecision,
    extra?: { exitReflection?: any },
  ) => {
    if (!day) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/pathlab/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          dayNumber: day.day_number,
          energyLevel: reflectionDraft.energyLevel,
          confusionLevel: reflectionDraft.confusionLevel,
          interestLevel: reflectionDraft.interestLevel,
          openResponse: reflectionDraft.openResponse,
          timeSpentMinutes: reflectionDraft.timeSpentMinutes,
          extraPromptResponses: reflectionDraft.extraPromptResponses,
          decision,
          exitReflection: extra?.exitReflection,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to submit reflection");
      }

      if (decision === "continue_now") {
        toast.success("Starting next day");
        router.push(`/seeds/pathlab/${enrollment.id}`);
        router.refresh();
        return;
      }

      if (
        decision === "continue_tomorrow" ||
        decision === "pause" ||
        decision === "quit"
      ) {
        router.push("/seeds?gallery=1&type=pathlab");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit reflection");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinalReflection = async (payload: {
    overallInterest: number;
    fitLevel: number;
    surpriseResponse: string;
    wouldExploreDeeper: "yes" | "maybe" | "no";
  }) => {
    if (!day) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/pathlab/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          dayNumber: day.day_number,
          energyLevel: reflectionDraft.energyLevel,
          confusionLevel: reflectionDraft.confusionLevel,
          interestLevel: reflectionDraft.interestLevel,
          openResponse: reflectionDraft.openResponse,
          timeSpentMinutes: reflectionDraft.timeSpentMinutes,
          extraPromptResponses: reflectionDraft.extraPromptResponses,
          decision: "final_reflection",
          endReflection: {
            overallInterest: payload.overallInterest,
            fitLevel: payload.fitLevel,
            surpriseResponse: payload.surpriseResponse,
            wouldExploreDeeper: payload.wouldExploreDeeper,
          },
        }),
      });

      const responsePayload = await response.json();
      if (!response.ok) {
        throw new Error(
          responsePayload?.error || "Failed to submit final reflection",
        );
      }

      toast.success("Path marked as explored");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit final reflection");
    } finally {
      setSubmitting(false);
    }
  };

  if (enrollment.status === "quit") {
    return (
      <div className="space-y-4">
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Path exited</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-neutral-200">
            <p>You chose to exit this path. That is a valid outcome.</p>
            {exitReflection && (
              <>
                <p>Reason: {exitReflection.reason_category}</p>
                <p>Interest change: {exitReflection.interest_change}</p>
              </>
            )}
            <Button
              onClick={() => router.push("/seeds?gallery=1&type=pathlab")}
              className="mt-2 bg-white text-black hover:bg-neutral-200"
            >
              Back to PathLab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enrollment.status === "explored" || endReflection) {
    const handleRestart = async () => {
      console.log("🔄 Starting restart...");
      setRestarting(true);
      try {
        console.log("📤 Sending restart request for seed:", seed.id);
        const response = await fetch("/api/pathlab/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedId: seed.id,
            whyJoined: "Restarting path exploration",
            restart: true,
          }),
        });

        console.log("📥 Response status:", response.status);
        const payload = await response.json();
        console.log("📦 Response payload:", payload);

        if (!response.ok) {
          console.error("❌ Response not OK:", payload);
          throw new Error(payload?.error || "Failed to restart path");
        }

        const enrollmentId = payload?.enrollment?.id;
        console.log("🎫 Enrollment ID:", enrollmentId);

        if (!enrollmentId) {
          console.error("❌ No enrollment ID in response");
          throw new Error("Enrollment was created without id");
        }

        console.log("✅ Restarting complete, redirecting to:", `/seeds/pathlab/${enrollmentId}`);

        // Refresh the page to show Day 1
        router.refresh();
        router.push(`/seeds/pathlab/${enrollmentId}`);
      } catch (error: any) {
        console.error("💥 Restart error:", error);
        toast.error(error?.message || "Failed to restart path");
        setRestarting(false);
      }
    };

    return (
      <div className="space-y-4">
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Explored</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-neutral-200">
            <p>You completed this PathLab exploration.</p>
            <p>
              Final interest: {endReflection?.overall_interest ?? "-"} / 10, fit:{" "}
              {endReflection?.fit_level ?? "-"} / 10
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/seeds?gallery=1&type=pathlab")}
                variant="outline"
                className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                Back to PathLab
              </Button>
              <Button
                onClick={handleRestart}
                disabled={restarting}
                className="flex-1 bg-white text-black hover:bg-neutral-200"
              >
                {restarting ? "Restarting..." : "Restart Path"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <TrendSummary trend={reflections || []} />
      </div>
    );
  }

  if (!day) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardContent className="p-6 text-neutral-200">
          This path has no day configuration yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Modal */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-2xl border-neutral-800 bg-neutral-950">
          <DialogTitle className="text-white">What&apos;s coming</DialogTitle>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {upcomingDays.length > 0 ? (
              upcomingDays.map((entry) => {
                const isCurrent = entry.day_number === currentDayNumber;
                const progress = dayProgressMap[entry.day_number] || {
                  completed: 0,
                  total: 0,
                };
                const nodeLabel =
                  progress.total === 1 ? "1 activity" : `${progress.total} activities`;
                const contextPreview = entry.context_text
                  ? entry.context_text.replace(/\s+/g, " ").trim()
                  : "";
                const activityPreview = entry.nodes.slice(0, 4);
                const promptPreview = entry.reflection_prompts.slice(0, 2);

                return (
                  <div
                    key={entry.day_number}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        Day {entry.day_number}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isCurrent
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {isCurrent ? "Current" : "Upcoming"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-200">
                      {entry.title?.trim() || "Planned day"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {nodeLabel}
                      {progress.total > 0 &&
                        ` · ${progress.completed}/${progress.total} complete`}
                    </p>

                    {contextPreview && (
                      <p className="mt-2 text-xs text-neutral-300">
                        {contextPreview.length > 180
                          ? `${contextPreview.slice(0, 180)}...`
                          : contextPreview}
                      </p>
                    )}

                    {activityPreview.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                          Activities
                        </p>
                        <ul className="mt-1 space-y-1">
                          {activityPreview.map((activity) => (
                            <li
                              key={`${entry.day_number}-${activity.id}`}
                              className="text-xs text-neutral-200"
                            >
                              {activity.title}
                            </li>
                          ))}
                        </ul>
                        {entry.nodes.length > activityPreview.length && (
                          <p className="mt-1 text-xs text-neutral-500">
                            +{entry.nodes.length - activityPreview.length} more
                          </p>
                        )}
                      </div>
                    )}

                    {promptPreview.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                          Reflection prompts
                        </p>
                        <ul className="mt-1 space-y-1">
                          {promptPreview.map((prompt, index) => (
                            <li
                              key={`${entry.day_number}-prompt-${index}`}
                              className="text-xs text-neutral-300"
                            >
                              {prompt}
                            </li>
                          ))}
                        </ul>
                        {entry.reflection_prompts.length > promptPreview.length && (
                          <p className="mt-1 text-xs text-neutral-500">
                            +{entry.reflection_prompts.length - promptPreview.length} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
                No upcoming days are available yet.
              </div>
            )}
          </div>
          <div className="flex justify-end border-t border-neutral-800 pt-4">
            <Button variant="outline" onClick={() => setIsMapOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
              PathLab
            </p>
            <h2 className="text-xl font-semibold text-white">{seed.title}</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {mapViewerDays.length > 0 && (
              <Button
                variant="ghost"
                className="text-neutral-400 hover:text-white"
                onClick={() => setIsMapOpen(true)}
              >
                View what&apos;s coming
              </Button>
            )}
            <p className="text-sm text-neutral-300">
              Day {day.day_number} of {path.total_days}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                previousDayNumber && navigateToDay(previousDayNumber)
              }
              disabled={!previousDayNumber}
              className="border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              Previous day
            </Button>
            <Button
              variant="outline"
              onClick={() => nextDayNumber && navigateToDay(nextDayNumber)}
              disabled={!nextDayNumber}
              className="border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              Next day
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isCurrentDayView && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
            <p className="text-sm text-neutral-300">
              Review mode. Day {currentDayNumber} is your active day for
              reflections and decisions.
            </p>
            <Button
              onClick={() => navigateToDay(currentDayNumber)}
              className="bg-white text-black hover:bg-neutral-200"
            >
              Go to active day
            </Button>
          </CardContent>
        </Card>
      )}

      {isCurrentDayView && (
        <PhaseStepper currentPhase={phase} isFinalDay={isFinalDay} />
      )}

      {phase === "context" && (
        <ContextPhase
          dayNumber={day.day_number}
          dayTitle={day?.title}
          contextText={day.context_text}
          onContinue={() => setPhase("action")}
          onSkip={() => setPhase(isCurrentDayView ? "reflection" : "action")}
          skipLabel={isCurrentDayView ? "Skip to Reflection" : "Skip to Action"}
        />
      )}

      {phase === "action" && (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dayNodes.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {dayNodes.map((node) => (
                    <Button
                      key={node.id}
                      variant={
                        selectedNodeId === node.id ? "default" : "outline"
                      }
                      onClick={() => setSelectedNodeId(node.id)}
                      className={
                        selectedNodeId === node.id
                          ? "bg-white text-black hover:bg-neutral-200"
                          : "border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-800"
                      }
                    >
                      {node.title}
                    </Button>
                  ))}
                </div>

                <div className="min-h-[80vh] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/50">
                  {selectedNode && (
                    <NodeViewPanel
                      selectedNode={selectedNode}
                      mapId={seed.map_id}
                      isNodeUnlocked
                      onProgressUpdate={refreshProgress}
                    />
                  )}
                </div>

                {isCurrentDayView ? (
                  <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
                    <p className="text-sm text-neutral-300">
                      {allNodesComplete
                        ? "All day nodes are submitted/completed."
                        : "Finish each node in this day before reflection."}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setPhase("reflection")}
                        className="text-neutral-400 hover:text-white"
                      >
                        Skip to reflection
                      </Button>
                      <Button
                        onClick={() => setPhase("reflection")}
                        disabled={!allNodesComplete}
                        className="bg-white text-black hover:bg-neutral-200"
                      >
                        Next: Reflection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
                    <p className="text-sm text-neutral-300">
                      Reviewing a previous day. Switch back to Day{" "}
                      {currentDayNumber} to continue your path.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4 text-neutral-300">
                <p>No action nodes are assigned for this day.</p>
                {isCurrentDayView ? (
                  <Button
                    onClick={() => setPhase("reflection")}
                    className="bg-white text-black hover:bg-neutral-200"
                  >
                    Continue to reflection
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigateToDay(currentDayNumber)}
                    className="bg-white text-black hover:bg-neutral-200"
                  >
                    Go to active day
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isCurrentDayView && phase === "reflection" && (
        <ReflectionForm
          value={reflectionDraft}
          extraPrompts={
            Array.isArray(day.reflection_prompts) ? day.reflection_prompts : []
          }
          submitting={submitting}
          onChange={setReflectionDraft}
          onSubmit={() => setPhase(isFinalDay ? "end_reflection" : "decision")}
        />
      )}

      {isCurrentDayView && phase === "decision" && (
        <DecisionGate
          submitting={submitting}
          onChoose={(decision) => {
            if (decision === "quit") {
              setPhase("exit");
              return;
            }
            submitDecision(decision);
          }}
        />
      )}

      {isCurrentDayView && phase === "exit" && (
        <ExitReflection
          submitting={submitting}
          onBack={() => setPhase("decision")}
          onSubmit={(payload) =>
            submitDecision("quit", { exitReflection: payload })
          }
        />
      )}

      {isCurrentDayView && phase === "end_reflection" && (
        <div className="space-y-4">
          <TrendSummary
            trend={[
              ...(reflections || []),
              {
                day_number: day.day_number,
                energy_level: reflectionDraft.energyLevel,
                confusion_level: reflectionDraft.confusionLevel,
                interest_level: reflectionDraft.interestLevel,
              },
            ]}
          />
          <EndReflection
            submitting={submitting}
            onSubmit={submitFinalReflection}
          />
        </div>
      )}
    </div>
  );
}
