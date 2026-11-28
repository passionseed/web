"use client";

import { useCallback, useEffect, useState } from "react";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { DeviceCount } from "./MeterCard";
import { CopyIconButton, lineShareHref, Poster, ShareBar, usePosterShare } from "./PosterBlock";
import { Rules } from "./Rules";
import { EditorialLink, Fine, H1, Page, PrimaryButton, schoolLabel, SkyBand, StickyBar, Tag } from "./ui";
import { usePollLink } from "./usePoll";

/** "passionseed.org/hackathon/elemental?src=t-7e4c0b2a" → the path and "?src=…", so a line break never splits the code. */
const splitLink = (url: string): string[] => {
  const q = url.indexOf("?");
  return q < 0 ? [url] : [url.slice(0, q), url.slice(q)];
};

/**
 * A teacher's private page (/hackathon/elemental/teacher/<token>), on the
 * dark ground like the student's: their poster with its QR code, the link as
 * text, and how many devices opened it. Nothing else: no rewards (Big,
 * 2026-11-27). Right after the link
 * is made, one screen asks them to keep the page in their own LINE first
 * (LINE's browser has no bookmarks). After sign-up closes it stays up
 * read-only until the end of Demo Day.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  keepTitle: "เก็บหน้านี้ไว้ใน LINE",
  keepLead: "หน้านี้เป็นของคุณครูคนเดียว ส่งเข้า LINE ตัวเองไว้ จะได้กลับมาดูตัวเลขได้",
  keepNote: "ลิงก์หน้านี้เป็นของคุณครูคนเดียว อย่าส่งต่อ",
  toLine: "ส่งเข้า LINE ตัวเอง",
  skip: "ข้าม",
  copyPage: "คัดลอกลิงก์หน้านี้",
  keepLater: "เก็บหน้านี้ไว้ใน LINE",
  lineText: (url: string) => `ลิงก์ของคุณครู ${ELEMENTAL.edition} Hackathon (ส่วนตัว อย่าส่งต่อ): ${url}`,
  titles: {
    start: "ส่งลิงก์ให้นักเรียนเลย",
  },
  barLine: "ส่งให้นักเรียนใน LINE",
  frozenNote: "ปิดรับสมัครแล้ว ตัวเลขหยุดนับตอนปิด หน้านี้เปิดดูได้ถึงวัน Demo Day",
  closedHeadline: (n: number) => `ปิดนับแล้ว · ${n}\u00a0เครื่อง`,
  linkLabel: "ลิงก์ของคุณครู",
  rules: [
    "นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
    `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
    `แชร์ได้ถึงวันปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
    `ตัวเลขอัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  ],
  closedTitle: "ลิงก์ของคุณครู",
  closed: "ตอนนี้ปิดแล้ว",
};

/** Open: the action. After close: the frozen count. */
function titleFor(link: ShareLinkView, open: boolean): string {
  return open ? COPY.titles.start : COPY.closedHeadline(link.devices);
}

/** This page's own address (no ?new=1), once on the client. */
function usePageUrl(): string {
  const [href, setHref] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setHref(`${window.location.origin}${window.location.pathname}`), 0);
    return () => clearTimeout(t);
  }, []);
  return href;
}

/** Right after the link is made: one screen, one action. Keep the page in their own LINE, or skip. */
function KeepScreen({ onDone }: { onDone: () => void }) {
  const href = usePageUrl();
  return (
    <Page
      surface="ground"
      sky={<SkyBand title={<H1>{COPY.keepTitle}</H1>} lead={COPY.keepLead} />}
      bar={
        <StickyBar>
          {href ? (
            <PrimaryButton
              href={lineShareHref(COPY.lineText(href))}
              external
              icon="chat"
              full
              className="min-w-0 flex-1"
              // LINE opens in its own picker; when they come back, the page is waiting.
              onClick={() => setTimeout(onDone, 400)}
            >
              {COPY.toLine}
            </PrimaryButton>
          ) : (
            <PrimaryButton icon="chat" full className="min-w-0 flex-1" disabled>
              {COPY.toLine}
            </PrimaryButton>
          )}
          <CopyIconButton text={href} label={COPY.copyPage} />
        </StickyBar>
      }
      wordmark={false}
    >
      <Fine>{COPY.keepNote}</Fine>
      <div className="mt-6">
        <EditorialLink size="sm" onClick={onDone}>
          {COPY.skip}
        </EditorialLink>
      </div>
    </Page>
  );
}

function TeacherLink({ phase, link, posterVersion }: { phase: "open" | "after-close"; link: ShareLinkView; posterVersion: string }) {
  const open = phase === "open";
  const poster = usePosterShare(link.code, "teacher", posterVersion);
  const href = usePageUrl();
  // The page's phase wins (a link loaded just before close still reads as closed).
  const view: ShareLinkView = open ? link : { ...link, phase: "after-close" };
  // The poster (its QR code), the link as text for slides and chats, and the count.
  const posterBlock = open ? (
    <div className="space-y-4">
      <Poster poster={poster} />
      <div>
        <Tag>{COPY.linkLabel}</Tag>
        {/* Breaks only before "?src=", never inside the code. */}
        <p className="mt-1" style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 13, lineHeight: "20px" }}>
          {splitLink(poster.url.replace(/^https:\/\/www\./, "")).map((part, i) =>
            i === 0 ? (
              <span key={i}>{part}</span>
            ) : (
              <span key={i}>
                <wbr />
                <span className="whitespace-nowrap">{part}</span>
              </span>
            ),
          )}
        </p>
      </div>
    </div>
  ) : null;
  const count = <DeviceCount link={view} code={link.code} />;
  // Nothing yet: the poster is the thing to do. Otherwise the count leads.
  const blocks = open && view.devices === 0 ? [posterBlock, count] : [count, posterBlock];

  return (
    <Page
      surface="ground"
      sky={<SkyBand title={<H1>{titleFor(view, open)}</H1>} lead={schoolLabel(link.school.name, link.school.province)} height={200} />}
      bar={open ? <ShareBar poster={poster} label={COPY.barLine} /> : undefined}
    >
      {!open && <Fine className="mb-6">{COPY.frozenNote}</Fine>}
      <div className="space-y-10">{blocks.map((b, i) => (b ? <div key={i}>{b}</div> : null))}</div>
      <Rules rules={COPY.rules} />
      <div className="mt-8">
        {href && (
          <EditorialLink size="sm" href={lineShareHref(COPY.lineText(href))} external>
            {COPY.keepLater}
          </EditorialLink>
        )}
      </div>
    </Page>
  );
}

export function TeacherView({
  token,
  phase,
  link: initial,
  posterVersion,
  demo,
  fresh = false,
}: {
  token: string;
  phase: "open" | "after-close" | "off";
  link: ShareLinkView | null;
  posterVersion: string;
  demo?: boolean;
  /** Just made (?new=1): keeping the page comes first. */
  fresh?: boolean;
}) {
  const [link, setLink] = useState<ShareLinkView | null>(initial);
  const [keeping, setKeeping] = useState(fresh);
  const onLink = useCallback((l: ShareLinkView) => setLink(l), []);
  usePollLink(link && phase !== "off" && !demo ? `/api/hackathon/elemental/teacher/${token}` : null, onLink);

  if (phase === "off" || !link) {
    return (
      <Page surface="ground" sky={<SkyBand title={<H1>{COPY.closedTitle}</H1>} lead={COPY.closed} />}>
        <EditorialLink href="/hackathon/elemental">{ELEMENTAL.edition} Hackathon</EditorialLink>
      </Page>
    );
  }
  if (keeping) {
    return (
      <KeepScreen
        onDone={() => {
          // Done with ?new=1: a refresh opens the page itself.
          window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/([?&])new=1(&|$)/, "$1").replace(/[?&]$/, ""));
          window.scrollTo(0, 0);
          setKeeping(false);
        }}
      />
    );
  }
  return <TeacherLink phase={phase} link={link} posterVersion={posterVersion} />;
}
