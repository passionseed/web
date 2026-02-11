"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { markdownToSafeHtml } from "@/lib/security/sanitize-html";
import { toast } from "sonner";

type BuilderDay = {
  id?: string;
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];
};

type MapNodeInfo = { id: string; title: string; node_type: string | null };

interface PathDayBuilderProps {
  pathId: string;
  totalDays: number;
  initialDays: BuilderDay[];
  mapNodes: MapNodeInfo[];
  mapId: string;
}

function makeDefaultDay(dayNumber: number): BuilderDay {
  return {
    day_number: dayNumber,
    title: null,
    context_text: "",
    reflection_prompts: [],
    node_ids: [],
  };
}

function renumberDays(days: BuilderDay[]): BuilderDay[] {
  return days.map((day, idx) => ({ ...day, day_number: idx + 1 }));
}

/** Stable sort key for DnD - day_number changes on reorder so we use index */
function dayDndId(day: BuilderDay, idx: number): string {
  return day.id ?? `new-${idx}`;
}

// ─── Sortable Day Item ──────────────────────────────────────────────

function SortableDayTrigger({
  dndId,
  day,
  nodeCount,
  onRemove,
  canRemove,
}: {
  dndId: string;
  day: BuilderDay;
  nodeCount: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const label = day.title
    ? `Day ${day.day_number}: ${day.title}`
    : `Day ${day.day_number}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-neutral-500 hover:text-neutral-300 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <AccordionTrigger className="flex-1 py-3 text-white hover:no-underline">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{label}</span>
          {nodeCount > 0 ? (
            <Badge
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {nodeCount} node{nodeCount !== 1 ? "s" : ""} assigned
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-700/50 text-amber-500/70"
            >
              No nodes yet
            </Badge>
          )}
        </span>
      </AccordionTrigger>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={!canRemove}
        className={cn(
          "p-1 rounded transition-colors",
          canRemove
            ? "text-neutral-500 hover:text-red-400 hover:bg-red-950/30"
            : "text-neutral-800 cursor-not-allowed",
        )}
        title="Remove day"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Node Checkbox ──────────────────────────────────────────────────

function NodeCheckbox({
  node,
  checked,
  otherDayNumbers,
  onToggle,
}: {
  node: MapNodeInfo;
  checked: boolean;
  otherDayNumbers: number[];
  onToggle: () => void;
}) {
  const assignedElsewhere = otherDayNumbers.length > 0;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-all",
        checked
          ? "border-blue-500 bg-blue-950/40 shadow-sm ring-1 ring-blue-500/20"
          : assignedElsewhere
            ? "border-neutral-800 opacity-60 hover:opacity-80"
            : "border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
      />
      <span className="flex flex-1 items-center gap-2 text-sm text-neutral-200">
        <span className={cn(checked && "font-medium text-white")}>
          {node.title}
        </span>
        {node.node_type && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] border-neutral-700",
              checked ? "text-blue-300 border-blue-700" : "text-neutral-400"
            )}
          >
            {node.node_type}
          </Badge>
        )}
      </span>
      {assignedElsewhere && (
        <Badge variant="secondary" className="text-[10px] bg-neutral-800 text-neutral-400">
          Also in Day {otherDayNumbers.join(", ")}
        </Badge>
      )}
    </label>
  );
}

// ─── Markdown Preview ───────────────────────────────────────────────

function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = useMemo(() => markdownToSafeHtml(markdown), [markdown]);
  return (
    <div
      className="prose prose-invert prose-sm max-w-none rounded-md border border-neutral-700 bg-neutral-950 p-3"
      // Content is sanitized through markdownToSafeHtml which strips
      // unsafe tags/attributes via lib/security/sanitize-html.ts
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function PathDayBuilder({
  pathId,
  initialDays,
  mapNodes,
  mapId,
}: PathDayBuilderProps) {
  const ensuredInitial = useMemo(
    () =>
      initialDays.length > 0
        ? initialDays.map((d) => ({ ...d, title: d.title ?? null }))
        : [makeDefaultDay(1)],
    [initialDays],
  );

  const [days, setDays] = useState<BuilderDay[]>(ensuredInitial);
  const [saving, setSaving] = useState(false);
  const [previewDayNumbers, setPreviewDayNumbers] = useState<Set<number>>(
    new Set(),
  );

  // Dirty tracking
  const snapshotRef = useRef(JSON.stringify(ensuredInitial));
  const isDirty = JSON.stringify(days) !== snapshotRef.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Node assignment map: nodeId -> array of day_numbers that include it
  const nodeAssignmentMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const day of days) {
      for (const nodeId of day.node_ids) {
        const existing = map.get(nodeId) || [];
        existing.push(day.day_number);
        map.set(nodeId, existing);
      }
    }
    return map;
  }, [days]);

  // DnD IDs - must be stable per day item
  const dndIds = useMemo(
    () => days.map((d, i) => dayDndId(d, i)),
    [days],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ─── Mutations ──────────────────────────────────────────────────

  const updateDay = useCallback(
    (dayNumber: number, patch: Partial<BuilderDay>) => {
      setDays((prev) =>
        prev.map((d) => (d.day_number === dayNumber ? { ...d, ...patch } : d)),
      );
    },
    [],
  );

  const toggleNodeForDay = useCallback(
    (dayNumber: number, nodeId: string) => {
      setDays((prev) =>
        prev.map((d) => {
          if (d.day_number !== dayNumber) return d;
          const current = d.node_ids;
          const next = current.includes(nodeId)
            ? current.filter((id) => id !== nodeId)
            : [...current, nodeId];
          return { ...d, node_ids: next };
        }),
      );
    },
    [],
  );

  const addDay = useCallback(() => {
    setDays((prev) => {
      const next = [...prev, makeDefaultDay(prev.length + 1)];
      return renumberDays(next);
    });
  }, []);

  const removeDay = useCallback((dayNumber: number) => {
    setDays((prev) => {
      if (prev.length <= 1) return prev;
      return renumberDays(prev.filter((d) => d.day_number !== dayNumber));
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays((prev) => {
      const oldIndex = prev.findIndex(
        (_, i) => dayDndId(prev[i], i) === active.id,
      );
      const newIndex = prev.findIndex(
        (_, i) => dayDndId(prev[i], i) === over.id,
      );
      if (oldIndex === -1 || newIndex === -1) return prev;
      return renumberDays(arrayMove(prev, oldIndex, newIndex));
    });
  }, []);

  const togglePreview = useCallback((dayNumber: number) => {
    setPreviewDayNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  }, []);

  // ─── Save ───────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pathlab/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathId,
          totalDays: days.length,
          days: days.map((day) => ({
            day_number: day.day_number,
            title: day.title,
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

      const savedDays: BuilderDay[] = (payload.days || days).map(
        (d: any) => ({
          id: d.id,
          day_number: d.day_number,
          title: d.title ?? null,
          context_text: d.context_text,
          reflection_prompts: d.reflection_prompts ?? [],
          node_ids: d.node_ids ?? [],
        }),
      );

      setDays(savedDays);
      snapshotRef.current = JSON.stringify(savedDays);
      toast.success("Path days saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save path days");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const allDndIds = dndIds;
  const defaultOpenValues = days.map((_, i) => allDndIds[i]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardContent className="flex flex-row items-center justify-between gap-4 p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Path Timeline</h3>
            <p className="text-sm text-neutral-400">
              {days.length} day{days.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                "transition-colors",
                isDirty
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-neutral-800 text-neutral-400",
              )}
            >
              {saving ? "Saving..." : isDirty ? "Save Path *" : "Saved"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {mapNodes.length > 0 && (
        <Card className="border-blue-800/50 bg-blue-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 space-y-1">
              <p className="font-semibold">How to link nodes to days:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-300/90">
                <li>Expand a day by clicking on it</li>
                <li>Scroll to "Nodes for this day" section</li>
                <li>Check the boxes next to nodes you want to include</li>
                <li>Nodes can be assigned to multiple days if needed</li>
                <li>Click "Save Path" when done</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for no map nodes */}
      {mapNodes.length === 0 && (
        <Card className="border-amber-800/50 bg-amber-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm text-amber-200">
                No map nodes found. Add nodes to the learning map first.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-700 text-amber-200 hover:bg-amber-950/50"
              onClick={() =>
                window.open(`/map/${mapId}/edit`, "_blank")
              }
            >
              Edit Map
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Day Cards with DnD + Accordion */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={allDndIds}
          strategy={verticalListSortingStrategy}
        >
          <Accordion
            type="multiple"
            defaultValue={defaultOpenValues}
            className="space-y-2"
          >
            {days.map((day, idx) => {
              const dndId = allDndIds[idx];
              const isPreviewing = previewDayNumbers.has(day.day_number);

              return (
                <AccordionItem
                  key={dndId}
                  value={dndId}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3"
                >
                  <SortableDayTrigger
                    dndId={dndId}
                    day={day}
                    nodeCount={day.node_ids.length}
                    onRemove={() => removeDay(day.day_number)}
                    canRemove={days.length > 1}
                  />

                  <AccordionContent className="space-y-4 pt-2">
                    {/* Title */}
                    <div className="space-y-1">
                      <Label className="text-neutral-300">Day title</Label>
                      <Input
                        value={day.title ?? ""}
                        onChange={(e) =>
                          updateDay(day.day_number, {
                            title: e.target.value || null,
                          })
                        }
                        placeholder={`Day ${day.day_number}`}
                        className="border-neutral-700 bg-neutral-950 text-white"
                      />
                    </div>

                    {/* Context text + preview toggle */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-neutral-300">
                          Context text (markdown)
                        </Label>
                        <button
                          type="button"
                          onClick={() => togglePreview(day.day_number)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
                        >
                          {isPreviewing ? (
                            <>
                              <EyeOff className="h-3 w-3" /> Edit
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" /> Preview
                            </>
                          )}
                        </button>
                      </div>

                      {isPreviewing ? (
                        <MarkdownPreview markdown={day.context_text} />
                      ) : (
                        <Textarea
                          value={day.context_text}
                          onChange={(e) =>
                            updateDay(day.day_number, {
                              context_text: e.target.value,
                            })
                          }
                          className="min-h-24 border-neutral-700 bg-neutral-950 text-white"
                        />
                      )}
                    </div>

                    {/* Reflection prompts */}
                    <div className="space-y-1">
                      <Label className="text-neutral-300">
                        Reflection prompts (one per line)
                      </Label>
                      <Textarea
                        value={day.reflection_prompts.join("\n")}
                        onChange={(e) =>
                          updateDay(day.day_number, {
                            reflection_prompts: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="min-h-16 border-neutral-700 bg-neutral-950 text-white"
                      />
                    </div>

                    {/* Node assignment */}
                    {mapNodes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-neutral-300 text-base font-semibold">
                            Nodes for this day
                          </Label>
                          <span className="text-xs text-neutral-500">
                            {day.node_ids.length} selected
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 -mt-1">
                          Check the nodes you want students to complete on Day {day.day_number}
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {mapNodes.map((node) => {
                            const checked = day.node_ids.includes(node.id);
                            const allDayNums =
                              nodeAssignmentMap.get(node.id) || [];
                            const otherDayNumbers = allDayNums.filter(
                              (n) => n !== day.day_number,
                            );

                            return (
                              <NodeCheckbox
                                key={node.id}
                                node={node}
                                checked={checked}
                                otherDayNumbers={otherDayNumbers}
                                onToggle={() =>
                                  toggleNodeForDay(day.day_number, node.id)
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Add Day + Save */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={addDay}
          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Day
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={cn(
            "transition-colors",
            isDirty
              ? "bg-white text-black hover:bg-neutral-200"
              : "bg-neutral-800 text-neutral-400",
          )}
        >
          {saving ? "Saving..." : isDirty ? "Save Path *" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
