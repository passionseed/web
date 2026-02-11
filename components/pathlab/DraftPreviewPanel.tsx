"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar, FileText, CheckCircle2, Link2 } from "lucide-react";
import type { PathLabGeneratorDraftInput } from "@/lib/ai/pathlab-generator-schema";

interface DraftPreviewPanelProps {
  draft: PathLabGeneratorDraftInput;
  className?: string;
}

export function DraftPreviewPanel({ draft, className }: DraftPreviewPanelProps) {
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({});

  const toggleDay = (dayNumber: number) => {
    setOpenDays((prev) => ({ ...prev, [dayNumber]: !prev[dayNumber] }));
  };

  const getNodeById = (key: string) => {
    return draft.nodes.find((node) => node.key === key);
  };

  const assessmentCount = draft.nodes.filter((n) => n.assessment.type !== "none").length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Draft Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {/* Seed Info */}
            <div className="space-y-2 rounded-lg border p-4">
              <h4 className="font-semibold">{draft.seed.title}</h4>
              <p className="text-sm text-muted-foreground">{draft.seed.slogan}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {draft.seed.description}
              </p>
              <Badge variant="outline">{draft.seed.category_name}</Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{draft.days.length}</div>
                <div className="text-xs text-muted-foreground">Days</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{draft.nodes.length}</div>
                <div className="text-xs text-muted-foreground">Nodes</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{draft.edges.length}</div>
                <div className="text-xs text-muted-foreground">Connections</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{assessmentCount}</div>
                <div className="text-xs text-muted-foreground">Assessments</div>
              </div>
            </div>

            {/* Days */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Day-by-Day Breakdown</h4>
              {draft.days
                .sort((a, b) => a.day_number - b.day_number)
                .map((day) => (
                  <Collapsible
                    key={day.day_number}
                    open={openDays[day.day_number]}
                    onOpenChange={() => toggleDay(day.day_number)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-accent">
                      <div className="flex items-center gap-2">
                        {openDays[day.day_number] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Day {day.day_number}
                          {day.title && `: ${day.title}`}
                        </span>
                      </div>
                      <Badge variant="secondary">{day.node_keys.length} nodes</Badge>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-2 space-y-2 pl-6">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {day.context_text}
                      </p>

                      {/* Nodes in this day */}
                      <div className="space-y-1">
                        {day.node_keys.map((nodeKey) => {
                          const node = getNodeById(nodeKey);
                          if (!node) return null;

                          return (
                            <div
                              key={nodeKey}
                              className="flex items-start gap-2 rounded border bg-background p-2 text-sm"
                            >
                              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium">{node.title}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {node.difficulty}
                                  </Badge>
                                  {node.assessment.type !== "none" && (
                                    <Badge variant="outline" className="text-xs">
                                      <CheckCircle2 className="mr-1 h-3 w-3" />
                                      {node.assessment.type}
                                    </Badge>
                                  )}
                                  {node.content.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {node.content.length} content{" "}
                                      {node.content.length === 1 ? "item" : "items"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reflection prompts */}
                      {day.reflection_prompts.length > 0 && (
                        <div className="mt-2 rounded border bg-muted/50 p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Reflection Prompts:
                          </div>
                          <ul className="space-y-1 text-xs">
                            {day.reflection_prompts.map((prompt, i) => (
                              <li key={i} className="text-muted-foreground">
                                • {prompt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </div>

            {/* Edges/Prerequisites */}
            {draft.edges.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Node Prerequisites ({draft.edges.length})
                </h4>
                <div className="rounded-lg border p-3 space-y-1">
                  {draft.edges.slice(0, 10).map((edge, i) => {
                    const source = getNodeById(edge.source_key);
                    const dest = getNodeById(edge.destination_key);
                    return (
                      <div key={i} className="text-xs text-muted-foreground">
                        "{source?.title || edge.source_key}" → "
                        {dest?.title || edge.destination_key}"
                      </div>
                    );
                  })}
                  {draft.edges.length > 10 && (
                    <div className="text-xs text-muted-foreground italic">
                      ...and {draft.edges.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
