"use client";

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { lineHelp } from "./copy-shared";
import { MeterCard } from "./MeterCard";
import { meterHeadline } from "./meter-model";
import { Poster, ShareBar, usePosterShare } from "./PosterBlock";
import { Rules } from "./Rules";
import { SchoolPicker, type SchoolChoice } from "./SchoolPicker";
import { EditorialLink, Fine, H1, Page, PrimaryButton, schoolLabel, SkyBand, StickyBar, v } from "./ui";
import { usePollLink } from "./usePoll";

/**
 * A signed-up student's share page, on the landing's dark ground (merged
 * direction §8): the sky band with the school, then the MeterCard (devices),
 * then the poster (poster first before anything has happened), then the
 * team's line on the board. The one action, "ส่งใน LINE →", is pinned at the
 * bottom. Sharing earns looks only: team-name styles and the board (Big,
 * 2026-11-27). The view model is ShareLinkView (share-rules.ts).
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
  /** The team's line on the board (TeamLine), when the board is up. */
  teamRow?: ReactNode;
  /** "← หน้าของฉัน": the pay page. Demos pass the demo pay page in the matching state. */
  backHref?: string;
  demo?: boolean;
};

const EMPTY_METER = { devices: 0, phase: "open" as const };

/** Ink on the pale sky (the lead line's links read the surface's text colour). */
const ON_SKY = { "--el-text": EL.ink } as CSSProperties;

/** Open: the action. After close: the frozen count. */
function titleFor(link: ShareLinkView, open: boolean): string {
  return open ? COPY.titles.start : meterHeadline(link);
}

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
      {!changing && <MeterCard view={EMPTY_METER} code={code} preview />}
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

function StudentLink(props: Props & { link: ShareLinkView; onChange: () => void }) {
  const { token, link, state } = props;
  const backHref = props.backHref ?? `/hackathon/join/${token}`;
  const open = state === "open";
  const poster = usePosterShare(link.code, "student", props.posterVersion);
  // The page's phase wins (a link loaded just before close still reads as closed).
  const view: ShareLinkView = open ? link : { ...link, phase: "after-close" };
  const start = open && view.devices === 0 && view.paid === 0;

  const card = <MeterCard view={view} code={link.code} />;
  const posterBlock = open ? <Poster poster={poster} /> : null;
  // Nothing yet: the poster is the thing to do. Otherwise the numbers lead.
  const blocks = start ? [posterBlock, card] : [card, posterBlock];

  return (
    <Page
      surface="ground"
      back={{ href: backHref }}
      sky={
        <SkyBand
          title={<H1>{titleFor(view, open)}</H1>}
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
        {props.teamRow && <section className="border-t pt-6" style={{ borderColor: v.rule }}>{props.teamRow}</section>}
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

  return <StudentLink {...props} link={link} onChange={() => setChanging(true)} />;
}
