"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type BuilderDay = {
  id?: string;
  day_number: number;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];
};

interface PathDayBuilderProps {
  pathId: string;
  totalDays: number;
  initialDays: BuilderDay[];
  mapNodes: Array<{ id: string; title: string }>;
}

function normalizeDays(days: BuilderDay[], totalDays: number): BuilderDay[] {
  const byDay = new Map(days.map((day) => [day.day_number, day]));
  const out: BuilderDay[] = [];

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    const existing = byDay.get(dayNumber);
    out.push(
      existing || {
        day_number: dayNumber,
        context_text: `Why day ${dayNumber} matters`,
        reflection_prompts: [],
        node_ids: [],
      },
    );
  }

  return out;
}

export function PathDayBuilder({
  pathId,
  totalDays,
  initialDays,
  mapNodes,
}: PathDayBuilderProps) {
  const initialDayCount = Math.max(1, totalDays, initialDays.length);
  const [dayCount, setDayCount] = useState(initialDayCount);
  const [days, setDays] = useState<BuilderDay[]>(
    normalizeDays(initialDays, initialDayCount),
  );
  const [saving, setSaving] = useState(false);

  const orderedDays = useMemo(
    () => normalizeDays(days, dayCount),
    [days, dayCount],
  );

  const updateDay = (dayNumber: number, patch: Partial<BuilderDay>) => {
    setDays((prev) => {
      const existing = prev.find((day) => day.day_number === dayNumber);
      if (!existing) {
        return [
          ...prev,
          {
            day_number: dayNumber,
            context_text: patch.context_text || `Why day ${dayNumber} matters`,
            reflection_prompts: patch.reflection_prompts || [],
            node_ids: patch.node_ids || [],
          },
        ];
      }

      return prev.map((day) =>
        day.day_number === dayNumber ? { ...day, ...patch } : day,
      );
    });
  };

  const toggleNodeForDay = (dayNumber: number, nodeId: string) => {
    const day = orderedDays.find((item) => item.day_number === dayNumber);
    const current = day?.node_ids || [];
    const next = current.includes(nodeId)
      ? current.filter((id) => id !== nodeId)
      : [...current, nodeId];
    updateDay(dayNumber, { node_ids: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pathlab/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathId,
          totalDays: dayCount,
          days: orderedDays.map((day) => ({
            day_number: day.day_number,
            context_text: day.context_text,
            reflection_prompts: day.reflection_prompts,
            node_ids: day.node_ids,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save path days");
      }

      toast.success("Path days saved");
      setDays(normalizeDays(payload.days || orderedDays, dayCount));
    } catch (error: any) {
      toast.error(error?.message || "Failed to save path days");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-white">Path Timeline</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="path-day-count" className="text-neutral-300">
              Total days
            </Label>
            <Input
              id="path-day-count"
              type="number"
              min={1}
              value={dayCount}
              onChange={(event) =>
                setDayCount(Math.max(1, Number(event.target.value) || 1))
              }
              className="w-24 border-neutral-700 bg-neutral-950 text-white"
            />
          </div>
        </CardHeader>
      </Card>

      {orderedDays.map((day) => (
        <Card
          key={day.day_number}
          className="border-neutral-800 bg-neutral-900/80"
        >
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Day {day.day_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Context text</Label>
              <Textarea
                value={day.context_text}
                onChange={(event) =>
                  updateDay(day.day_number, {
                    context_text: event.target.value,
                  })
                }
                className="min-h-20 border-neutral-700 bg-neutral-950 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">
                Custom reflection prompts (one per line)
              </Label>
              <Textarea
                value={day.reflection_prompts.join("\n")}
                onChange={(event) =>
                  updateDay(day.day_number, {
                    reflection_prompts: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                className="min-h-20 border-neutral-700 bg-neutral-950 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Nodes for this day</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {mapNodes.map((node) => {
                  const checked = day.node_ids.includes(node.id);
                  return (
                    <label
                      key={node.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-800 p-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleNodeForDay(day.day_number, node.id)
                        }
                      />
                      <span className="text-sm text-neutral-200">
                        {node.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-black hover:bg-neutral-200"
        >
          {saving ? "Saving..." : "Save Path"}
        </Button>
      </div>
    </div>
  );
}
