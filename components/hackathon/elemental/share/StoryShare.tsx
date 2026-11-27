"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { linkUrl } from "@/lib/hackathon/elemental/share";
import { prepareSlip } from "@/lib/hackathon/elemental/slip-image";
import { STORY_PROOF_MIN_VIEWS, type StoryProofStatus } from "@/lib/hackathon/elemental/story-proof";

import { lineHelp } from "./copy-shared";
import { Body, Fine, H2, ItemTitle, PixelIcon, SecondaryButton, Tag, v } from "./ui";

/**
 * The second way to share (Big, 2026-11-27): post the 9:16 poster as an
 * Instagram Story, put the link in IG's link sticker, and once it has
 * STORY_PROOF_MIN_VIEWS views, upload a screenshot. That unlocks every
 * name style for the whole team at once (no staff check; staff can revoke).
 * The screenshot should show only the view count: IG's viewer list is other
 * people's names.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  heading: "ลงสตอรี่ IG",
  lead: `ลงโปสเตอร์ในสตอรี่ ครบ ${STORY_PROOF_MIN_VIEWS} วิว ส่งภาพหน้าจอ ปลดล็อก custom ชื่อทีมทุกแบบให้ทั้งทีมทันที`,
  leadDone: "ทีมปลดล็อกครบแล้ว ลงสตอรี่ช่วยชวนเพื่อนมาสมัครได้อีก",
  storyAlt: "โปสเตอร์ขนาดสตอรี่ IG",
  step1: "บันทึกรูปสตอรี่",
  save: "บันทึกรูป",
  step2: "ใส่ลิงก์ด้วยสติกเกอร์ลิงก์",
  step2Hint: "แปะในกรอบ [แปะลิงก์ตรงนี้] บนรูป",
  copy: "คัดลอกลิงก์",
  copied: "คัดลอกแล้ว",
  step3: `ครบ ${STORY_PROOF_MIN_VIEWS} วิว ส่งภาพหน้าจอ`,
  step3Hint: "ครอปให้เห็นแค่ตัวเลขวิว รายชื่อคนดูเป็นชื่อของคนอื่น ไม่ต้องให้ติดมา",
  upload: "ส่งภาพหน้าจอ",
  uploadAgain: "ส่งภาพใหม่",
  uploading: "กำลังส่ง…",
  unlocked: "ปลดล็อกทุกแบบให้ทีมแล้ว",
  revoked: "ทีมงานตรวจแล้วไม่ผ่าน ส่งใหม่ได้",
  errors: {
    no_file: "เลือกรูปก่อน",
    file_type: "ใช้รูป JPG, PNG หรือ WEBP",
    file_size: "รูปใหญ่เกิน 4 MB ครอปให้เล็กลงแล้วลองใหม่",
    unreadable: "เปิดรูปนี้ไม่ได้ ใช้ภาพหน้าจอจากมือถือ",
    closed: "ตอนนี้ปิดรับแล้ว",
    cancelled: "การสมัครนี้ถูกยกเลิก",
    rate_limited: "ส่งถี่เกินไป ลองใหม่ในอีก 1 ชั่วโมง",
    other: `ยังส่งไม่ได้ ลองอีกครั้ง หรือ${lineHelp}`,
  } as Record<string, string>,
};

/** Fetch the Story image once, so iOS can open the share sheet ("Save Image" goes to Photos) straight from the tap. */
function useStoryFile(src: string, name: string) {
  const [file, setFile] = useState<File | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!live || !b) return;
        const f = new File([b], name, { type: b.type || "image/jpeg" });
        setFile(f);
        setCanShare(!!navigator.canShare?.({ files: [f] }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, name]);
  return { file, canShare };
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="border-t py-5" style={{ borderColor: v.rule }}>
      <ItemTitle as="h3" className="flex items-baseline gap-2.5">
        <Tag tone="action">{n}</Tag>
        {title}
      </ItemTitle>
      <div className="mt-3 space-y-2">{children}</div>
    </li>
  );
}

export function StoryShare({
  token,
  code,
  storyVersion,
  status,
  unlockedByDevices,
  demo,
  onStatus,
}: {
  token: string;
  code: string;
  /** storyVersion() from share-poster.tsx, for ?v= on the Story image. */
  storyVersion: string;
  status: StoryProofStatus;
  /** The team's devices already opened every style: no screenshot needed. */
  unlockedByDevices: boolean;
  demo?: boolean;
  onStatus: (status: StoryProofStatus) => void;
}) {
  const src = `/api/hackathon/elemental/share/poster/${code}?v=${storyVersion}&format=story`;
  const name = `elemental-${code}-story.jpg`;
  const story = useStoryFile(src, name);
  const url = linkUrl("student", code);
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const upload = async (picked: File | undefined) => {
    if (!picked || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 1200));
        onStatus("unlocked");
        return;
      }
      const file = await prepareSlip(picked);
      if (!file) return setError(COPY.errors.unreadable);
      const form = new FormData();
      form.append("proof", file);
      const res = await fetch(`/api/hackathon/elemental/${token}/story-proof`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { storyProof?: StoryProofStatus; error?: string };
      if (res.ok && data.storyProof === "unlocked") return onStatus("unlocked");
      setError(COPY.errors[data.error ?? ""] ?? COPY.errors.other);
    } catch {
      setError(COPY.errors.other);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const saveImage = () => {
    if (story.canShare && story.file) {
      navigator.share({ files: [story.file] }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = `${src}&download=1`;
    a.download = name;
    a.click();
  };

  const live = status === "unlocked";
  let proof: ReactNode;
  if (live) {
    proof = (
      <div className="space-y-2" role="status">
        {/* "custom ชื่อทีม" is already on the meter and the team line: no third one here. */}
        <p className="flex items-center gap-2">
          <span style={{ color: v.action }}>
            <PixelIcon name="check" />
          </span>
          <Body as="span">{COPY.unlocked}</Body>
        </p>
      </div>
    );
  } else {
    proof = (
      <>
        {status === "revoked" && !error && (
          <p role="status" className="py-1 pl-3" style={{ boxShadow: `inset 2px 0 0 ${v.error}`, color: v.error, fontSize: 14, lineHeight: "22px" }}>
            {COPY.revoked}
          </p>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <SecondaryButton icon={busy ? undefined : "share"} full disabled={busy} aria-busy={busy} onClick={() => input.current?.click()}>
          {busy ? COPY.uploading : status === "revoked" ? COPY.uploadAgain : COPY.upload}
        </SecondaryButton>
        <Fine>{COPY.step3Hint}</Fine>
        {error && (
          <p role="alert" className="py-1 pl-3" style={{ boxShadow: `inset 2px 0 0 ${v.error}`, color: v.error, fontSize: 14, lineHeight: "22px" }}>
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="story-heading" className="border-t pt-6" style={{ borderColor: v.rule }}>
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- the generated Story image, cached by its version */}
        <img src={src} alt={COPY.storyAlt} width={1080} height={1920} loading="lazy" className="h-40 w-[90px] shrink-0 rounded-[2px] object-cover" style={{ backgroundColor: EL.char }} />
        <div className="min-w-0">
          <H2 id="story-heading">{COPY.heading}</H2>
          <Body secondary className="mt-2">
            {unlockedByDevices || live ? COPY.leadDone : COPY.lead}
          </Body>
        </div>
      </div>
      <ol className="mt-5 border-b" style={{ borderColor: v.rule }}>
        <Step n={1} title={COPY.step1}>
          <SecondaryButton icon="download" full onClick={saveImage}>
            {COPY.save}
          </SecondaryButton>
        </Step>
        <Step n={2} title={COPY.step2}>
          <SecondaryButton
            icon={copied ? "check" : "copy"}
            full
            onClick={async () => {
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? COPY.copied : COPY.copy}
          </SecondaryButton>
          <Fine>{COPY.step2Hint}</Fine>
        </Step>
        {(!unlockedByDevices || live) && (
          <Step n={3} title={COPY.step3}>
            {proof}
          </Step>
        )}
      </ol>
    </section>
  );
}
