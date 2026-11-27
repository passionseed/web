"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { isRudeTeamName, teamLabel } from "@/lib/hackathon/elemental/team-name";
import { DEFAULT_STYLE, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { TEAM_NAME_RUDE } from "./join/draft";
import { Body, EditorialLink, ItemTitle, PrimaryButton, SecondaryButton, Tag, TextInput, v } from "./share/ui";
import { StyledTeamName } from "./team-style/StyledTeamName";
import { trackElemental } from "./track";

/**
 * The team on a person's own page: who has joined and paid, and the invite
 * link to send friends (copy, the phone's share sheet, or LINE). On the cream
 * pay page: a square card with a 1px rule; the name in the team's own board
 * style (StyledTeamName), as the share slab's TeamLine draws it.
 */
export function TeamInvite({
  team,
  renameToken,
  demo,
  source,
  nameStyle,
}: {
  team: PublicTeam;
  renameToken?: string;
  demo?: boolean;
  /** The inviter's share tag (share-<code>), so friends who join count toward their link; else "team". */
  source?: string;
  /** The team's board style, once the board is on; else the plain Trirong default. */
  nameStyle?: TeamNameStyle;
}) {
  const [name, setName] = useState(team.name);
  const [origin, setOrigin] = useState("https://passionseed.org");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  // src marks friends who arrive from an invite link in the funnel's sources: the inviter's share tag while
  // sharing runs (so they count toward the inviter's devices and paid seats), otherwise "team".
  const url = `${origin}/hackathon/join?team=${team.inviteCode}&src=${source ?? "team"}`;
  const message = `มาเข้า${teamLabel(name)} ลง ${ELEMENTAL.edition} Hackathon ด้วยกัน สมัครที่ลิงก์นี้: ${url}`;
  const full = team.spotsLeft === 0;

  const copy = async () => {
    trackElemental({ step: "invite_shared", detail: "copy" }, { once: false });
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4 rounded-[2px] border p-5 sm:p-6" style={{ borderColor: v.rule }}>
      <TeamName name={name} nameStyle={nameStyle} onRenamed={setName} renameToken={renameToken} demo={demo} count={team.roster.length} />

      <ul className="space-y-1">
        {team.roster.map((m, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <Body as="span">{m.name}</Body>
            <Body as="span" secondary={!m.paid}>
              {m.paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
            </Body>
          </li>
        ))}
      </ul>

      {full ? (
        <Body secondary>ทีมครบแล้ว</Body>
      ) : (
        <div className="space-y-3 border-t pt-4" style={{ borderColor: v.rule }}>
          {/* Labelled by purpose: the share slab's link is the poster. copy: placeholder — Angpao rewrites */}
          <ItemTitle as="h3">ชวนเข้าทีม</ItemTitle>
          <Body secondary>
            ส่งลิงก์ให้เพื่อนอีก {team.spotsLeft} คน แต่ละคนสมัครและจ่ายเอง คนละ ฿{ELEMENTAL.groupPriceBaht}
          </Body>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton icon={copied ? "check" : "copy"} onClick={copy} className="!px-3">
              {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </SecondaryButton>
            {canShare ? (
              <SecondaryButton
                icon="share"
                className="!px-3"
                onClick={() => {
                  trackElemental({ step: "invite_shared", detail: "share" }, { once: false });
                  navigator.share({ text: message }).catch(() => undefined);
                }}
              >
                แชร์
              </SecondaryButton>
            ) : (
              <SecondaryButton
                icon="chat"
                className="!px-3"
                href={`https://line.me/R/share?text=${encodeURIComponent(message)}`}
                external
                onClick={() => trackElemental({ step: "invite_shared", detail: "line" }, { once: false })}
              >
                ส่งใน LINE
              </SecondaryButton>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** The team's name, and for the person who started it, a way to change it. */
function TeamName({
  name,
  nameStyle,
  onRenamed,
  renameToken,
  demo,
  count,
}: {
  name: string;
  nameStyle?: TeamNameStyle;
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
      <form onSubmit={save} className="space-y-3">
        <TextInput
          id="team-rename"
          autoFocus
          aria-label="ชื่อทีม"
          value={draft}
          maxLength={80}
          error={error}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setDraft(name);
              setError(null);
              setEditing(false);
            }}
          >
            ยกเลิก
          </SecondaryButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <StyledTeamName name={teamLabel(name)} style={nameStyle ?? DEFAULT_STYLE} surface="paper" className="min-w-0" sizeStyle={{ fontSize: 28, lineHeight: 1.3 }} />
      <div className="flex shrink-0 items-baseline gap-4">
        {renameToken && (
          <EditorialLink
            size="sm"
            arrow={false}
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            เปลี่ยนชื่อ
          </EditorialLink>
        )}
        <Tag bracket={false}>
          {count}/{ELEMENTAL.maxGroupSize}
        </Tag>
      </div>
    </div>
  );
}
