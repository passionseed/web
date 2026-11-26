"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { SHARE, SHARE_DEMO_CODE } from "@/lib/hackathon/elemental/share";

/**
 * The share page: pick your school, get your own poster, post it in the
 * school's LINE group, send the screenshot. One free seat per school, first
 * 30 (company-brain decisions/log.md, 2026-11-26).
 * Thai copy: Claude's placeholder until Angpao writes it.
 */

export type ShareClaimView = {
  code: string;
  schoolName: string;
  province: string | null;
  status: "held" | "sent" | "won";
  heldUntil: string;
};

type School = { key: string; name: string; province: string; taken: boolean };
type Choice = { key: string; name: string; province: string } | { custom: true; name: string; province: string };

type Props = {
  token: string;
  /** "open": can share. Otherwise why not. */
  state: "open" | "closed" | "paid";
  claim: ShareClaimView | null;
  seatsLeft: number;
  /** The school typed at sign-up, to start the search with. */
  startQuery: string;
  posterVersion: string;
  demo?: boolean;
};

const primary = "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold disabled:opacity-50";
const filled = { backgroundColor: EL.flame, color: EL.flameWhite };
const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };
const line = "rgba(29,33,31,0.2)";

const schoolLabel = (name: string, province?: string | null) => `โรงเรียน${name}${province ? ` · ${province}` : ""}`;
const bangkokTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.1 }}>
      {children}
    </h1>
  );
}

function BackLink({ token }: { token: string }) {
  return (
    <Link href={`/hackathon/join/${token}`} className="mt-10 block text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
      กลับไปหน้าที่นั่งของฉัน
    </Link>
  );
}

function Rules({ seatsLeft }: { seatsLeft: number }) {
  return (
    <ul className="mt-5 space-y-1.5 text-base" style={{ color: EL.inkSoft }}>
      <li>· กลุ่มทั้งโรงเรียนหรือทั้งระดับชั้น สมาชิก {SHARE.minMembers} คนขึ้นไป</li>
      <li>· โรงเรียนละ 1 คน ใครเลือกโรงเรียนก่อนได้ก่อน</li>
      <li>
        · {SHARE.seats} ที่เท่านั้น{" "}
        <span style={{ color: EL.ink, fontWeight: 600 }}>เหลือ {seatsLeft} ที่</span>
      </li>
      <li>· เลือกแล้วมีเวลาโพสต์ {SHARE.holdHours} ชั่วโมง</li>
    </ul>
  );
}

/** Step 1: search the open-data school list, or type the name if it's missing. */
function SchoolPicker({ token, startQuery, seatsLeft: initialLeft, demo, onClaimed }: Pick<Props, "token" | "startQuery" | "seatsLeft" | "demo"> & { onClaimed: (c: ShareClaimView) => void }) {
  const [query, setQuery] = useState(startQuery);
  const [schools, setSchools] = useState<School[] | null>(null);
  const [left, setLeft] = useState(initialLeft);
  const [pick, setPick] = useState<Choice | null>(null);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customProvince, setCustomProvince] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (custom) return;
    const q = query.trim();
    if (q.length < 2) {
      setSchools(null);
      return;
    }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hackathon/elemental/${token}/share/schools?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { schools: School[]; seatsLeft: number };
        if (n !== seq.current) return;
        setSchools(data.schools);
        setLeft(data.seatsLeft);
      } catch {
        if (n === seq.current) setSchools([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, custom, token]);

  const confirm = async () => {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        onClaimed({ code: SHARE_DEMO_CODE, schoolName: pick.name, province: pick.province || null, status: "held", heldUntil: new Date(Date.now() + SHARE.holdHours * 3600_000).toISOString() });
        return;
      }
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("custom" in pick ? { customName: pick.name, province: pick.province || undefined } : { schoolKey: pick.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return onClaimed(data.claim as ShareClaimView);
      setError(
        data.error === "taken"
          ? "มีคนเลือกโรงเรียนนี้ไปแล้ว"
          : data.error === "full"
            ? `ที่นั่งฟรีครบ ${SHARE.seats} ที่แล้ว`
            : data.error === "already"
              ? "เลือกโรงเรียนไปแล้ว รีเฟรชหน้านี้"
              : "ยังเลือกไม่ได้ ลองอีกครั้ง",
      );
      if (data.error === "taken") setPick(null);
    } catch {
      setError("ยังเลือกไม่ได้ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  if (left <= 0) {
    return <p className="mt-8 text-lg">ที่นั่งฟรีครบ {SHARE.seats} ที่แล้ว ขอบคุณที่ช่วยแชร์</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      <Rules seatsLeft={left} />
      <h2 className="pt-4 text-xl font-semibold">1. เลือกโรงเรียน</h2>
      {!custom ? (
        <>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPick(null);
            }}
            placeholder="พิมพ์ชื่อโรงเรียน"
            aria-label="ชื่อโรงเรียน"
            className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
            style={{ borderColor: line, color: EL.ink }}
          />
          {schools && schools.length === 0 && <p style={{ color: EL.inkSoft }}>ไม่เจอในรายชื่อ ลองพิมพ์สั้นลง หรือพิมพ์ชื่อเองด้านล่าง</p>}
          {schools && schools.length > 0 && (
            <ul className="space-y-2" role="radiogroup" aria-label="โรงเรียน">
              {schools.map((s) => {
                const on = pick && !("custom" in pick) && pick.key === s.key;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!!on}
                      disabled={s.taken}
                      onClick={() => setPick({ key: s.key, name: s.name, province: s.province })}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left disabled:cursor-not-allowed"
                      style={{ borderColor: on ? EL.flame : line, backgroundColor: on ? "rgba(236,100,36,0.08)" : "white", color: s.taken ? EL.inkSoft : EL.ink }}
                    >
                      <span>
                        โรงเรียน{s.name}
                        <span className="block text-sm" style={{ color: EL.inkSoft }}>
                          {s.province}
                        </span>
                      </span>
                      {s.taken && <span className="shrink-0 text-sm">มีคนเลือกแล้ว</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => { setCustom(true); setPick(null); }} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
            ไม่มีโรงเรียนของฉันในรายชื่อ
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <input
            value={customName}
            onChange={(e) => { setCustomName(e.target.value); setPick(null); }}
            placeholder="ชื่อโรงเรียน"
            aria-label="ชื่อโรงเรียน"
            maxLength={120}
            className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
            style={{ borderColor: line, color: EL.ink }}
          />
          <input
            value={customProvince}
            onChange={(e) => { setCustomProvince(e.target.value); setPick(null); }}
            placeholder="จังหวัด"
            aria-label="จังหวัด"
            maxLength={60}
            className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
            style={{ borderColor: line, color: EL.ink }}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={customName.trim().length < 2}
              onClick={() => setPick({ custom: true, name: customName.trim().replace(/^(โรงเรียน|รร\.?)\s*/, ""), province: customProvince.trim() })}
              className={primary}
              style={outline}
            >
              ใช้ชื่อนี้
            </button>
            <button type="button" onClick={() => { setCustom(false); setPick(null); }} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
              กลับไปค้นหา
            </button>
          </div>
          <p className="text-sm" style={{ color: EL.inkSoft }}>ทีมงานจะเช็กชื่อโรงเรียนกับกลุ่ม LINE ตอนตรวจแคป</p>
        </div>
      )}

      {pick && (
        <div className="space-y-3 rounded-2xl border p-5" style={{ borderColor: EL.flame }}>
          <p className="text-lg">{schoolLabel(pick.name, pick.province)}</p>
          <button type="button" disabled={busy} onClick={confirm} className={`${primary} w-full`} style={filled}>
            {busy ? "กำลังเลือก…" : "ยืนยัน แล้วรับโปสเตอร์"}
          </button>
          <p className="text-sm" style={{ color: EL.inkSoft }}>
            เก็บโรงเรียนนี้ไว้ให้ {SHARE.holdHours} ชั่วโมง ถ้าไม่ได้ส่งแคป คนอื่นเลือกต่อได้
          </p>
        </div>
      )}
      {error && (
        <p role="alert" style={{ color: EL.flame }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Steps 2 to 4: the poster, how to share it, and "I sent the screenshot". */
function Claimed({ token, claim, posterVersion, demo, onChange }: Pick<Props, "token" | "posterVersion" | "demo"> & { claim: ShareClaimView; onChange: (c: ShareClaimView | null) => void }) {
  const src = `/api/hackathon/elemental/share/poster/${claim.code}?v=${posterVersion}`;
  const download = `${src}&download=1`;
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const code = claim.code.toUpperCase();

  // Fetch the image first: iOS only opens the share sheet straight from a tap.
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (live && b) setFile(new File([b], `elemental-${claim.code}.jpg`, { type: b.type || "image/jpeg" }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, claim.code]);
  const canShareFile = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });

  const patch = async (action: "sent" | "release") => {
    setBusy(true);
    setError(null);
    try {
      if (demo) return onChange(action === "sent" ? { ...claim, status: "sent" } : null);
      const res = await fetch(`/api/hackathon/elemental/${token}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      onChange(data.claim);
    } catch (e) {
      setError(e instanceof Error && e.message === "expired" ? "เลย 24 ชั่วโมงแล้ว รีเฟรชแล้วเลือกโรงเรียนใหม่" : "ยังบันทึกไม่ได้ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-lg">{schoolLabel(claim.schoolName, claim.province)}</p>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">2. โพสต์โปสเตอร์นี้</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`โปสเตอร์ ${ELEMENTAL.edition} Hackathon รหัส ${code}`} width={1080} height={1350} className="w-full rounded-xl" style={{ aspectRatio: "4 / 5", backgroundColor: EL.ink }} />
        <div className="grid gap-3 sm:grid-cols-2">
          {canShareFile ? (
            <button type="button" className={primary} style={filled} onClick={() => navigator.share({ files: [file!] }).catch(() => {})}>
              แชร์รูปนี้ไป LINE
            </button>
          ) : null}
          <a href={download} download={`elemental-${claim.code}.jpg`} className={primary} style={canShareFile ? outline : filled}>
            บันทึกรูป
          </a>
        </div>
        <p style={{ color: EL.inkSoft }}>
          โพสต์ในกลุ่ม LINE ของทั้งโรงเรียนหรือทั้งระดับชั้น ที่มีสมาชิก {SHARE.minMembers} คนขึ้นไป ขอให้ครูช่วยโพสต์ก็ได้
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">3. ส่งแคปหน้าจอ</h2>
        <p style={{ color: EL.inkSoft }}>แคปให้เห็นชื่อกลุ่ม จำนวนสมาชิก และโปสเตอร์ในแชท บังชื่อคนอื่นได้เลย ส่งทาง IG พร้อมรหัสนี้</p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {})}
          className="w-full rounded-xl border py-3 text-2xl tracking-[0.2em]"
          style={{ borderColor: line, fontFamily: EL_FONT.mono }}
          aria-label={`รหัส ${code} กดเพื่อคัดลอก`}
        >
          {code}
          <span className="block text-xs tracking-normal" style={{ color: EL.inkSoft, fontFamily: "inherit" }}>
            {copied ? "คัดลอกแล้ว" : "กดเพื่อคัดลอก"}
          </span>
        </button>
        <a href={SHARE.proofUrl} target="_blank" rel="noopener noreferrer" className={`${primary} w-full`} style={outline}>
          ส่งทาง IG {SHARE.proofHandle}
        </a>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">4. บอกเราว่าส่งแล้ว</h2>
        {claim.status === "held" ? (
          <>
            <button type="button" disabled={busy} onClick={() => patch("sent")} className={`${primary} w-full`} style={filled}>
              ส่งแคปแล้ว
            </button>
            <p className="text-sm" style={{ color: EL.inkSoft }}>
              เก็บโรงเรียนนี้ไว้ให้ถึง {bangkokTime(claim.heldUntil)}
            </p>
            <button type="button" disabled={busy} onClick={() => patch("release")} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
              เลือกโรงเรียนผิด เปลี่ยนโรงเรียน
            </button>
          </>
        ) : (
          <p className="text-lg">ส่งแล้ว ทีมงานกำลังตรวจ ผ่านเมื่อไหร่ที่นั่งเป็นของคุณ หน้าที่นั่งจะเปลี่ยนเป็นจ่ายแล้ว</p>
        )}
        {error && (
          <p role="alert" style={{ color: EL.flame }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function ShareView(props: Props) {
  const { token, state, demo } = props;
  const [claim, setClaim] = useState<ShareClaimView | null>(props.claim);

  let body: React.ReactNode;
  if (claim?.status === "won") {
    body = (
      <>
        <Title>ได้ที่นั่งฟรีแล้ว</Title>
        <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>
          ขอบคุณที่แชร์ให้{schoolLabel(claim.schoolName)}
        </p>
      </>
    );
  } else if (state === "paid") {
    body = (
      <>
        <Title>แชร์รับที่นั่งฟรี</Title>
        <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>ที่นั่งฟรีสำหรับคนที่ยังไม่ได้จ่าย ที่นั่งนี้จ่ายแล้ว</p>
      </>
    );
  } else if (state === "closed") {
    body = (
      <>
        <Title>แชร์รับที่นั่งฟรี</Title>
        <p className="mt-3 text-lg" style={{ color: EL.inkSoft }}>ตอนนี้ยังไม่เปิด</p>
      </>
    );
  } else {
    body = (
      <>
        <Title>แชร์ให้ทั้งโรงเรียน ได้ที่นั่งฟรี</Title>
        <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
          โพสต์โปสเตอร์ของตัวเองในกลุ่ม LINE ของโรงเรียน ได้ที่นั่งฟรี 1 ที่
        </p>
        {claim ? (
          <Claimed token={token} claim={claim} posterVersion={props.posterVersion} demo={demo} onChange={setClaim} />
        ) : (
          <SchoolPicker token={token} startQuery={props.startQuery} seatsLeft={props.seatsLeft} demo={demo} onClaimed={setClaim} />
        )}
      </>
    );
  }

  return (
    <main className="min-h-[100dvh] px-5 py-10 sm:px-8 sm:py-16" style={{ backgroundColor: EL.cream, color: EL.ink }}>
      <div className="mx-auto max-w-xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {ELEMENTAL.edition} Hackathon · แชร์รับที่นั่งฟรี
        </p>
        <div className="mt-6">{body}</div>
        <BackLink token={token} />
      </div>
    </main>
  );
}
