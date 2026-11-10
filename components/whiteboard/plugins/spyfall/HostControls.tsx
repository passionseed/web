"use client";

import { useEffect, useState } from "react";

import type { GameAction, LivePhase } from "@/lib/whiteboard/games";

import { PrimaryButton, Section, SoftButton } from "./ui";

const CONFIRM_MS = 3000;

/** Ends the game on a second tap within a few seconds, so a stray tap does not close everyone's round. */
export function EndButton({ busy, act }: { busy: boolean; act: (action: GameAction) => Promise<boolean> }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <SoftButton
      disabled={busy}
      className={armed ? "border-orange-500 font-semibold text-orange-600" : ""}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        void act({ action: "phase", phase: "ended" });
      }}
    >
      {armed ? "แตะอีกครั้งเพื่อจบ" : "จบเกม · End"}
    </SoftButton>
  );
}

/** Host or board owner only: move the round along, deal a new one, or end the game. */
export function HostControls({
  phase,
  busy,
  act,
  onNewRound,
}: {
  phase: LivePhase;
  busy: boolean;
  act: (action: GameAction) => Promise<boolean>;
  onNewRound: () => void;
}) {
  return (
    <Section title="ควบคุมเกม · Host controls">
      <div className="grid grid-cols-2 gap-1.5">
        {phase === "playing" && (
          <PrimaryButton disabled={busy} onClick={() => void act({ action: "phase", phase: "voting" })}>
            เริ่มโหวต · Vote
          </PrimaryButton>
        )}
        {phase !== "revealed" && (
          <PrimaryButton disabled={busy} onClick={() => void act({ action: "phase", phase: "revealed" })}>
            เปิดเฉลย · Reveal
          </PrimaryButton>
        )}
        <SoftButton disabled={busy} onClick={onNewRound}>
          รอบใหม่ · New round
        </SoftButton>
        <EndButton busy={busy} act={act} />
      </div>
    </Section>
  );
}
