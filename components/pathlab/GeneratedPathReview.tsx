"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ValidationIssue = {
  code: string;
  level: "error" | "warning";
  message: string;
  field?: string;
};

type ValidationResponse = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    dayCount: number;
    nodeCount: number;
    edgeCount: number;
    errorCount: number;
    warningCount: number;
  };
};

interface GeneratedPathReviewProps {
  seedId: string;
  nodes: Array<{
    id: string;
    title: string;
  }>;
}

export function GeneratedPathReview({ seedId, nodes }: GeneratedPathReviewProps) {
  const router = useRouter();
  const [dayNumber, setDayNumber] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || "");
  const [validating, setValidating] = useState(false);
  const [regeneratingScope, setRegeneratingScope] = useState<"all" | "day" | "node" | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors from Radix UI auto-generated IDs
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedNodeId && nodes[0]?.id) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const runValidation = useCallback(async () => {
    setValidating(true);
    try {
      const response = await fetch("/api/pathlab/generate/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to validate draft");
      }

      setValidation(payload as ValidationResponse);
    } catch (error: any) {
      toast.error(error?.message || "Failed to validate draft");
    } finally {
      setValidating(false);
    }
  }, [seedId]);

  useEffect(() => {
    void runValidation();
  }, [runValidation]);

  const statusLabel = useMemo(() => {
    if (!validation) return "Validation pending";
    if (validation.valid) return "Ready to publish";
    return "Blocked until fixed";
  }, [validation]);

  const regenerate = async (scope: "all" | "day" | "node") => {
    if (scope === "node" && !selectedNodeId) {
      toast.error("Choose a node to regenerate");
      return;
    }

    setRegeneratingScope(scope);
    try {
      const response = await fetch("/api/pathlab/generate/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedId,
          scope,
          dayNumber: scope === "day" ? dayNumber : undefined,
          nodeId: scope === "node" ? selectedNodeId : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to regenerate draft section");
      }

      const warningCount = Array.isArray(payload.warnings) ? payload.warnings.length : 0;
      toast.success(
        warningCount > 0
          ? `Regenerated with ${warningCount} warning${warningCount === 1 ? "" : "s"}`
          : "Regeneration complete",
      );

      await runValidation();
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to regenerate draft section");
    } finally {
      setRegeneratingScope(null);
    }
  };

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          {validation?.valid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          )}
          AI Draft Review
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
          <div>
            <p className="text-sm font-medium text-white">Publish Gate</p>
            <p className="text-xs text-neutral-400">{statusLabel}</p>
          </div>
          <Button
            variant="outline"
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            onClick={runValidation}
            disabled={validating}
          >
            {validating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Re-validate
          </Button>
        </div>

        {validation && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
              <p className="text-neutral-500">Days</p>
              <p className="text-white font-semibold">{validation.summary.dayCount}</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
              <p className="text-neutral-500">Nodes</p>
              <p className="text-white font-semibold">{validation.summary.nodeCount}</p>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-950 p-2">
              <p className="text-neutral-500">Edges</p>
              <p className="text-white font-semibold">{validation.summary.edgeCount}</p>
            </div>
            <div className="rounded border border-red-900/60 bg-red-950/20 p-2">
              <p className="text-red-300">Errors</p>
              <p className="text-red-200 font-semibold">{validation.summary.errorCount}</p>
            </div>
            <div className="rounded border border-amber-900/60 bg-amber-950/20 p-2">
              <p className="text-amber-300">Warnings</p>
              <p className="text-amber-200 font-semibold">{validation.summary.warningCount}</p>
            </div>
          </div>
        )}

        {(validation?.errors?.length || validation?.warnings?.length) ? (
          <div className="space-y-2">
            {validation.errors.map((issue, index) => (
              <div
                key={`error-${index}`}
                className="rounded border border-red-900/70 bg-red-950/20 p-2 text-xs text-red-200"
              >
                <p className="font-medium">{issue.code}</p>
                <p>{issue.message}</p>
              </div>
            ))}
            {validation.warnings.map((issue, index) => (
              <div
                key={`warning-${index}`}
                className="rounded border border-amber-900/70 bg-amber-950/20 p-2 text-xs text-amber-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  <p className="font-medium">{issue.code}</p>
                </div>
                <p>{issue.message}</p>
              </div>
            ))}
          </div>
        ) : (
          validation?.valid && (
            <p className="text-xs text-emerald-300 rounded border border-emerald-900/60 bg-emerald-950/20 p-2">
              Structural validation passed with no warnings.
            </p>
          )
        )}

        <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
          <p className="text-sm font-medium text-white">Regenerate</p>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              onClick={() => regenerate("all")}
              disabled={regeneratingScope !== null}
              className="bg-white text-black hover:bg-neutral-200"
            >
              {regeneratingScope === "all" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Whole Path
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <Label htmlFor="regen-day" className="text-neutral-300 text-xs">Day number</Label>
              <Input
                id="regen-day"
                type="number"
                min={1}
                value={dayNumber}
                onChange={(event) => setDayNumber(Math.max(1, Number(event.target.value) || 1))}
                className="bg-neutral-900 border-neutral-700"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => regenerate("day")}
              disabled={regeneratingScope !== null}
            >
              {regeneratingScope === "day" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Regenerate Day
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-neutral-300 text-xs">Node</Label>
              {!isMounted ? (
                <div className="h-10 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-400">
                  Loading...
                </div>
              ) : (
              <Select value={selectedNodeId} onValueChange={setSelectedNodeId}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700">
                  <SelectValue placeholder="Select node" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              onClick={() => regenerate("node")}
              disabled={regeneratingScope !== null || !selectedNodeId}
            >
              {regeneratingScope === "node" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Regenerate Node
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
