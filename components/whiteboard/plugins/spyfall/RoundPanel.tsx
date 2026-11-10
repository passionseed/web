"use client";

import { Check, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { formatClock, secondsLeft } from "@/lib/whiteboard/core";
import type { GameAction, GameView } from "@/lib/whiteboard/games";

import { CardView } from "./CardView";
import { HostControls } from "./HostControls";
import { pickBySeed } from "./setup";
import { Avatar, Num, Section, SoftButton } from "./ui";

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
  // How much of the round is left, for the strip under the clock.
  const progress = round.seconds ? Math.min(1, left / round.seconds) : 0;
  return (
    <div className="wb-spy-status">
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="wb-spy-live">{round.phase === "voting" ? "ช่วงโหวต · Voting" : "กำลังเล่น · Playing"}</span>
        {round.roundEndsAt && left === 0 && <p className="wb-alert text-xs font-medium">หมดเวลา โหวตได้เลย · Time&apos;s up, vote now</p>}
        {starter && (
          <p>
            ใครเริ่มถาม <span className="wb-soft">· First to ask:</span> <b className="font-semibold">{starter.name}</b>
          </p>
        )}
        <p className="wb-soft text-[11px]">
          โฮสต์ {round.hostName} · สายลับ <span className="wb-num">{round.spyCount}</span> คน
        </p>
      </div>
      {round.roundEndsAt && (
        <div className="wb-spy-cd">
          <b className={`wb-spy-cd__clock ${left <= 10 ? "wb-spy-cd__clock--ending" : ""}`}>{formatClock(left)}</b>
          <span className="wb-strip" aria-hidden>
            {progress > 0 && <span className="wb-strip__fill" style={{ width: `${progress * 100}%` }} />}
          </span>
          <span className="wb-spy-cd__label">เหลือเวลา · left</span>
        </div>
      )}
    </div>
  );
}

function PlayerList({ round, meId }: { round: Round; meId: string }) {
  const votedCount = round.players.filter((p) => p.voted).length;
  return (
    <Section
      title="ผู้เล่น · Players"
      count={
        <>
          โหวตแล้ว{" "}
          <Num>
            {votedCount}/{round.players.length}
          </Num>
        </>
      }
    >
      <ul className="space-y-0.5">
        {round.players.map((p) => (
          <li key={p.userId} className="flex min-h-9 items-center gap-2 text-sm">
            <span className="wb-num wb-soft w-5 text-right text-xs">{p.seat + 1}</span>
            <Avatar name={p.name} url={p.avatarUrl} userId={p.userId} />
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.userId === meId && <span className="wb-soft"> (คุณ)</span>}
            </span>
            {p.voted && (
              <span className="wb-soft inline-flex items-center gap-0.5 text-xs">
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> โหวตแล้ว
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
    <Section title="สถานที่ที่เป็นไปได้ · Possible locations" count={<Num>{names.length}</Num>}>
      <p className="wb-soft text-[11px]">แตะเพื่อขีดฆ่าสถานที่ที่คิดว่าไม่ใช่ เห็นเฉพาะบนจอของคุณ</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => {
          const off = crossed.has(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={off}
              onClick={() => toggle(name)}
              className={`wb-pick min-h-11 px-2.5 text-xs ${off ? "wb-pick--off" : ""}`}
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
      <p className="wb-soft text-[11px]">เปลี่ยนใจได้จนกว่าจะเปิดเฉลย</p>
      <ul className="wb-vlist">
        {others.map((p) => {
          const on = myVote === p.userId;
          return (
            <li key={p.userId}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={on}
                onClick={() => void act({ action: "vote", targetId: p.userId })}
                className={`wb-vrow disabled:opacity-50 ${on ? "wb-vrow--on" : ""}`}
              >
                <Avatar name={p.name} url={p.avatarUrl} userId={p.userId} />
                <span className="wb-vrow__name">
                  <span className="min-w-0 truncate">{p.name}</span>
                  <small>
                    ที่นั่ง <Num>{p.seat + 1}</Num>
                  </small>
                </span>
                <span className="wb-vote">
                  {on && <Check className="wb-vrow__check h-3.5 w-3.5 shrink-0" aria-hidden />}
                  {on ? "โหวตแล้ว" : "โหวต"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
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
      <SoftButton className="w-full font-semibold" onClick={() => setOpen(true)}>
        <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden /> ทายสถานที่ · Guess the location
      </SoftButton>
    );
  }
  return (
    <Section title="ทายสถานที่ · Guess the location">
      <p className="wb-soft text-[11px]">ทายได้ครั้งเดียว และเฉลยทันทีที่ทาย</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={pick === name}
            onClick={() => setPick(name)}
            className={`wb-pick min-h-11 px-2.5 text-xs ${pick === name ? "wb-pick--on" : ""}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <SoftButton className="wb-btn--quiet" onClick={() => setOpen(false)}>
          ยกเลิก
        </SoftButton>
        {/* An ink button: the bloom is kept for the host's next step, further down this screen. */}
        <SoftButton className="flex-1 font-semibold" disabled={!pick || busy} onClick={() => pick && void act({ action: "guess", location: pick })}>
          ยืนยันคำตอบ · Confirm guess
        </SoftButton>
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
    <div className="wb-spy space-y-4 p-3">
      {card ? (
        <CardView card={card} seed={round.id} onShownChange={setCardShown} />
      ) : (
        <p className="wb-box wb-box--dashed wb-soft p-3 text-center text-sm">
          รอบนี้คุณเป็นผู้ชม · You are watching this round
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
