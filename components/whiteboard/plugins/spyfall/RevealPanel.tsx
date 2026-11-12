"use client";

import { MapPin, VenetianMask } from "lucide-react";

import type { GameAction, GameView } from "@/lib/whiteboard/games";

import { EndButton } from "./HostControls";
import { Avatar, Num, PrimaryButton, Section } from "./ui";

type Round = NonNullable<GameView["round"]>;
type Reveal = NonNullable<Round["reveal"]>;

function VoteTally({ round, reveal }: { round: Round; reveal: Reveal }) {
  const counts = new Map<string, number>();
  for (const target of Object.values(reveal.votes)) counts.set(target, (counts.get(target) ?? 0) + 1);
  const spies = new Set(reveal.spyIds);
  const rows = [...round.players].sort((a, b) => (counts.get(b.userId) ?? 0) - (counts.get(a.userId) ?? 0));
  const top = Math.max(1, ...counts.values());
  return (
    <Section
      title="ผลโหวต · Votes"
      count={
        <Num>
          {Object.keys(reveal.votes).length}/{round.players.length}
        </Num>
      }
    >
      <ul className="space-y-1">
        {rows.map((p) => {
          const n = counts.get(p.userId) ?? 0;
          return (
            <li key={p.userId} className="flex min-h-9 items-center gap-2 text-sm">
              <Avatar name={p.name} url={p.avatarUrl} userId={p.userId} />
              <span className="w-24 min-w-0 truncate">
                {p.name}
                {spies.has(p.userId) && <VenetianMask className="wb-alert ml-1 inline h-3.5 w-3.5" strokeWidth={1.5} />}
              </span>
              <span className="wb-tally">
                <span className="wb-tally__fill" style={{ width: `${(n / top) * 100}%` }} />
              </span>
              <span className="wb-num w-5 text-right text-xs font-medium">{n}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SpyGuessResult({ round, guess }: { round: Round; guess: NonNullable<Reveal["spyGuess"]> }) {
  const who = round.players.find((p) => p.userId === guess.userId)?.name ?? "สายลับ";
  return (
    <p className={`wb-box p-3 text-sm ${guess.correct ? "wb-box--verm" : ""}`}>
      {who} ทายว่า <b className="font-semibold">{guess.location}</b>{" "}
      {guess.correct ? "ถูกต้อง สายลับชนะ · The spy wins" : "ผิด ทีมชนะ · Wrong guess, the team wins"}
    </p>
  );
}

/** After the reveal: where we were, who the spies were, how people voted, and what's next. */
export function RevealPanel({
  round,
  canHost,
  busy,
  act,
  onPlayAgain,
}: {
  round: Round;
  /** Host or owner: may end the game. Anyone may play again once the round is revealed. */
  canHost: boolean;
  busy: boolean;
  act: (action: GameAction) => Promise<boolean>;
  onPlayAgain: () => void;
}) {
  const reveal = round.reveal;
  if (!reveal) return <p className="wb-soft p-4 text-sm">กำลังเปิดเฉลย...</p>;
  const spyNames = round.players.filter((p) => reveal.spyIds.includes(p.userId)).map((p) => p.name);
  return (
    <div className="wb-spy space-y-4 p-3">
      <div className="wb-box space-y-1 p-4 text-center">
        <p className="wb-soft inline-flex items-center gap-1 text-xs">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> สถานที่คือ · The location was
        </p>
        <p className="wb-spy-place">{reveal.location}</p>
        <p className="pt-1 text-sm">
          สายลับ · Spy: <b className="font-semibold">{spyNames.join(", ") || "-"}</b>
        </p>
      </div>
      {reveal.spyGuess && <SpyGuessResult round={round} guess={reveal.spyGuess} />}
      <VoteTally round={round} reveal={reveal} />
      {canHost || round.replaceable ? (
        <div className="flex gap-1.5">
          {canHost && <EndButton busy={busy} act={act} />}
          <PrimaryButton className="flex-1" disabled={busy} onClick={onPlayAgain}>
            เล่นอีกรอบ · Play again
          </PrimaryButton>
        </div>
      ) : (
        <p className="wb-soft text-center text-xs">รอ {round.hostName} เริ่มรอบใหม่ · Waiting for the host</p>
      )}
    </div>
  );
}
