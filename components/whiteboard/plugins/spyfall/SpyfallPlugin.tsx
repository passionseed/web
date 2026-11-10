"use client";

import { useCallback, useEffect, useState } from "react";

import type { GameStart } from "@/lib/whiteboard/games";

import type { BoardPluginProps } from "../types";
import { RevealPanel } from "./RevealPanel";
import { RoundPanel } from "./RoundPanel";
import { DEFAULT_DRAFT, MIN_PLAYERS, loadDraft, saveDraft, type SetupDraft } from "./setup";
import { SetupPanel } from "./SetupPanel";
import { useSpyfall } from "./useSpyfall";

/**
 * Spyfall as a board window: a group icebreaker everyone plays together on
 * the board. The server deals; each person only ever sees their own card.
 */
export function SpyfallPlugin({ board, me, players, onBroadcast }: BoardPluginProps) {
  const { view, busy, start, act } = useSpyfall(board.id, onBroadcast);
  const [draft, setDraft] = useState<SetupDraft>(DEFAULT_DRAFT);
  // The setup menu opened over a live or finished round ("New round", "Play again").
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => setDraft(loadDraft(board.id)), [board.id]);

  const updateDraft = useCallback(
    (next: SetupDraft) => {
      setDraft(next);
      saveDraft(board.id, next);
    },
    [board.id],
  );

  const round = view?.round ?? null;
  const canHost = Boolean(round && (round.hostId === me.id || board.role === "owner"));

  // Start from the last game: same deck and settings, and the same people if enough of them are still here.
  const openSetupFromRound = useCallback(() => {
    if (round) {
      const last = new Set(round.players.map((p) => p.userId));
      const staying = players.filter((p) => last.has(p.userId));
      const excluded = staying.length >= MIN_PLAYERS ? players.filter((p) => !last.has(p.userId)).map((p) => p.userId) : [];
      updateDraft({ ...draft, excluded });
    }
    setSetupOpen(true);
  }, [round, players, draft, updateDraft]);

  const deal = useCallback(
    async (body: GameStart) => {
      if (await start(body)) setSetupOpen(false);
    },
    [start],
  );

  if (!view) return <p className="wb-soft p-4 text-sm">กำลังโหลด...</p>;

  if (!round || setupOpen) {
    return (
      <SetupPanel
        players={players}
        draft={draft}
        onDraft={updateDraft}
        busy={busy}
        onDeal={deal}
        onCancel={round ? () => setSetupOpen(false) : undefined}
      />
    );
  }

  if (round.phase === "revealed") {
    return <RevealPanel round={round} canHost={canHost} busy={busy} act={act} onPlayAgain={openSetupFromRound} />;
  }

  return (
    <RoundPanel
      key={round.id}
      round={round}
      card={view.me}
      meId={me.id}
      canHost={canHost}
      busy={busy}
      act={act}
      onNewRound={openSetupFromRound}
    />
  );
}
