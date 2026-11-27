"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import type { LeaderboardPayload, PublicBoardEntry } from "@/lib/hackathon/elemental/team-style-board";
import { BOARD_POLL_MS, BOARD_YOU_KEY, type BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

import { StyledTeamName } from "../team-style/StyledTeamName";
import { TeamMeterStrip } from "../team-style/TeamMeter";

/**
 * The public team board. Board names and school names and two numbers only:
 * never a person's name. While live and visible it asks for new numbers every
 * BOARD_POLL_MS; after sign-up close it shows the frozen final standings.
 * Opened from a pay page in the same tab, it marks that team "ทีมคุณ".
 * Needs trirong and teamStyleFonts on a wrapper.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "กระดานทีม",
  lead: "ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด นับจากลิงก์แชร์ของทุกคนในทีม",
  order: "เรียงตามที่นั่งที่จ่ายแล้ว ถ้าเท่ากันดูจำนวนเครื่องที่เปิดลิงก์",
  updated: "อัปเดตล่าสุด",
  final: "ผลสุดท้าย",
  countedUntil: (when: string) => `นับถึงปิดรับสมัคร ${when}`,
  paid: "จ่ายแล้ว",
  paidLong: "ที่นั่งจ่ายแล้ว",
  devices: "เครื่อง",
  devicesLong: "เครื่องเปิดลิงก์",
  rankTeam: "อันดับ · ทีม",
  solo: "มาคนเดียว",
  you: "ทีมคุณ",
  youOff: "ทีมคุณยังไม่ขึ้นกระดาน",
  youNeedName: "ตั้งชื่อเพื่อขึ้นกระดาน",
  youNeedDevices: (n: number) => `อีก ${n} เครื่องขึ้นกระดาน`,
  youSetName: "ตั้งชื่อทีม",
  emptyTitle: "ยังไม่มีทีมบนกระดาน",
  empty: "ทีมแรกที่ตั้งชื่อและมีคนเปิดลิงก์แชร์ ขึ้นกระดานทันที",
  emptyFinal: "ไม่มีทีมบนกระดาน",
  soonTitle: "เปิดเร็วๆ นี้",
  soon: "กระดานนี้จะโชว์ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด นับจากลิงก์แชร์ของทุกคนในทีม",
  unavailable: "โหลดกระดานไม่ได้ตอนนี้ หน้านี้จะลองใหม่เอง",
  joinTitle: "อยากให้ทีมขึ้นกระดาน",
  join: "ตั้งชื่อทีมบนกระดานที่หน้าที่นั่ง แล้วแชร์ลิงก์ของตัวเอง ทุกเครื่องที่เปิดลิงก์นับให้ทีม ยิ่งมากยิ่งแต่งชื่อทีมได้มาก",
  joinYou: "แชร์ลิงก์ของตัวเองต่อ ทุกเครื่องที่เปิดลิงก์นับให้ทีม ยิ่งมากยิ่งแต่งชื่อทีมได้มาก",
  unlocks: "ครบเท่านี้ ปลดล็อกการแต่งชื่อทีม",
  joinNote: "เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  finalNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับ ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  signUp: `สมัคร ${ELEMENTAL.edition}`,
  shareMine: "แชร์ลิงก์ของฉัน",
  back: `กลับหน้า ${ELEMENTAL.edition} Hackathon`,
};

const line = "rgba(29,33,31,0.14)";
const youTint = "rgba(236,100,36,0.08)";

const bangkok = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...opts }).format(new Date(iso));

/** The pay page's note in this tab, if any. */
function readYou(): BoardYou | null {
  try {
    const raw = sessionStorage.getItem(BOARD_YOU_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BoardYou>;
    return typeof v.key === "string"
      ? { key: v.key, shareHref: v.shareHref ?? null, payHref: v.payHref ?? null, devices: Number(v.devices) || 0, named: Boolean(v.named) }
      : null;
  } catch {
    return null;
  }
}

export function LeaderboardView({ initial, poll, you: youProp }: { initial: LeaderboardPayload; poll: boolean; you?: BoardYou | null }) {
  const [data, setData] = useState(initial);
  const [you, setYou] = useState<BoardYou | null>(youProp ?? null);

  useEffect(() => {
    if (youProp === undefined) setYou(readYou());
  }, [youProp]);

  useEffect(() => {
    if (!poll) return;
    let stopped = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/hackathon/elemental/leaderboard", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as LeaderboardPayload;
        if (!stopped) setData(next);
      } catch {
        // Keep the last numbers; the next tick tries again.
      }
    };
    const timer = setInterval(load, BOARD_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  const final = data.state === "final";
  const top = data.teams.filter((t) => t.rank <= 3);
  const rest = data.teams.filter((t) => t.rank > 3);
  const youKey = you?.key ?? null;
  const youOnBoard = Boolean(youKey && data.teams.some((t) => t.key === youKey));

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-5 py-10 sm:px-8 sm:py-16" style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl sm:max-w-2xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {ELEMENTAL.edition} Hackathon · {thaiDateLine()}
        </p>
        <h1 className="mt-6 text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          {COPY.title}
        </h1>

        {data.state === "soon" ? (
          <Soon />
        ) : (
          <>
            {final && (
              <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ boxShadow: `inset 0 0 0 1.5px ${EL.ink}` }}>
                  {COPY.final}
                </span>
                <span className="text-sm" style={{ color: EL.inkSoft }} suppressHydrationWarning>
                  {COPY.countedUntil(bangkok(data.countedUntil, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}
                </span>
              </p>
            )}
            <p className="mt-4 text-pretty text-lg">{COPY.lead}</p>
            <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
              {COPY.order}
              {data.state === "live" && (
                <>
                  {" · "}
                  {COPY.updated} <span suppressHydrationWarning>{bangkok(data.updatedAt, { hour: "2-digit", minute: "2-digit" })}</span>
                </>
              )}
            </p>

            {you && !youOnBoard && data.state !== "unavailable" && <YouOffBoard you={you} final={final} />}

            {data.state === "unavailable" ? (
              <p className="mt-10 rounded-2xl border p-5" style={{ borderColor: line }} role="status">
                {COPY.unavailable}
              </p>
            ) : data.teams.length === 0 ? (
              <div className="mt-10 rounded-2xl border p-6" style={{ borderColor: line }}>
                <p className="text-xl font-semibold">{final ? COPY.emptyFinal : COPY.emptyTitle}</p>
                {!final && (
                  <p className="mt-1" style={{ color: EL.inkSoft }}>
                    {COPY.empty}
                  </p>
                )}
              </div>
            ) : (
              <>
                <ol className="mt-10 space-y-3" aria-label={COPY.title}>
                  {top.map((t) => (
                    <TopRow key={t.key} team={t} you={t.key === youKey} />
                  ))}
                </ol>
                {rest.length > 0 && <RestList teams={rest} youKey={youKey} />}
              </>
            )}

            {final ? (
              <p className="mt-12 text-sm" style={{ color: EL.inkSoft }}>
                {COPY.finalNote}
              </p>
            ) : (
              <HowToJoin you={you} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function YouChip() {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: EL.ink, color: EL.cream }}>
      {COPY.you}
    </span>
  );
}

/** Opened from a pay page whose team isn't listed yet: what's missing, and where to fix it. */
function YouOffBoard({ you, final }: { you: BoardYou; final: boolean }) {
  const needName = !you.named;
  const needDevices = !needName && you.devices < 1;
  const href = needName ? you.payHref : needDevices && !final ? you.shareHref : null;
  return (
    <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: EL.ink, backgroundColor: youTint }}>
      <p className="flex items-center gap-2 text-base font-semibold">
        <YouChip /> {COPY.youOff}
      </p>
      {(needName || needDevices) && <p className="mt-1">{needName ? COPY.youNeedName : COPY.youNeedDevices(1 - you.devices)}</p>}
      {href && (
        <Link href={href} className="-my-3 inline-flex min-h-11 items-center py-3 text-sm font-semibold underline underline-offset-4">
          {needName ? COPY.youSetName : COPY.shareMine}
        </Link>
      )}
    </div>
  );
}

/** Up to two schools; the count of the rest stays visible when the names are cut short. */
function Schools({ team, className, you }: { team: PublicBoardEntry; className?: string; you?: boolean }) {
  const shown = team.schools.slice(0, 2);
  const more = team.schools.length - shown.length;
  const text = shown.length ? shown.join(" · ") : team.solo ? COPY.solo : "";
  if (!text && !you) return null;
  return (
    <p className={`flex min-w-0 items-center gap-1.5 ${className ?? ""}`} style={{ color: EL.inkSoft }}>
      {you && <YouChip />}
      <span className="truncate">{text}</span>
      {more > 0 && <span className="shrink-0">+{more}</span>}
    </p>
  );
}

/** First, second and third: a card each, with the rank and the numbers large. */
function TopRow({ team, you }: { team: PublicBoardEntry; you: boolean }) {
  const first = team.rank === 1;
  return (
    <li
      id={team.key}
      className="scroll-mt-6 rounded-2xl border p-5 sm:p-6"
      style={{ borderColor: you ? EL.ink : first ? "rgba(29,33,31,0.45)" : line, backgroundColor: you ? youTint : "rgba(255,255,255,0.45)" }}
    >
      <div className="flex gap-4">
        <span className="w-8 shrink-0 text-5xl tabular-nums" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1 }} aria-label={`อันดับ ${team.rank}`}>
          {team.rank}
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <StyledTeamName name={team.name} style={team.style} className={`block leading-[1.3] ${first ? "text-[2.25rem]" : "text-[1.875rem]"}`} />
            <Schools team={team} you={you} className="mt-1 text-sm" />
          </div>
          <div className="mt-4 flex items-baseline gap-6 sm:mt-0 sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
            <Stat value={team.paid} label={COPY.paidLong} strong />
            <Stat value={team.devices} label={COPY.devicesLong} />
          </div>
        </div>
      </div>
    </li>
  );
}

function Stat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[1.75rem] leading-none tabular-nums" style={{ fontFamily: EL_FONT.display, fontWeight: strong ? 400 : 300 }}>
        {value}
      </span>
      <span className="text-sm" style={{ color: EL.inkSoft }}>
        {label}
      </span>
    </span>
  );
}

/** Fourth place down: one compact row each. */
function RestList({ teams, youKey }: { teams: PublicBoardEntry[]; youKey: string | null }) {
  const cols = "grid grid-cols-[1.75rem_minmax(0,1fr)_3.25rem_3.25rem] items-baseline gap-x-3";
  return (
    <div className="mt-8">
      <div className={`${cols} border-b pb-2 text-xs`} style={{ borderColor: line, color: EL.inkSoft }}>
        <span className="col-span-2">{COPY.rankTeam}</span>
        <span className="text-right">{COPY.paid}</span>
        <span className="text-right">{COPY.devices}</span>
      </div>
      <ol start={4}>
        {teams.map((t) => {
          const you = t.key === youKey;
          return (
            <li
              key={t.key}
              id={t.key}
              className={`${cols} scroll-mt-6 border-b py-3.5 ${you ? "-mx-3 rounded-lg px-3" : ""}`}
              style={{ borderColor: line, backgroundColor: you ? youTint : undefined }}
            >
              <span className="tabular-nums" style={{ color: EL.inkSoft }}>
                {t.rank}
              </span>
              <span className="min-w-0">
                <StyledTeamName name={t.name} style={t.style} className="block text-[1.375rem] leading-[1.35]" />
                <Schools team={t} you={you} className="mt-0.5 text-xs" />
              </span>
              <span className="text-right text-lg font-semibold tabular-nums">{t.paid}</span>
              <span className="text-right tabular-nums" style={{ color: EL.inkSoft }}>
                {t.devices}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HowToJoin({ you }: { you: BoardYou | null }) {
  const share = you?.shareHref ?? null;
  return (
    <section className="mt-14 space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: line }}>
      <h2 className="text-xl font-semibold">{COPY.joinTitle}</h2>
      <p>{share ? COPY.joinYou : COPY.join}</p>
      <div className="space-y-3 pt-2">
        <p className="text-sm font-semibold">{COPY.unlocks}</p>
        <TeamMeterStrip devices={null} />
      </div>
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        {COPY.joinNote}
      </p>
      <Link
        href={share ?? "/hackathon/elemental"}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold sm:w-auto sm:px-10"
        style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
      >
        {share ? COPY.shareMine : COPY.signUp}
      </Link>
    </section>
  );
}

function Soon() {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: line }}>
        <p className="text-xl font-semibold">{COPY.soonTitle}</p>
        <p className="mt-1" style={{ color: EL.inkSoft }}>
          {COPY.soon}
        </p>
      </div>
      <Link href="/hackathon/elemental" className="-my-3 inline-flex min-h-11 items-center py-3 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
        {COPY.back}
      </Link>
    </div>
  );
}
