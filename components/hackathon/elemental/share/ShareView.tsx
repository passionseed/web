"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { STORY_PROOF_MIN_VIEWS, type StoryProofStatus } from "@/lib/hackathon/elemental/story-proof";
import type { TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

import { lineHelp } from "./copy-shared";
import { MeterCard } from "./MeterCard";
import { meterHeadline, meterModel, type MeterTeam } from "./meter-model";
import { Poster, ShareBar, usePosterShare } from "./PosterBlock";
import { Rules } from "./Rules";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { StoryShare } from "./StoryShare";
import { EditorialLink, Fine, H1, Page, PrimaryButton, schoolLabel, SkyBand, StickyBar, v } from "./ui";
import { usePollLink } from "./usePoll";
import { CompactTeamLine } from "../team-style/TeamLine";

/**
 * A signed-up student's share page, on the landing's dark ground. Sharing
 * earns looks only (Big, 2026-11-27): the team's devices unlock its name
 * styles (colours, fonts, effects), and a 200-view Instagram Story unlocks
 * them all at once. Top to bottom: the sky band says what's next ("อีก 6
 * เครื่อง ปลดล็อกฟอนต์"), the MeterCard, the poster (first, before anything has
 * happened), the "ลงสตอรี่ IG" block, then the team's line (custom ชื่อทีม,
 * กระดาน). Sharing in LINE groups is the pinned action. View model:
 * ShareLinkView (share-rules.ts) and the team's style data.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  pickTitle: "แชร์โปสเตอร์",
  changeTitle: "เปลี่ยนโรงเรียน",
  pickLabel: "โรงเรียนของคุณ",
  confirm: "ยืนยัน รับโปสเตอร์",
  confirmChange: "เปลี่ยนเป็นโรงเรียนนี้",
  saving: "กำลังบันทึก…",
  cancelChange: "ไม่เปลี่ยนแล้ว",
  change: "เปลี่ยน",
  titles: {
    start: "ส่งโปสเตอร์เข้ากลุ่ม LINE",
  },
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
    "เครื่องที่เปิดลิงก์ของทุกคนในทีมรวมกัน ครบ 10 ปลดล็อกสี 25 ฟอนต์ 50 เอฟเฟกต์",
    `สตอรี่ IG ครบ ${STORY_PROOF_MIN_VIEWS} วิว ปลดล็อกทุกแบบทันที ทีมงานสุ่มตรวจ ถ้าไม่ผ่านจะปิดคืน`,
    "นับคนจ่ายจากคนที่สแกน QR หรือกดลิงก์ของคุณ แล้วสมัครและจ่าย",
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
    `ตัวเลขอัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  ],
  closedTitle: "แชร์โปสเตอร์",
  closed: "ตอนนี้ยังไม่เปิด",
  afterClose: "ปิดรับสมัครแล้ว ลิงก์แชร์ปิดตามไปด้วย",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด",
  cancelled: "การสมัครนี้ถูกยกเลิก",
  back: "กลับหน้าของฉัน",
  schoolError: {
    code_taken: `สร้างลิงก์ไม่ได้ ${lineHelp}`,
    invalid: "ใช้ชื่อโรงเรียนนี้ไม่ได้ ลองพิมพ์ใหม่",
    closed: "ตอนนี้ปิดแล้ว",
  } as Record<string, string>,
  tryAgain: "ยังบันทึกไม่ได้ ลองอีกครั้ง",
};

type Props = {
  token: string;
  /** "after-close": read-only until the end of Demo Day. */
  state: "open" | "after-close" | "closed" | "cancelled";
  link: ShareLinkView | null;
  /** This sign-up's share code (its link's code once made): seeds the empty card before there's a link. */
  code: string;
  /** The school typed at sign-up, to start the search with. */
  startQuery: string;
  posterVersion: string;
  /** storyVersion() from share-poster.tsx: the 9:16 Story image's version. */
  storyVersion: string;
  /** The team's style data (devices toward the next style, Story unlock), when the board is up. */
  team?: TeamStyleCardData | null;
  /** The team's line on the board (TeamLine), when the board is up. */
  teamRow?: ReactNode;
  /** "← หน้าของฉัน": the pay page. Demos pass the demo pay page in the matching state. */
  backHref?: string;
  demo?: boolean;
};

const EMPTY_METER = { devices: 0, phase: "open" as const, storyProof: "none" as const };

/** Ink on the pale sky (the lead line's links read the surface's text colour). */
const ON_SKY = { "--el-text": EL.ink } as CSSProperties;

/** The team as the meter needs it. */
const meterTeam = (team?: TeamStyleCardData | null): MeterTeam | null =>
  team ? { devices: team.devices, solo: team.solo, storyUnlocked: team.storyUnlocked } : null;

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ fontSize: 14, lineHeight: "22px", color: v.error }}>
      {children}
    </p>
  );
}

/** Pick (or change) the school; the sticky bar saves it. */
function PickSchool({
  token,
  backHref,
  code,
  startQuery,
  changing,
  demo,
  onSaved,
  onCancel,
}: {
  token: string;
  backHref: string;
  code: string;
  startQuery: string;
  changing: boolean;
  demo?: boolean;
  onSaved: (link: ShareLinkView) => void;
  onCancel?: () => void;
}) {
  const [pick, setPick] = useState<SchoolChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        return onSaved({
          kind: "student",
          code,
          school: { name: pick.name, province: pick.province || null },
          canChangeSchool: true,
          devices: 0,
          paid: 0,
          phase: "open",
          storyProof: "none",
        });
      }
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("custom" in pick ? { customName: pick.name, province: pick.province || undefined } : { schoolKey: pick.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.link) return onSaved(data.link as ShareLinkView);
      setError(COPY.schoolError[data.error] ?? COPY.tryAgain);
    } catch {
      setError(COPY.tryAgain);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      surface="ground"
      back={{ href: backHref }}
      sky={<SkyBand title={<H1>{changing ? COPY.changeTitle : COPY.pickTitle}</H1>} height={200} />}
      bar={
        pick ? (
          <StickyBar>
            <PrimaryButton onClick={save} disabled={busy} full arrow={!busy}>
              {busy ? COPY.saving : changing ? COPY.confirmChange : COPY.confirm}
            </PrimaryButton>
          </StickyBar>
        ) : undefined
      }
    >
      {!changing && <MeterCard link={EMPTY_METER} code={code} preview />}
      <div className={changing ? "" : "mt-8"}>
        <SchoolPicker label={COPY.pickLabel} startQuery={startQuery} value={pick} onChange={setPick} />
      </div>
      {error && (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {onCancel && (
        <div className="mt-6">
          <EditorialLink size="sm" arrow={false} onClick={onCancel}>
            {COPY.cancelChange}
          </EditorialLink>
        </div>
      )}
    </Page>
  );
}

function StudentLink(props: Props & { link: ShareLinkView; onChange: () => void; onStory: (s: StoryProofStatus) => void }) {
  const { token, link, state, team, demo } = props;
  const backHref = props.backHref ?? `/hackathon/join/${token}`;
  const open = state === "open";
  const poster = usePosterShare(link.code, "student", props.posterVersion);
  // The page's phase wins (a link loaded just before close still reads as closed).
  const view: ShareLinkView = open ? link : { ...link, phase: "after-close" };
  const m = meterModel(view, meterTeam(team));
  const start = open && m.devices === 0;
  // Open, with the team's styles in play: say what's next. Without team data: the action. After close: the frozen count.
  const title = open && m.mode === "count" ? COPY.titles.start : meterHeadline(m);
  const editHref = team?.editable ? (team.editHref ?? `/hackathon/join/${token}/team`) : undefined;

  const card = <MeterCard link={view} team={meterTeam(team)} code={link.code} editHref={editHref} />;
  const posterBlock = open ? <Poster poster={poster} /> : null;
  // Nothing yet: the poster is the thing to do. Otherwise the numbers lead.
  const blocks = start ? [posterBlock, card] : [card, posterBlock];
  const story = open ? (
    <StoryShare
      token={token}
      code={link.code}
      storyVersion={props.storyVersion}
      status={view.storyProof}
      unlockedByDevices={m.mode === "team" && m.allUnlocked && !m.byStory}
      demo={demo}
      onStatus={props.onStory}
    />
  ) : null;

  return (
    <Page
      surface="ground"
      back={{ href: backHref }}
      sky={
        <SkyBand
          title={<H1>{title}</H1>}
          lead={
            <span style={ON_SKY}>
              {schoolLabel(link.school.name, link.school.province)}
              {open && link.canChangeSchool && (
                <>
                  {" "}
                  <EditorialLink size="sm" arrow={false} onClick={props.onChange} className="whitespace-nowrap px-1">
                    {COPY.change}
                  </EditorialLink>
                </>
              )}
            </span>
          }
          height={200}
        />
      }
      bar={open ? <ShareBar poster={poster} /> : undefined}
    >
      {!open && <Fine className="mb-6">{COPY.frozenNote}</Fine>}
      <div className="space-y-10">
        {blocks.map((b, i) => (b ? <div key={i}>{b}</div> : null))}
        {story}
        {/* Compact: the meter above already says the team's progress and links to the editor. */}
        {props.teamRow && (
          <section className="border-t pt-6" style={{ borderColor: v.rule }}>
            <CompactTeamLine>{props.teamRow}</CompactTeamLine>
          </section>
        )}
      </div>
      <Rules rules={COPY.rules} />
    </Page>
  );
}

export function ShareView(props: Props) {
  const { token, state, demo } = props;
  const backHref = props.backHref ?? `/hackathon/join/${token}`;
  const [link, setLink] = useState<ShareLinkView | null>(props.link);
  const [changing, setChanging] = useState(false);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  const live = state === "open" || state === "after-close";
  usePollLink(link && !demo && live ? `/api/hackathon/elemental/${token}/share` : null, onLink);

  if (!live || (state === "after-close" && !link)) {
    return (
      <Page
        surface="ground"
        back={{ href: backHref }}
        sky={<SkyBand title={<H1>{COPY.closedTitle}</H1>} lead={state === "cancelled" ? COPY.cancelled : state === "after-close" ? COPY.afterClose : COPY.closed} />}
      >
        <EditorialLink href={backHref}>{COPY.back}</EditorialLink>
      </Page>
    );
  }

  if (!link || changing) {
    return (
      <PickSchool
        token={token}
        backHref={backHref}
        code={link?.code ?? props.code}
        startQuery={changing ? "" : props.startQuery}
        changing={changing}
        demo={demo}
        onSaved={(l) => {
          setLink(l);
          setChanging(false);
        }}
        onCancel={changing ? () => setChanging(false) : undefined}
      />
    );
  }

  return <StudentLink {...props} link={link} onChange={() => setChanging(true)} onStory={(storyProof) => setLink({ ...link, storyProof })} />;
}
