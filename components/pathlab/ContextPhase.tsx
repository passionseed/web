"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContextPhaseProps {
  dayNumber: number;
  contextText: string;
  onContinue: () => void;
}

export function ContextPhase({ dayNumber, contextText, onContinue }: ContextPhaseProps) {
  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Day {dayNumber}</p>
        <CardTitle className="text-2xl text-white">Why today matters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{contextText}</p>
        <div className="flex justify-end">
          <Button onClick={onContinue} className="bg-white text-black hover:bg-neutral-200">
            Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
