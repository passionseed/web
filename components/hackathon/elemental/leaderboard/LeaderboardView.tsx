"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";
import { BOARD_POLL_MS, type LeaderboardPayload, type PublicBoardEntry } from "@/lib/hackathon/elemental/team-style-board";

import { StyledTeamName } from "../team-style/StyledTeamName";
import { UnlockTrack } from "../team-style/UnlockTrack";

/**
 * The public team board. Team and school names and two numbers only: never a
 * person's name. While the tab is visible it asks for new numbers every
 * BOARD_POLL_MS. Needs trirong and teamStyleFonts on a wrapper.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "กระดานทีม",
  lead: "ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด นับจากลิงก์แชร์ของทุกคนในทีม",
  order: "เรียงตามที่นั่งที่จ่ายแล้ว ถ้าเท่ากันดูจำนวนเครื่องที่เปิดลิงก์",
  updated: "อัปเดตล่าสุด",
  paid: "จ่ายแล้ว",
  paidLong: "ที่นั่งจ่ายแล้ว",
  devices: "เครื่อง",
  devicesLong: "เครื่องเปิดลิงก์",
  rankTeam: "อันดับ · ทีม",
  solo: "มาคนเดียว",
  noName: "ยังไม่ตั้งชื่อ",
  emptyTitle: "ยังไม่มีทีมบนกระดาน",
  empty: "ทีมแรกที่มีคนเปิดลิงก์แชร์ ขึ้นกระดานทันที",
  closedTitle: "เปิดเร็วๆ นี้",
  closed: "กระดานนี้จะโชว์ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด นับจากลิงก์แชร์ของทุกคนในทีม",
  unavailable: "โหลดกระดานไม่ได้ตอนนี้ หน้านี้จะลองใหม่เอง",
  joinTitle: "อยากให้ทีมขึ้นกระดาน",
  join: "แชร์ลิงก์ของตัวเองจากหน้าที่นั่ง ทุกเครื่องที่เปิดลิงก์นับให้ทีม ยิ่งมากยิ่งแต่งชื่อทีมได้มาก",
  unlocks: "เครื่องที่เปิดลิงก์ครบเท่านี้ ปลดล็อกการแต่งชื่อทีม",
  joinNote: "เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  signUp: `สมัคร ${ELEMENTAL.edition}`,
  back: `กลับหน้า ${ELEMENTAL.edition} Hackathon`,
};

const line = "rgba(29,33,31,0.14)";

const bangkokTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function LeaderboardView({ initial, poll }: { initial: LeaderboardPayload; poll: boolean }) {
  const [data, setData] = useState(initial);

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

  const top = data.teams.filter((t) => t.rank <= 3);
  const rest = data.teams.filter((t) => t.rank > 3);

  return (
    <main className="min-h-[100dvh] px-5 py-10 sm:px-8 sm:py-16" style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl sm:max-w-2xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {ELEMENTAL.edition} Hackathon · {thaiDateLine()}
        </p>
        <h1 className="mt-6 text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.05 }}>
          {COPY.title}
        </h1>

        {data.state === "closed" ? (
          <Closed />
        ) : (
          <>
            <p className="mt-4 text-pretty text-lg">{COPY.lead}</p>
            <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
              {COPY.order}
              {data.state === "live" && (
                <>
                  {" · "}
                  {COPY.updated} <span suppressHydrationWarning>{bangkokTime(data.updatedAt)}</span>
                </>
              )}
            </p>

            {data.state === "unavailable" ? (
              <p className="mt-10 rounded-2xl border p-5" style={{ borderColor: line }} role="status">
                {COPY.unavailable}
              </p>
            ) : data.teams.length === 0 ? (
              <div className="mt-10 rounded-2xl border p-6" style={{ borderColor: line }}>
                <p className="text-xl font-semibold">{COPY.emptyTitle}</p>
                <p className="mt-1" style={{ color: EL.inkSoft }}>
                  {COPY.empty}
                </p>
              </div>
            ) : (
              <>
                <ol className="mt-10 space-y-3" aria-label={COPY.title}>
                  {top.map((t) => (
                    <TopRow key={t.key} team={t} />
                  ))}
                </ol>
                {rest.length > 0 && <RestList teams={rest} />}
              </>
            )}

            <HowToJoin />
          </>
        )}
      </div>
    </main>
  );
}

/** Up to two schools; the count of the rest stays visible when the names are cut short. */
function Schools({ team, className }: { team: PublicBoardEntry; className?: string }) {
  const shown = team.schools.slice(0, 2);
  const more = team.schools.length - shown.length;
  const text = shown.length ? shown.join(" · ") : team.solo ? COPY.solo : "";
  if (!text) return null;
  return (
    <p className={`flex min-w-0 gap-1 ${className ?? ""}`} style={{ color: EL.inkSoft }}>
      <span className="truncate">{text}</span>
      {more > 0 && <span className="shrink-0">+{more}</span>}
    </p>
  );
}

/** First, second and third: a card each, with the rank and the numbers large. */
function TopRow({ team }: { team: PublicBoardEntry }) {
  const first = team.rank === 1;
  return (
    <li
      id={team.key}
      className="scroll-mt-6 rounded-2xl border p-5 target:outline target:outline-2 target:outline-offset-2 sm:p-6"
      style={{ borderColor: first ? "rgba(29,33,31,0.45)" : line, backgroundColor: "rgba(255,255,255,0.45)", outlineColor: EL.flame }}
    >
      <div className="flex gap-4">
        <span
          className="w-8 shrink-0 text-5xl tabular-nums"
          style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1 }}
          aria-label={`อันดับ ${team.rank}`}
        >
          {team.rank}
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <StyledTeamName
              name={team.name}
              style={team.style}
              placeholder={COPY.noName}
              className={`block leading-[1.3] ${first ? "text-[2.25rem]" : "text-[1.875rem]"}`}
            />
            <Schools team={team} className="mt-1 text-sm" />
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
function RestList({ teams }: { teams: PublicBoardEntry[] }) {
  const cols = "grid grid-cols-[1.75rem_minmax(0,1fr)_3.25rem_3.25rem] items-baseline gap-x-3";
  return (
    <div className="mt-8">
      <div className={`${cols} border-b pb-2 text-xs`} style={{ borderColor: line, color: EL.inkSoft }}>
        <span className="col-span-2">{COPY.rankTeam}</span>
        <span className="text-right">{COPY.paid}</span>
        <span className="text-right">{COPY.devices}</span>
      </div>
      <ol start={4}>
        {teams.map((t) => (
          <li
            key={t.key}
            id={t.key}
            className={`${cols} scroll-mt-6 border-b py-3.5 target:-mx-3 target:rounded-lg target:bg-[rgba(236,100,36,0.08)] target:px-3`}
            style={{ borderColor: line }}
          >
            <span className="tabular-nums" style={{ color: EL.inkSoft }}>
              {t.rank}
            </span>
            <span className="min-w-0">
              <StyledTeamName name={t.name} style={t.style} placeholder={COPY.noName} className="block text-[1.375rem] leading-[1.35]" />
              <Schools team={t} className="mt-0.5 text-xs" />
            </span>
            <span className="text-right text-lg font-semibold tabular-nums">{t.paid}</span>
            <span className="text-right tabular-nums" style={{ color: EL.inkSoft }}>
              {t.devices}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HowToJoin() {
  return (
    <section className="mt-14 space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: line }}>
      <h2 className="text-xl font-semibold">{COPY.joinTitle}</h2>
      <p>{COPY.join}</p>
      <div className="space-y-4 pt-2">
        <p className="text-sm font-semibold">{COPY.unlocks}</p>
        <UnlockTrack devices={null} />
      </div>
      <p className="text-sm" style={{ color: EL.inkSoft }}>
        {COPY.joinNote}
      </p>
      <Link
        href="/hackathon/elemental"
        className="inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold sm:w-auto sm:px-10"
        style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
      >
        {COPY.signUp}
      </Link>
    </section>
  );
}

function Closed() {
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: line }}>
        <p className="text-xl font-semibold">{COPY.closedTitle}</p>
        <p className="mt-1" style={{ color: EL.inkSoft }}>
          {COPY.closed}
        </p>
      </div>
      <Link href="/hackathon/elemental" className="inline-block text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
        {COPY.back}
      </Link>
    </div>
  );
}
