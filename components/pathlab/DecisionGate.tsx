"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type PathDecision = "continue_now" | "continue_tomorrow" | "pause" | "quit";

interface DecisionGateProps {
  submitting?: boolean;
  onChoose: (decision: PathDecision) => void;
}

const OPTIONS: Array<{
  decision: PathDecision;
  title: string;
  description: string;
}> = [
  {
    decision: "continue_now",
    title: "Next day",
    description: "Keep momentum and start the next day immediately.",
  },
  {
    decision: "continue_tomorrow",
    title: "Continue tomorrow",
    description: "Save progress and come back when you have energy again.",
  },
  {
    decision: "pause",
    title: "Explore something else first",
    description: "Pause this path and return to the PathLab gallery.",
  },
  {
    decision: "quit",
    title: "This isn’t for me",
    description: "Exit this path with a short reflection.",
  },
];

export function DecisionGate({ submitting = false, onChoose }: DecisionGateProps) {
  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-2xl text-white">What’s next?</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.decision}
            variant="outline"
            disabled={submitting}
            onClick={() => onChoose(option.decision)}
            className="h-auto items-start justify-start border-neutral-700 bg-neutral-950/70 p-4 text-left text-white hover:bg-neutral-800"
          >
            <div>
              <p className="text-sm font-semibold">{option.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{option.description}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
