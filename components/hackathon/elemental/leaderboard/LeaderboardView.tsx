"use client";

import { useEffect, useState } from "react";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { STYLE_PARTS, STYLE_PART_TH, TEAM_STYLE_TIERS } from "@/lib/hackathon/elemental/team-style";
import { rankBoard, type LeaderboardPayload, type PublicBoardEntry } from "@/lib/hackathon/elemental/team-style-board";
import { BOARD_POLL_MS, BOARD_YOU_KEY, type BoardYou } from "@/lib/hackathon/elemental/team-style-phase";

import { Body, EditorialLink, FactStrip, Fine, H1, H2, Page, PrimaryButton, SkyBand, StickyBar, Tag } from "../share/ui";
import { BoardRow, RestHeader } from "./BoardRow";

/**
 * The public team board, on the landing's dark ground: the sky band and its
 * title, a Space Mono update stamp, then one row per team with 1px rules and
 * Trirong numbers (the first three larger, #1 in flameCore). Board names and
 * school names and two numbers only: never a person's name. Opened from a pay
 * page in the same tab, it marks that team's row (a 2px flameCore rule and
 * [ทีมคุณ]) and pins it above the sticky bar while it's further down. While
 * live and visible it asks for new numbers every BOARD_POLL_MS; changed
 * numbers roll in. After sign-up close it shows the frozen final standings.
 * Needs trirong and teamStyleFonts on a wrapper.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "กระดานทีม",
  lead: "ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด",
  explain: "นับจากลิงก์แชร์ของทุกคนในทีม เรียงตามที่นั่งที่จ่ายแล้ว ถ้าเท่ากันดูจำนวนเครื่องที่เปิดลิงก์",
  updated: (time: string) => `อัปเดต ${time}`,
  final: (when: string) => `ผลสุดท้าย · นับถึง ${when}`,
  youOff: "ทีมคุณยังไม่ขึ้นกระดาน",
  youNeedName: "ตั้งชื่อบนกระดานก่อน แล้วทีมจะขึ้นเมื่อมีคนเปิดลิงก์แชร์เครื่องแรก",
  youNeedDevices: (n: number) => `อีก ${n} เครื่องที่เปิดลิงก์แชร์ ทีมคุณก็ขึ้นกระดาน`,
  youSetName: "ตั้งชื่อทีม",
  shareMine: "ส่งลิงก์ของฉัน",
  signUp: "สมัคร",
  emptyTitle: "ยังไม่มีทีมบนกระดาน",
  empty: "ทีมแรกที่ตั้งชื่อและมีคนเปิดลิงก์แชร์ ขึ้นกระดานทันที",
  emptyFinal: "ไม่มีทีมบนกระดาน",
  soonTitle: "เปิดเร็วๆ นี้",
  soon: "กระดานนี้จะโชว์ทีมที่ชวนเพื่อนมาสมัครได้มากที่สุด นับจากลิงก์แชร์ของทุกคนในทีม",
  unavailable: "โหลดกระดานไม่ได้ตอนนี้ หน้านี้จะลองใหม่เอง",
  joinTitle: "อยากให้ทีมขึ้นกระดาน",
  join: "ตั้งชื่อทีมบนกระดานที่หน้าของฉัน แล้วแชร์ลิงก์ของตัวเอง ทุกเครื่องที่เปิดลิงก์นับให้ทีม ยิ่งมากยิ่งแต่งชื่อทีมได้มาก",
  joinYou: "แชร์ลิงก์ของตัวเองต่อ ทุกเครื่องที่เปิดลิงก์นับให้ทีม ยิ่งมากยิ่งแต่งชื่อทีมได้มาก",
  unlockTag: (n: number) => `${n} เครื่อง`,
  joinNote: "เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  finalNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับ ทีมงานซ่อนชื่อที่ไม่เหมาะสมได้",
  back: `หน้า ${ELEMENTAL.edition} Hackathon`,
  live: (change: string) => `ทีมคุณ ${change}`,
  liveDevices: (d: number, total: number) => `เพิ่ม ${d} เครื่อง รวม ${total}`,
  livePaid: (d: number, total: number) => `จ่ายเพิ่ม ${d} ที่ รวม ${total}`,
};

const bangkok = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...opts }).format(new Date(iso));

/** The pay page's note in this tab, if any. */
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
        }
      : null;
  } catch {
    return null;
  }
}

/** Demo only: a few devices (and now and then a paid seat) arrive, re-ranked like the server would. */
function simulateTick(teams: PublicBoardEntry[], n: number): PublicBoardEntry[] {
  const bumped = teams.map((t, i) => {
    if ((i * 7 + n * 3) % 5 !== 0) return t;
    const paid = (i + n) % 7 === 0 ? t.paid + 1 : t.paid;
    return { ...t, devices: t.devices + 1 + ((i + n) % 3), paid };
  });
  return rankBoard(bumped.map((t) => ({ ...t, id: t.key, hidden: false })));
}

export function LeaderboardView({
  initial,
  poll,
  you: youProp,
  simulate = false,
}: {
  initial: LeaderboardPayload;
  poll: boolean;
  you?: BoardYou | null;
  /** Demo only: numbers change every few seconds, to see the motion. */
  simulate?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [you, setYou] = useState<BoardYou | null>(youProp ?? null);
  const [announce, setAnnounce] = useState("");

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

  useEffect(() => {
    if (!simulate) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setData((d) => ({ ...d, teams: simulateTick(d.teams, n), updatedAt: new Date().toISOString() }));
    }, 3500);
    return () => clearInterval(timer);
  }, [simulate]);

  const youKey = you?.key ?? null;
  const youEntry = youKey ? (data.teams.find((t) => t.key === youKey) ?? null) : null;

  // Screen readers hear only your team's change, in one line (not the whole board on every poll).
  const [lastYou, setLastYou] = useState<PublicBoardEntry | null>(youEntry);
  if (youEntry !== lastYou && (youEntry?.devices !== lastYou?.devices || youEntry?.paid !== lastYou?.paid)) {
    if (youEntry && lastYou) {
      const parts = [
        youEntry.paid > lastYou.paid ? COPY.livePaid(youEntry.paid - lastYou.paid, youEntry.paid) : null,
        youEntry.devices > lastYou.devices ? COPY.liveDevices(youEntry.devices - lastYou.devices, youEntry.devices) : null,
      ].filter(Boolean);
      if (parts.length) setAnnounce(COPY.live(parts.join(" ")));
    }
    setLastYou(youEntry);
  }

  const final = data.state === "final";
  const listed = data.state === "live" || data.state === "final";
  const top = data.teams.filter((t) => t.rank <= 3);
  const rest = data.teams.filter((t) => t.rank > 3);

  const bar =
    final || data.state === "unavailable" ? null : you?.shareHref && data.state === "live" ? (
      <StickyBar>
        <PrimaryButton href={you.shareHref} icon="share" full>
          {COPY.shareMine}
        </PrimaryButton>
      </StickyBar>
    ) : !you ? (
      <StickyBar>
        <PrimaryButton href="/hackathon/join" full arrow>
          {COPY.signUp}
        </PrimaryButton>
      </StickyBar>
    ) : null;

  return (
    <Page
      surface="ground"
      // Opened from a pay page in this tab: "← หน้าของฉัน" goes back to it (its own URL, from sessionStorage, never this page's).
      back={you?.payHref ? { href: you.payHref } : undefined}
      sky={<SkyBand title={<H1 board>{COPY.title}</H1>} lead={COPY.lead} />}
      bar={bar}
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {data.state === "soon" ? (
        <Soon />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {final ? (
              <Tag tone="action">
                <span suppressHydrationWarning>{COPY.final(bangkok(data.countedUntil, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span>
              </Tag>
            ) : data.state === "live" ? (
              <Tag>
                <span suppressHydrationWarning>{COPY.updated(bangkok(data.updatedAt, { hour: "2-digit", minute: "2-digit" }))}</span>
              </Tag>
            ) : null}
          </div>

          {you && !youEntry && data.state !== "unavailable" && <YouOffBoard you={you} final={final} />}

          {data.state === "unavailable" ? (
            <div className="mt-8 border-y py-5" style={{ borderColor: "var(--el-rule)" }} role="status">
              <Body>{COPY.unavailable}</Body>
            </div>
          ) : listed && data.teams.length === 0 ? (
            <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--el-rule)" }}>
              <H2>{final ? COPY.emptyFinal : COPY.emptyTitle}</H2>
              {!final && <Body secondary className="mt-2">{COPY.empty}</Body>}
            </div>
          ) : (
            <ol className="-mx-3 mt-8 border-t sm:-mx-4" style={{ borderColor: "var(--el-rule)" }} aria-label={COPY.title}>
              {top.map((t) => (
                <BoardRow key={t.key} entry={t} you={t.key === youKey} pinned />
              ))}
              {rest.length > 0 && <RestHeader />}
              {rest.map((t) => (
                <BoardRow key={t.key} entry={t} you={t.key === youKey} pinned />
              ))}
            </ol>
          )}

          {final ? (
            <div className="mt-10 border-t pt-6" style={{ borderColor: "var(--el-rule)" }}>
              <Body secondary>{COPY.explain}</Body>
              <Fine className="mt-2">{COPY.finalNote}</Fine>
            </div>
          ) : (
            data.state === "live" && <HowToJoin you={you} />
          )}
        </>
      )}
    </Page>
  );
}

/** Opened from a pay page whose team isn't listed yet: what's missing, and where to fix it. */
function YouOffBoard({ you, final }: { you: BoardYou; final: boolean }) {
  const needName = !you.named;
  const needDevices = !needName && you.devices < 1;
  const editHref = you.editHref ?? you.payHref;
  return (
    <div className="mt-8 py-4 pl-4 pr-3" style={{ boxShadow: "inset 2px 0 0 var(--el-action)", backgroundColor: "#121311" }}>
      <div className="flex items-baseline gap-2">
        <Tag tone="action">ทีมคุณ</Tag>
        <Body as="span">{COPY.youOff}</Body>
      </div>
      {(needName || needDevices) && (
        <Body secondary className="mt-1">
          {needName ? COPY.youNeedName : COPY.youNeedDevices(1 - you.devices)}
        </Body>
      )}
      {needName && editHref && !final && (
        <EditorialLink href={editHref} size="md" tone="action" className="mt-3">
          {COPY.youSetName}
        </EditorialLink>
      )}
    </div>
  );
}

/** Live, at the bottom: how a team gets on, what its devices unlock (the same tiers as the editor) and how the board is ordered. */
function HowToJoin({ you }: { you: BoardYou | null }) {
  return (
    <section className="mt-14 border-t pt-8" style={{ borderColor: "var(--el-rule)" }}>
      <H2>{COPY.joinTitle}</H2>
      <Body className="mt-3">{you?.shareHref ? COPY.joinYou : COPY.join}</Body>
      <FactStrip className="mt-6" facts={STYLE_PARTS.map((part) => ({ tag: COPY.unlockTag(TEAM_STYLE_TIERS[part]), value: STYLE_PART_TH[part] }))} />
      <Body secondary className="mt-4">
        {COPY.explain}
      </Body>
      <Fine className="mt-2">{COPY.joinNote}</Fine>
    </section>
  );
}

function Soon() {
  return (
    <div className="border-y py-6" style={{ borderColor: "var(--el-rule)" }}>
      <H2>{COPY.soonTitle}</H2>
      <Body secondary className="mt-2">
        {COPY.soon}
      </Body>
      <EditorialLink href="/hackathon/elemental" size="md" className="mt-4">
        {COPY.back}
      </EditorialLink>
    </div>
  );
}
