"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

import { EL, EL_FONT, EL_GROUND } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { arrivals, countdownParts, LOBBY_POLL_MS, type LobbyPayload, type LobbyTeam } from "@/lib/hackathon/elemental/lobby";
import { BOARD_YOU_KEY, type BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

import cinema from "../elemental-cinema.module.css";
import { KEY_VISUAL_MEDIA } from "../media";
import shell from "../share/shell.module.css";
import { Body, EditorialLink, Fine, H2, Page, PrimaryButton, RollingNumber, SkyBand, StickyBar, Tag, surfaceVars, v } from "../share/ui";
import { StyledTeamName } from "../team-style/StyledTeamName";
import { demoArrivals } from "./demo-lobby";
import styles from "./lobby.module.css";

/**
 * The Elemental waiting room, a Kahoot lobby in the landing's dark world:
 * the countdown to the opening on the sky (the "game PIN"), how many teams
 * and people are in, then every team's custom name as a tile in its own
 * style, newest first. New names pop in (scale and settle; nothing moves
 * under prefers-reduced-motion). Opened from your own pages in this tab (the
 * sessionStorage note TeamLine leaves, never a token in the URL), your tile
 * is pinned with [คุณ], or, without a board name, a way to set one.
 * tv: the projector view for the opening stream (no top bar, bigger tiles).
 * Rules and data: lib/hackathon/elemental/lobby.ts. Needs trirong and teamStyleFonts on a wrapper.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  opening: (date: string, time: string) => `เปิดงาน ${date} ${time}`,
  openingIn: "เปิดงานใน",
  days: "วัน",
  started: "เปิดงานแล้ว",
  startedLead: "เจอกันบน Discord",
  over: "ขอบคุณทุกทีม",
  overLead: `ทีมทั้งหมดของ ${ELEMENTAL.edition}`,
  teams: "ทีมในห้อง",
  teamsOver: "ทีม",
  people: "คน",
  you: "คุณ",
  youNoName: "ทีมคุณยังไม่มีชื่อในห้อง",
  youNoNameLead: "custom ชื่อทีมให้เท่ ทุกคนในห้องจะเห็นชื่อนี้",
  setName: "ตั้งชื่อทีมก่อนเข้าห้อง",
  signUp: "สมัคร",
  pay: "จ่ายแล้วยืนยันที่นั่ง",
  emptyTitle: "ยังไม่มีใครในห้อง",
  empty: "ทีมแรกที่ตั้งชื่อ ขึ้นที่นี่ทันที",
  soonTitle: "ห้องรอเปิดเร็วๆ นี้",
  soon: "ที่นี่จะโชว์ชื่อทีมทุกทีมที่สมัครแล้ว ก่อนเปิดงาน",
  unavailable: "โหลดห้องไม่ได้ตอนนี้ หน้านี้จะลองใหม่เอง",
  note: "ชื่อทีมตั้งเองโดยทีม ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  board: "กระดาน",
  back: `หน้า ${ELEMENTAL.edition} Hackathon`,
  more: (n: number) => `+${n} ทีม`,
  arrived: (n: number, total: number) => `เข้ามาใหม่ ${n} ทีม รวม ${total} ทีม`,
  label: "ทีมในห้อง",
};

/** At most this many tiles pop at once; the rest just appear. */
const MAX_POPS = 8;
/** The projector view shows the newest this many, then "+N ทีม". */
const TV_LIMIT = 96;

const pad = (n: number) => String(n).padStart(2, "0");

/** The pay page's note in this tab, if any (the same one the board reads). */
function readYou(): BoardYou | null {
  try {
    const raw = sessionStorage.getItem(BOARD_YOU_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<BoardYou>;
    return typeof v.key === "string"
      ? {
          key: v.key,
          shareHref: v.shareHref ?? null,
          payHref: v.payHref ?? null,
          editHref: v.editHref ?? null,
          devices: Number(v.devices) || 0,
          named: Boolean(v.named),
          payPending: Boolean(v.payPending),
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * The countdown, ticking each second from the server's clock (so the first
 * paint matches the server's and a wrong phone clock doesn't matter).
 * Digits are Trirong, all one width, so the line never shifts.
 */
function Countdown({ target, serverNow, size }: { target: string; serverNow: string; size: string }) {
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  const p = countdownParts(new Date(target), now);
  const big: CSSProperties = { fontFamily: EL_FONT.display, fontWeight: 200, fontSize: size, lineHeight: 1 };
  return (
    <p className="whitespace-nowrap tabular-nums" style={big} aria-label={`${COPY.openingIn} ${p.days} ${COPY.days} ${p.hours} ชั่วโมง ${p.minutes} นาที`} role="timer">
      {p.days > 0 && (
        <>
          {p.days}
          <span className="ml-[0.18em] mr-[0.3em]" style={{ fontSize: "0.42em", fontWeight: 300 }}>
            {COPY.days}
          </span>
        </>
      )}
      {pad(p.hours)}:{pad(p.minutes)}:{pad(p.seconds)}
    </p>
  );
}

/** The opening slot from facts.ts, for the line over the countdown. */
function openingLine(): string {
  const slot = ELEMENTAL.schedule.find((s) => s.kind === "open");
  return COPY.opening(formatThaiDate(slot?.date ?? ELEMENTAL.startDate), slot?.time ?? "");
}

/** The sky's ink block: the countdown before the opening, then a plain title. */
function SkyTitle({ data, tv }: { data: LobbyPayload; tv: boolean }) {
  const titleSize = tv ? "min(9vw, 132px)" : "clamp(40px, 12.5vw, 72px)";
  const title = (text: string) => <h1 style={{ fontFamily: EL_FONT.display, fontWeight: 200, fontSize: titleSize, lineHeight: 1.1 }}>{text}</h1>;
  // After the countdown or title, never above it (no eyebrow labels).
  const stamp = (
    <p className="mt-2" style={{ fontFamily: EL_FONT.mono, fontSize: tv ? 20 : 13, lineHeight: tv ? "30px" : "20px", color: "rgba(29,33,31,0.8)" }}>
      [{openingLine()}]
    </p>
  );
  const lead = (text: string) => (
    <p className="mt-2" style={{ fontFamily: EL_FONT.body, fontSize: tv ? 28 : 16, lineHeight: tv ? "40px" : "26px", color: "rgba(29,33,31,0.8)" }}>
      {text}
    </p>
  );
  if (data.state === "over") {
    return (
      <div>
        {title(COPY.over)}
        {lead(COPY.overLead)}
      </div>
    );
  }
  if (data.state === "started") {
    return (
      <div>
        {title(COPY.started)}
        {lead(COPY.startedLead)}
        {stamp}
      </div>
    );
  }
  return (
    <div>
      <Countdown target={data.openingAt} serverNow={data.now} size={titleSize} />
      {stamp}
    </div>
  );
}

/** The projector's sky: the same still as the share pages' sky band, the ink block centred on it. */
function TvSky({ children }: { children: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[40vh] items-center justify-center overflow-hidden px-10 pb-16 pt-10 text-center">
      <Image src={KEY_VISUAL_MEDIA.scenePoster} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[50%_18%]" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-[55%]"
        style={{ background: "linear-gradient(to top, #0c0d0c 0%, rgba(12,13,12,0.95) 30%, rgba(12,13,12,0.45) 62%, transparent 100%)" }}
      />
      <div style={{ color: EL.ink }}>{children}</div>
    </section>
  );
}

/** "24 ทีมในห้อง · 57 คน": the counts roll when they change (the shared RollingNumber). */
function Counts({ teams, people, over, tv }: { teams: number; people: number; over: boolean; tv: boolean }) {
  const label = { fontFamily: EL_FONT.body, fontSize: tv ? 24 : 16, lineHeight: tv ? "34px" : "26px", color: v.secondary };
  return (
    <div className={`flex flex-wrap items-baseline gap-y-2 ${tv ? "justify-center gap-x-10" : "gap-x-6"}`}>
      <span className="inline-flex items-baseline gap-2">
        <RollingNumber value={teams} align="start" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: tv ? 112 : 64, lineHeight: 1, color: v.number }} />
        <span style={label}>{over ? COPY.teamsOver : COPY.teams}</span>
      </span>
      <span className="inline-flex items-baseline gap-2">
        <RollingNumber value={people} align="start" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: tv ? 56 : 28, lineHeight: 1, color: v.secondary }} />
        <span style={label}>{COPY.people}</span>
      </span>
    </div>
  );
}

/** One team's tile: its name in its own style, dark-board colours. */
function Tile({ team, pop, delay, tv }: { team: LobbyTeam; pop: boolean; delay: number; tv: boolean }) {
  return (
    <li
      className={`${styles.tile} ${pop ? styles.pop : ""} inline-flex max-w-full items-center ${tv ? "px-5 py-3" : "px-3 py-2"}`}
      style={pop ? { animationDelay: `${delay}ms` } : undefined}
    >
      <StyledTeamName name={team.name} style={team.style} sizeStyle={{ fontSize: tv ? 40 : 22, lineHeight: 1.35 }} />
    </li>
  );
}

function Tiles({ teams, fresh, tv }: { teams: LobbyTeam[]; fresh: Map<string, number>; tv: boolean }) {
  const shown = tv ? teams.slice(0, TV_LIMIT) : teams;
  const more = teams.length - shown.length;
  return (
    <ul className={`flex flex-wrap ${tv ? "justify-center gap-3" : "gap-2"}`} aria-label={COPY.label}>
      {shown.map((t) => (
        <Tile key={t.key} team={t} pop={fresh.has(t.key)} delay={(fresh.get(t.key) ?? 0) * 60} tv={tv} />
      ))}
      {more > 0 && (
        <li className={`${styles.ghost} inline-flex items-center ${tv ? "px-5 py-3" : "px-3 py-2"}`}>
          <Tag>{COPY.more(more)}</Tag>
        </li>
      )}
    </ul>
  );
}

/** Not paid yet (no slip): back to the pay page from the pinned card. */
function PayLink({ you }: { you: BoardYou }) {
  if (!you.payPending || !you.payHref) return null;
  return (
    <EditorialLink href={you.payHref} size="sm" tone="action" className="mt-2">
      {COPY.pay}
    </EditorialLink>
  );
}

/** Your team, pinned above the room: the name first, [คุณ] beside it. */
function YouTile({ team, you }: { team: LobbyTeam; you: BoardYou }) {
  return (
    <div className={`${styles.you} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <StyledTeamName name={team.name} style={team.style} className="block min-w-0" sizeStyle={{ fontSize: 30, lineHeight: 1.3 }} />
        <Tag tone="action" className="shrink-0 pt-2">
          {COPY.you}
        </Tag>
      </div>
      <PayLink you={you} />
    </div>
  );
}

/** Signed up, but no board name yet: nothing to show in the room. */
function YouNoName({ you }: { you: BoardYou }) {
  return (
    <div className={`${styles.you} px-4 py-3`}>
      <div className="flex items-baseline justify-between gap-3">
        <Body>{COPY.youNoName}</Body>
        <Tag tone="action" className="shrink-0">
          {COPY.you}
        </Tag>
      </div>
      <Body secondary>{COPY.youNoNameLead}</Body>
      <PayLink you={you} />
    </div>
  );
}

function EmptyRoom() {
  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-hidden="true">
        {[96, 132, 80].map((w) => (
          <li key={w} className={`${styles.ghost} h-[46px]`} style={{ width: w }} />
        ))}
      </ul>
      <H2 className="mt-6">{COPY.emptyTitle}</H2>
      <Body secondary className="mt-2">
        {COPY.empty}
      </Body>
    </div>
  );
}

/** Keeps the room in step: polling (or the demo's arrivals), the keys already seen, and which tiles pop. */
function useRoom(initial: LobbyPayload, poll: boolean, simulate: boolean, delayMinutes: number) {
  const [data, setData] = useState(initial);
  const [fresh, setFresh] = useState<Map<string, number>>(new Map());
  const [announce, setAnnounce] = useState("");
  const seen = useRef(new Set(initial.teams.map((t) => t.key)));
  const current = useRef(initial);

  // A new answer: keep it, and pop the teams this page hasn't seen (newest first, at most MAX_POPS).
  const take = useRef((next: LobbyPayload) => {
    const keys = arrivals(seen.current, next.teams);
    for (const t of next.teams) seen.current.add(t.key);
    current.current = next;
    setData(next);
    if (keys.length === 0) return;
    setFresh(new Map(keys.slice(0, MAX_POPS).map((k, i) => [k, i])));
    setAnnounce(COPY.arrived(keys.length, next.teams.length));
  });

  useEffect(() => {
    if (fresh.size === 0) return;
    const t = setTimeout(() => setFresh(new Map()), 2200);
    return () => clearTimeout(t);
  }, [fresh]);

  useEffect(() => {
    if (!poll) return;
    let stopped = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/hackathon/elemental/lobby${delayMinutes ? `?delay=${delayMinutes}` : ""}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as LobbyPayload;
        if (!stopped) take.current(next);
      } catch {
        // Keep the room as it is; the next tick tries again.
      }
    };
    const timer = setInterval(load, LOBBY_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, delayMinutes]);

  useEffect(() => {
    if (!simulate) return;
    let tick = 0;
    const timer = setInterval(() => {
      const coming = demoArrivals(tick);
      tick += 1;
      if (coming.length === 0) return;
      const cur = current.current;
      take.current({ ...cur, teams: [...coming, ...cur.teams], people: cur.people + coming.length * 2 });
    }, 3000);
    return () => clearInterval(timer);
  }, [simulate]);

  return { data, fresh, announce };
}

export function LobbyView({
  initial,
  poll,
  you: youProp,
  tv = false,
  simulate = false,
  signUpOpen = false,
  boardHref = "/hackathon/elemental/leaderboard",
  delayMinutes = 0,
}: {
  initial: LobbyPayload;
  poll: boolean;
  /** Demo: "your team" without the pay page's note. */
  you?: BoardYou | null;
  tv?: boolean;
  /** Demo only: teams walk in every few seconds. */
  simulate?: boolean;
  /** Sign-up is still open: visitors get "สมัคร →". */
  signUpOpen?: boolean;
  /** The projector's ?delay=: only names set at least this many minutes ago (the server filters; polling keeps it). */
  delayMinutes?: number;
  boardHref?: string;
}) {
  const { data, fresh, announce } = useRoom(initial, poll, simulate, delayMinutes);
  const [you, setYou] = useState<BoardYou | null>(youProp ?? null);
  useEffect(() => {
    if (youProp === undefined) setYou(readYou());
  }, [youProp]);

  const over = data.state === "over";
  const youTeam = you ? (data.teams.find((t) => t.key === you.key) ?? null) : null;
  const others = youTeam && !tv ? data.teams.filter((t) => t.key !== youTeam.key) : data.teams;
  const live = <p className="sr-only" aria-live="polite">{announce}</p>;

  let room: ReactNode;
  if (data.state === "soon") {
    room = (
      <div className="border-t pt-6" style={{ borderColor: v.rule }}>
        <H2>{COPY.soonTitle}</H2>
        <Body secondary className="mt-2">
          {COPY.soon}
        </Body>
        {!tv && (
          <EditorialLink href="/hackathon/elemental" size="sm" className="mt-4">
            {COPY.back}
          </EditorialLink>
        )}
      </div>
    );
  } else if (data.state === "unavailable") {
    room = (
      <div className="border-y py-5" style={{ borderColor: v.rule }} role="status">
        <Body>{COPY.unavailable}</Body>
      </div>
    );
  } else {
    room = (
      <>
        <Counts teams={data.teams.length} people={data.people} over={over} tv={tv} />
        {!tv && you && (youTeam || !you.named) && <div className="mt-8">{youTeam ? <YouTile team={youTeam} you={you} /> : <YouNoName you={you} />}</div>}
        <div className={tv ? "mt-10" : "mt-8"}>{data.teams.length === 0 ? <EmptyRoom /> : <Tiles teams={others} fresh={fresh} tv={tv} />}</div>
      </>
    );
  }

  if (tv) {
    // The projector: the sky and the room, full screen, no top bar or links.
    return (
      <main
        className={`${shell.surface} ${cinema.cinemaRoot} min-h-[100dvh]`}
        style={{ ...surfaceVars("ground"), backgroundColor: EL_GROUND.bg, color: EL_GROUND.text }}
      >
        <div className={cinema.filmGrain} aria-hidden="true" />
        <TvSky>
          <SkyTitle data={data} tv />
        </TvSky>
        <div className="mx-auto max-w-[1600px] px-10 pb-16 pt-10">
          {live}
          {room}
        </div>
      </main>
    );
  }

  const editHref = you?.editHref ?? you?.payHref ?? null;
  const bar =
    over || data.state === "unavailable" ? null : you && !you.named && editHref ? (
      <StickyBar>
        <PrimaryButton href={editHref} full arrow>
          {COPY.setName}
        </PrimaryButton>
      </StickyBar>
    ) : !you && signUpOpen ? (
      <StickyBar>
        <PrimaryButton href="/hackathon/join" full arrow>
          {COPY.signUp}
        </PrimaryButton>
      </StickyBar>
    ) : null;

  return (
    <Page
      surface="ground"
      back={you?.payHref ? { href: you.payHref } : undefined}
      sky={<SkyBand title={<SkyTitle data={data} tv={false} />} height={260} />}
      bar={bar}
    >
      {live}
      {room}
      {data.state !== "soon" && (
        <div className="mt-12 border-t pt-6" style={{ borderColor: v.rule }}>
          <Fine>{COPY.note}</Fine>
          <EditorialLink href={boardHref} size="sm" className="mt-2">
            {COPY.board}
          </EditorialLink>
        </div>
      )}
    </Page>
  );
}
