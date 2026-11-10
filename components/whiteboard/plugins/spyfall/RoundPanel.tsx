"use client";

import { Check, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { formatClock, secondsLeft } from "@/lib/whiteboard/core";
import type { GameAction, GameView } from "@/lib/whiteboard/games";

import { CardView } from "./CardView";
import { HostControls } from "./HostControls";
import { pickBySeed } from "./setup";
import { Avatar, PrimaryButton, Section, SoftButton } from "./ui";

type Round = NonNullable<GameView["round"]>;
type Act = (action: GameAction) => Promise<boolean>;

function useSecondsLeft(endsAt: string | null) {
  const [left, setLeft] = useState(() => secondsLeft(endsAt));
  useEffect(() => {
    setLeft(secondsLeft(endsAt));
    if (!endsAt) return;
    const timer = window.setInterval(() => setLeft(secondsLeft(endsAt)), 500);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return left;
}

function RoundStatus({ round }: { round: Round }) {
  const left = useSecondsLeft(round.roundEndsAt);
  const starter = pickBySeed(round.id, round.players);
  return (
    <div className="space-y-1 rounded-xl bg-orange-500/10 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 font-semibold">
          {round.phase === "voting" ? "ช่วงโหวต · Voting" : "กำลังเล่น · Playing"}
        </span>
        {round.roundEndsAt && (
          <span className={`inline-flex items-center gap-1 font-mono text-base font-bold ${left === 0 ? "text-orange-600" : ""}`}>
            <Timer className="h-4 w-4" /> {formatClock(left)}
          </span>
        )}
      </div>
      {round.roundEndsAt && left === 0 && <p className="text-xs font-medium text-orange-600">หมดเวลา โหวตได้เลย · Time&apos;s up, vote now</p>}
      {starter && (
        <p className="text-xs">
          ใครเริ่มถาม · First to ask: <b>{starter.name}</b>
        </p>
      )}
      <p className="text-[11px] opacity-60">
        โฮสต์ {round.hostName} · สายลับ {round.spyCount} คน
      </p>
    </div>
  );
}

function PlayerList({ round, meId }: { round: Round; meId: string }) {
  const votedCount = round.players.filter((p) => p.voted).length;
  return (
    <Section title={`ผู้เล่น · Players (โหวตแล้ว ${votedCount}/${round.players.length})`}>
      <ul className="space-y-0.5">
        {round.players.map((p) => (
          <li key={p.userId} className="flex min-h-9 items-center gap-2 text-sm">
            <span className="w-5 text-right text-xs opacity-50">{p.seat + 1}</span>
            <Avatar name={p.name} url={p.avatarUrl} />
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.userId === meId && <span className="opacity-50"> (คุณ)</span>}
            </span>
            {p.voted && (
              <span className="inline-flex items-center gap-0.5 text-xs text-orange-600">
                <Check className="h-3.5 w-3.5" /> โหวตแล้ว
              </span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Every possible place, with a tap to cross one out. Only on this screen. */
function LocationReference({ names }: { names: string[] }) {
  const [crossed, setCrossed] = useState<Set<string>>(() => new Set());
  const toggle = (name: string) =>
    setCrossed((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  return (
    <Section title={`สถานที่ที่เป็นไปได้ · Possible locations (${names.length})`}>
      <p className="text-[11px] opacity-60">แตะเพื่อขีดฆ่าที่ที่คิดว่าไม่ใช่ เห็นแค่บนจอคุณ</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => {
          const off = crossed.has(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={off}
              onClick={() => toggle(name)}
              className={`min-h-11 rounded-xl border border-[color:var(--wb-hairline)] px-2.5 text-xs ${off ? "line-through opacity-40" : ""}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function VotePicker({
  round,
  meId,
  myVote,
  busy,
  act,
}: {
  round: Round;
  meId: string;
  /** My vote as the server has it, so it survives a reload. */
  myVote: string | null;
  busy: boolean;
  act: Act;
}) {
  const others = round.players.filter((p) => p.userId !== meId);
  return (
    <Section title="โหวตว่าใครคือสายลับ · Vote for the spy">
      <p className="text-[11px] opacity-60">เปลี่ยนใจได้จนกว่าจะเปิดเฉลย</p>
      <div className="grid grid-cols-2 gap-1.5">
        {others.map((p) => {
          const on = myVote === p.userId;
          return (
            <button
              key={p.userId}
              type="button"
              disabled={busy}
              aria-pressed={on}
              onClick={() => void act({ action: "vote", targetId: p.userId })}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-2 text-left text-sm disabled:opacity-50 ${
                on ? "border-orange-500 bg-orange-500/15 font-semibold" : "border-[color:var(--wb-hairline)]"
              }`}
            >
              <Avatar name={p.name} url={p.avatarUrl} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * Spy only: one guess for the whole round, and it ends the round at once.
 * The button only shows while the spy's card is face up, so the spy's screen
 * looks like everyone else's to anyone watching it.
 */
function SpyGuess({ names, cardShown, busy, act }: { names: string[]; cardShown: boolean; busy: boolean; act: Act }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  if (!open) {
    if (!cardShown) return null;
    return (
      <SoftButton className="w-full border-orange-500" onClick={() => setOpen(true)}>
        ทายสถานที่ · Guess the location
      </SoftButton>
    );
  }
  return (
    <Section title="ทายสถานที่ · Guess the location">
      <p className="text-[11px] opacity-60">ทายได้ครั้งเดียว และเฉลยทันทีที่ทาย</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={pick === name}
            onClick={() => setPick(name)}
            className={`min-h-11 rounded-xl border px-2.5 text-xs ${
              pick === name ? "border-orange-500 bg-orange-500/15 font-semibold" : "border-[color:var(--wb-hairline)]"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <SoftButton onClick={() => setOpen(false)}>ยกเลิก</SoftButton>
        <PrimaryButton className="flex-1" disabled={!pick || busy} onClick={() => pick && void act({ action: "guess", location: pick })}>
          ยืนยันคำตอบ · Confirm guess
        </PrimaryButton>
      </div>
    </Section>
  );
}

/** A live round: my card, the clock, who asks first, the players, the deck, voting and the host's buttons. */
export function RoundPanel({
  round,
  card,
  meId,
  canHost,
  busy,
  act,
  onNewRound,
}: {
  round: Round;
  card: GameView["me"];
  meId: string;
  canHost: boolean;
  busy: boolean;
  act: Act;
  onNewRound: () => void;
}) {
  const [cardShown, setCardShown] = useState(false);
  return (
    <div className="space-y-4 p-3">
      {card ? (
        <CardView card={card} onShownChange={setCardShown} />
      ) : (
        <p className="rounded-xl border border-[color:var(--wb-hairline)] p-3 text-center text-sm opacity-70">
          รอบนี้คุณดูอยู่ ไม่ได้เล่น · You are watching this round
        </p>
      )}
      <RoundStatus round={round} />
      {card?.spy && <SpyGuess names={round.locationNames} cardShown={cardShown} busy={busy} act={act} />}
      {card && <VotePicker round={round} meId={meId} myVote={card.voteFor} busy={busy} act={act} />}
      <PlayerList round={round} meId={meId} />
      <LocationReference names={round.locationNames} />
      {canHost ? (
        <HostControls phase={round.phase} busy={busy} act={act} onNewRound={onNewRound} />
      ) : (
        round.replaceable && (
          // The host has been gone a while: anyone can start over.
          <SoftButton className="w-full" disabled={busy} onClick={onNewRound}>
            รอบใหม่ · New round
          </SoftButton>
        )
      )}
    </div>
  );
}
