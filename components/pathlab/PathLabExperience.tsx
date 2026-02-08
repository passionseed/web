"use client";

import { useEffect, useMemo, useState } from "react";
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

type PathLabExperienceProps = {
  enrollment: any;
  seed: any;
  path: any;
  day: any;
  dayNodes: MapNode[];
  reflections: any[];
  exitReflection: any | null;
  endReflection: any | null;
};

type Phase = "context" | "action" | "reflection" | "decision" | "exit" | "end_reflection";

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
  reflections,
  exitReflection,
  endReflection,
}: PathLabExperienceProps) {
  const router = useRouter();
  const isFinalDay = day?.day_number === path?.total_days;
  const [phase, setPhase] = useState<Phase>("context");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(dayNodes[0]?.id || null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState<DailyReflectionDraft>({
    energyLevel: 3,
    confusionLevel: 3,
    interestLevel: 3,
    openResponse: "",
    timeSpentMinutes: null,
  });

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = dayNodes.find((item) => item.id === selectedNodeId);
    return node ? toSelectedNode(node) : null;
  }, [dayNodes, selectedNodeId]);

  const allNodesComplete = useMemo(() => {
    if (dayNodes.length === 0) return true;
    return dayNodes.every((node) => COMPLETE_STATUSES.has(progressMap[node.id]?.status));
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
    } catch (error) {
      // no-op
    }
  }

  useEffect(() => {
    refreshProgress();
  }, [seed?.map_id]);

  const submitDecision = async (decision: PathDecision, extra?: { exitReflection?: any }) => {
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
        router.refresh();
        return;
      }

      if (decision === "continue_tomorrow" || decision === "pause" || decision === "quit") {
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
        throw new Error(responsePayload?.error || "Failed to submit final reflection");
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
            <Button onClick={() => router.push("/seeds?gallery=1&type=pathlab")} className="mt-2 bg-white text-black hover:bg-neutral-200">
              Back to PathLab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enrollment.status === "explored" || endReflection) {
    return (
      <div className="space-y-4">
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardHeader>
            <CardTitle className="text-white">Explored</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-neutral-200">
            <p>You completed this PathLab exploration.</p>
            <p>
              Final interest: {endReflection?.overall_interest ?? "-"} / 5, fit: {endReflection?.fit_level ?? "-"} / 5
            </p>
            <Button onClick={() => router.push("/seeds?gallery=1&type=pathlab")} className="mt-2 bg-white text-black hover:bg-neutral-200">
              Back to PathLab
            </Button>
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
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">PathLab</p>
            <h2 className="text-xl font-semibold text-white">{seed.title}</h2>
          </div>
          <p className="text-sm text-neutral-300">
            Day {day.day_number} of {path.total_days}
          </p>
        </CardContent>
      </Card>

      {phase === "context" && (
        <ContextPhase dayNumber={day.day_number} contextText={day.context_text} onContinue={() => setPhase("action")} />
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
                      variant={selectedNodeId === node.id ? "default" : "outline"}
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

                <div className="h-[70vh] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/50">
                  {selectedNode && (
                    <NodeViewPanel
                      selectedNode={selectedNode}
                      mapId={seed.map_id}
                      isNodeUnlocked
                      onProgressUpdate={refreshProgress}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
                  <p className="text-sm text-neutral-300">
                    {allNodesComplete
                      ? "All day nodes are submitted/completed."
                      : "Finish each node in this day before reflection."}
                  </p>
                  <Button
                    onClick={() => setPhase("reflection")}
                    disabled={!allNodesComplete}
                    className="bg-white text-black hover:bg-neutral-200"
                  >
                    Continue to reflection
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 text-neutral-300">
                <p>No action nodes are assigned for this day.</p>
                <Button onClick={() => setPhase("reflection")} className="bg-white text-black hover:bg-neutral-200">
                  Continue to reflection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "reflection" && (
        <ReflectionForm
          value={reflectionDraft}
          extraPrompts={Array.isArray(day.reflection_prompts) ? day.reflection_prompts : []}
          submitting={submitting}
          onChange={setReflectionDraft}
          onSubmit={() => setPhase(isFinalDay ? "end_reflection" : "decision")}
        />
      )}

      {phase === "decision" && (
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

      {phase === "exit" && (
        <ExitReflection
          submitting={submitting}
          onBack={() => setPhase("decision")}
          onSubmit={(payload) => submitDecision("quit", { exitReflection: payload })}
        />
      )}

      {phase === "end_reflection" && (
        <div className="space-y-4">
          <TrendSummary trend={[...(reflections || []), { day_number: day.day_number, energy_level: reflectionDraft.energyLevel, confusion_level: reflectionDraft.confusionLevel, interest_level: reflectionDraft.interestLevel }]} />
          <EndReflection submitting={submitting} onSubmit={submitFinalReflection} />
        </div>
      )}
    </div>
  );
}
