"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Share2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatTeamCode } from "@/lib/hackathon/elemental/team-change";
import { isRudeTeamName, teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { TEAM_NAME_RUDE } from "./join/draft";
import { changeTeam } from "./TeamJoin";
import { trackElemental } from "./track";
import { TextInput } from "./join/fields";

/**
 * The team on a person's own page: who has joined and paid, the invite link
 * to send friends (copy, the phone's share sheet, or LINE), the team code for
 * friends who already signed up, and a way out of the team.
 */
export function TeamInvite({
  team,
  renameToken,
  leave,
  demo,
}: {
  team: PublicTeam;
  renameToken?: string;
  /** Lets this page leave the team. note: what leaving does to the price, if anything. */
  leave?: { token: string; note?: string };
  demo?: boolean;
}) {
  const [name, setName] = useState(team.name);
  const [origin, setOrigin] = useState("https://passionseed.org");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  // src=team marks friends who arrive from an invite link in the funnel's sources.
  const url = `${origin}/hackathon/join?team=${team.inviteCode}&src=team`;
  const message = `มาเข้า${teamLabel(name)} ลง ${ELEMENTAL.edition} Hackathon ด้วยกัน สมัครที่ลิงก์นี้: ${url}`;
  const full = team.spotsLeft === 0;

  const copy = async () => {
    trackElemental({ step: "invite_shared", detail: "copy" }, { once: false });
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = async () => {
    trackElemental({ step: "invite_shared", detail: "code" }, { once: false });
    await navigator.clipboard.writeText(formatTeamCode(team.inviteCode)).catch(() => undefined);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <section className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      <TeamName name={name} onRenamed={setName} renameToken={renameToken} demo={demo} count={team.roster.length} />

      <ul className="space-y-1.5 text-sm">
        {team.roster.map((m, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span>{m.name}</span>
            <span style={{ color: m.paid ? EL.ink : EL.inkSoft }}>{m.paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}</span>
          </li>
        ))}
      </ul>

      {full ? (
        <p className="text-sm" style={{ color: EL.inkSoft }}>ทีมครบแล้ว</p>
      ) : (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
          <p className="text-sm">
            ส่งลิงก์ให้เพื่อนอีก {team.spotsLeft} คน แต่ละคนสมัครและจ่ายเอง คนละ ฿{ELEMENTAL.groupPriceBaht}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              style={outline}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
            {canShare ? (
              <button
                type="button"
                onClick={() => {
                  trackElemental({ step: "invite_shared", detail: "share" }, { once: false });
                  navigator.share({ text: message }).catch(() => undefined);
                }}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={outline}
              >
                <Share2 className="h-4 w-4" /> แชร์
              </button>
            ) : (
              <a
                href={`https://line.me/R/share?text=${encodeURIComponent(message)}`}
                onClick={() => trackElemental({ step: "invite_shared", detail: "line" }, { once: false })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={outline}
              >
                <Share2 className="h-4 w-4" /> ส่งใน LINE
              </a>
            )}
          </div>
          {/* A friend who has already signed up (alone, say) types this on their own page instead of signing up again. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(29,33,31,0.05)" }}>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: EL.inkSoft }}>
                รหัสทีม สำหรับเพื่อนที่สมัครแล้ว
              </p>
              <p className="whitespace-nowrap text-xl tracking-wide" style={{ fontFamily: EL_FONT.mono }}>
                {formatTeamCode(team.inviteCode)}
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={outline}
            >
              {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {codeCopied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
            </button>
          </div>
        </div>
      )}

      {leave && <LeaveTeam token={leave.token} note={leave.note} demo={demo} />}
    </section>
  );
}

/** Leave the team: a quiet link, then one question before anything changes. */
function LeaveTeam({ token, note, demo }: { token: string; note?: string; demo?: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const leave = async () => {
    setBusy(true);
    setError(null);
    const failed = await changeTeam(token, { action: "leave" }, demo);
    setBusy(false);
    if (failed) return setError(failed);
    setAsking(false);
    if (demo) return setDone(true);
    router.refresh();
  };

  if (done) {
    return (
      <p role="status" className="border-t pt-4 text-sm" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
        ออกจากทีมแล้ว (เดโม ไม่ได้บันทึก)
      </p>
    );
  }

  if (!asking) {
    return (
      <div className="border-t pt-4" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
        <button type="button" onClick={() => setAsking(true)} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          ออกจากทีม
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4" style={{ borderColor: "rgba(29,33,31,0.12)" }}>
      <p className="text-sm">ออกจากทีมนี้ใช่ไหม กลับเข้าได้ด้วยรหัสทีม ถ้าทีมยังมีที่ว่าง</p>
      {note && (
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm" style={{ color: EL.ember }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-70"
          style={{ backgroundColor: EL.ink, color: EL.cream }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} ออกจากทีม
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAsking(false);
          }}
          className="rounded-full px-5 py-2.5 text-sm font-semibold"
          style={outline}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };

/** The team's name, and for the person who started it, a way to change it. */
function TeamName({
  name,
  onRenamed,
  renameToken,
  demo,
  count,
}: {
  name: string;
  onRenamed: (name: string) => void;
  renameToken?: string;
  demo?: boolean;
  count: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next) return setError("ใส่ชื่อทีมก่อน");
    if (isRudeTeamName(next)) return setError(TEAM_NAME_RUDE);
    if (next === name) return setEditing(false);
    setSaving(true);
    setError(null);
    const ok = demo
      ? true
      : await fetch(`/api/hackathon/elemental/${renameToken}/team-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: next }),
        })
          .then((r) => r.ok)
          .catch(() => false);
    setSaving(false);
    if (!ok) return setError("เปลี่ยนชื่อไม่สำเร็จ ลองอีกครั้ง");
    onRenamed(next);
    setEditing(false);
    if (!demo) router.refresh();
  };

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-2">
        <TextInput
          autoFocus
          aria-label="ชื่อทีม"
          value={draft}
          maxLength={80}
          invalid={!!error}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          className="!mt-0"
        />
        {error && (
          <p role="alert" className="text-sm" style={{ color: EL.ember }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-70"
            style={{ backgroundColor: EL.ink, color: EL.cream }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} บันทึก
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setError(null);
              setEditing(false);
            }}
            className="rounded-full px-5 py-2.5 text-sm font-semibold"
            style={outline}
          >
            ยกเลิก
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="min-w-0 break-words text-2xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {teamLabel(name)}
      </p>
      <div className="flex shrink-0 items-baseline gap-3">
        {renameToken && (
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            className="text-sm underline underline-offset-4"
            style={{ color: EL.inkSoft }}
          >
            เปลี่ยนชื่อ
          </button>
        )}
        <p className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
          {count}/{ELEMENTAL.maxGroupSize}
        </p>
      </div>
    </div>
  );
}
