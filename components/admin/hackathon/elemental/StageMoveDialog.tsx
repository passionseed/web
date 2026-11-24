"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAGE_LABEL, stageMoveProblem, type PipelineStage } from "@/lib/hackathon/elemental/pipeline";

/**
 * Asked before a card moves somewhere that needs a plan: a next step and a
 * date for contacted, talking and yes; a one-line reason for no. Also asked
 * after "Touched today", for the next step.
 */
export type MoveRequest = {
  id: string;
  name: string;
  stage: PipelineStage;
  mode: "move" | "touch";
  next_step: string;
  next_step_due: string;
  /** Which arrow started the move, so focus can follow the card. */
  from?: "left" | "right";
};

export type MoveAnswer = { next_step: string; next_step_due: string; reason: string };

export function StageMoveDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: MoveRequest | null;
  onCancel: () => void;
  onConfirm: (req: MoveRequest, answer: MoveAnswer) => void;
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm"
        // The card has moved (or the list changed), so the board puts focus back itself.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {request && <MoveForm key={`${request.id}-${request.stage}-${request.mode}`} request={request} onCancel={onCancel} onConfirm={onConfirm} />}
      </DialogContent>
    </Dialog>
  );
}

function MoveForm({
  request,
  onCancel,
  onConfirm,
}: {
  request: MoveRequest;
  onCancel: () => void;
  onConfirm: (req: MoveRequest, answer: MoveAnswer) => void;
}) {
  const [nextStep, setNextStep] = useState(request.next_step);
  const [due, setDue] = useState(request.next_step_due);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isNo = request.mode === "move" && request.stage === "no";
  const touch = request.mode === "touch";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = touch
      ? !nextStep.trim() || !due
        ? "Add a next step and a date, or skip"
        : null
      : stageMoveProblem(request.stage, { next_step: nextStep, next_step_due: due, append_note: reason });
    if (problem) {
      setError(problem);
      return;
    }
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setError("Use a date like 2026-11-30");
      return;
    }
    onConfirm(request, { next_step: nextStep.trim(), next_step_due: due, reason: reason.trim() });
  };

  const title = touch ? `Touched ${request.name}` : `Move ${request.name} to ${STAGE_LABEL[request.stage]}`;
  const description = touch
    ? "Saved as touched today. What happens next, and by when?"
    : isNo
      ? "One line on why, so the next person knows. It is added to the notes."
      : "Every open conversation needs a next step and a date.";

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle className="text-base font-medium">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {isNo ? (
        <div className="space-y-1.5">
          <Label htmlFor="mv-reason" className="text-xs font-normal text-muted-foreground">
            Reason
          </Label>
          <Input
            id="mv-reason"
            autoFocus
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="No budget this year"
          />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_9.5rem] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mv-next" className="text-xs font-normal text-muted-foreground">
              Next step
            </Label>
            <Input id="mv-next" autoFocus value={nextStep} maxLength={500} onChange={(e) => setNextStep(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mv-due" className="text-xs font-normal text-muted-foreground">
              By
            </Label>
            <Input id="mv-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          {touch ? "Skip" : "Cancel"}
        </Button>
        <Button type="submit">{touch ? "Save next step" : `Move to ${STAGE_LABEL[request.stage]}`}</Button>
      </DialogFooter>
    </form>
  );
}
