"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markdownToSafeHtml } from "@/lib/security/sanitize-html";

interface ContextPhaseProps {
  dayNumber: number;
  dayTitle?: string | null;
  contextText: string;
  onContinue: () => void;
  onSkip: () => void;
  skipLabel?: string;
}

function ContextHtml({ markdown }: { markdown: string }) {
  const html = useMemo(() => markdownToSafeHtml(markdown), [markdown]);
  return (
    <div
      className="prose prose-invert max-w-none leading-relaxed"
      // Content is sanitized through markdownToSafeHtml which strips
      // unsafe tags/attributes via lib/security/sanitize-html.ts
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ContextPhase({
  dayNumber,
  dayTitle,
  contextText,
  onContinue,
  onSkip,
  skipLabel = "Skip to Reflection",
}: ContextPhaseProps) {
  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          Day {dayNumber}
        </p>
        <CardTitle className="text-2xl text-white">
          {dayTitle || "Why today matters"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ContextHtml markdown={contextText} />
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-neutral-400 hover:text-white"
          >
            {skipLabel}
          </Button>
          <Button
            onClick={onContinue}
            className="bg-white text-black hover:bg-neutral-200"
          >
            Start Action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
