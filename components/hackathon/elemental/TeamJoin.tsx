"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { TEAM_CODE_LENGTH, parseTeamCode } from "@/lib/hackathon/elemental/team-change";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";

import { TEAM_NAME_RUDE } from "./join/draft";
import { TextInput } from "./join/fields";

/** What the page says for each answer from /api/hackathon/elemental/[token]/team. */
export const TEAM_CHANGE_ERRORS: Record<string, string> = {
  team_not_found: "ไม่พบทีมจากรหัสนี้ ลองเช็กรหัสอีกครั้ง",
  team_full: "ทีมนี้ครบแล้ว",
  in_team: "หน้านี้อยู่ในทีมแล้ว ลองรีเฟรชหน้า",
  not_in_team: "หน้านี้ไม่ได้อยู่ในทีมแล้ว ลองรีเฟรชหน้า",
  closed: "ปิดการเปลี่ยนทีมแล้ว",
  rude: TEAM_NAME_RUDE,
};
export const TEAM_CHANGE_FAILED = "ทำรายการไม่สำเร็จ ลองอีกครั้ง";

type TeamAction = { action: "join"; code: string } | { action: "create"; name: string } | { action: "leave" };

/** Send one team change. Returns null when it worked, or the line to show. */
export async function changeTeam(token: string, body: TeamAction, demo?: boolean): Promise<string | null> {
  if (demo) return null;
  try {
    const res = await fetch(`/api/hackathon/elemental/${token}/team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const { error } = (await res.json().catch(() => ({}))) as { error?: string };
    return TEAM_CHANGE_ERRORS[error ?? ""] ?? TEAM_CHANGE_FAILED;
  } catch {
    return TEAM_CHANGE_FAILED;
  }
}

const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };
const solid = { backgroundColor: EL.ink, color: EL.cream };
const button = "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-70";

/**
 * For a sign-up without a team, on its own page: join a team with its code
 * (or a pasted invite link), or start a new one. The way into a team after
 * signing up alone (Angpao, 2026-11-27), until the deadline (2026-11-28).
 */
export function TeamJoin({
  token,
  notes,
  until,
  demo,
}: {
  token: string;
  /** What joining does to this sign-up: its price, its slip, its buddy pass. One line each. */
  notes: string[];
  /** When team changes close, as shown: "5 ธ.ค. 10:00 น." */
  until: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "create">("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    let body: TeamAction;
    if (mode === "join") {
      if (!code.trim()) return setError("ใส่รหัสทีมก่อน");
      if (!parseTeamCode(code)) return setError(`รหัสทีมมี ${TEAM_CODE_LENGTH} ตัว ลองเช็กอีกครั้ง หรือวางลิงก์เชิญทั้งลิงก์`);
      body = { action: "join", code };
    } else {
      const next = name.trim();
      if (!next) return setError("ใส่ชื่อทีมก่อน");
      if (isRudeTeamName(next)) return setError(TEAM_NAME_RUDE);
      body = { action: "create", name: next };
    }
    setBusy(true);
    setError(null);
    const failed = await changeTeam(token, body, demo);
    setBusy(false);
    if (failed) return setError(failed);
    if (demo) return setDone(mode === "join" ? "เข้าทีมแล้ว (เดโม ไม่ได้บันทึก)" : "สร้างทีมแล้ว (เดโม ไม่ได้บันทึก)");
    router.refresh();
  };

  const swap = (next: "join" | "create") => {
    setMode(next);
    setError(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "rgba(29,33,31,0.18)" }}>
      <div className="space-y-1">
        <p className="text-lg">{mode === "join" ? "เข้าทีมด้วยรหัสทีม" : "สร้างทีมใหม่"}</p>
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {mode === "join"
            ? "ขอรหัสทีมจากเพื่อนที่อยู่ในทีม หรือวางลิงก์เชิญทั้งลิงก์ก็ได้"
            : `ตั้งชื่อทีม แล้วส่งรหัสทีมให้เพื่อน ทีมละ ${ELEMENTAL.teamMin}–${ELEMENTAL.maxGroupSize} คน`}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <div className="flex flex-wrap items-stretch gap-2">
          {mode === "join" ? (
            <TextInput
              aria-label="รหัสทีม"
              placeholder="เช่น 0123 4567"
              value={code}
              maxLength={400}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              invalid={!!error}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              className="!mt-0 min-w-0 flex-1"
            />
          ) : (
            <TextInput
              aria-label="ชื่อทีม"
              placeholder="ชื่อทีม"
              value={name}
              maxLength={80}
              invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="!mt-0 min-w-0 flex-1"
            />
          )}
          <button type="submit" disabled={busy} className={button} style={solid}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "join" ? "เข้าทีม" : "สร้างทีม"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm" style={{ color: EL.ember }}>
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm">
            {done}
          </p>
        )}
      </form>

      <div className="space-y-1 text-sm" style={{ color: EL.inkSoft }}>
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>
          เปลี่ยนทีมได้ถึง <span className="whitespace-nowrap">{until}</span>
        </p>
      </div>

      <button type="button" onClick={() => swap(mode === "join" ? "create" : "join")} className={`${button} w-full`} style={outline}>
        {mode === "join" ? "ยังไม่มีทีม สร้างทีมใหม่" : "มีรหัสทีมแล้ว เข้าทีม"}
      </button>
    </section>
  );
}
