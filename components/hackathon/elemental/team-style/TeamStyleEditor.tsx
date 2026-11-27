"use client";

import { useState, type ReactNode } from "react";
import { Check, Loader2, Lock } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import {
  BOARD_NAME_MAX,
  colorOf,
  DEFAULT_STYLE,
  lockedChoices,
  NAME_COLORS,
  NAME_EFFECTS,
  NAME_FONTS,
  NAME_PAIRS,
  nameStyleCss,
  pairColors,
  TEAM_STYLE_TIERS,
  unlockedParts,
  type ColorId,
  type StylePart,
  type TeamNameStyle,
} from "@/lib/hackathon/elemental/team-style";

import { TEAM_NAME_RUDE } from "../join/draft";
import { hairline } from "../share/ui";
import { StyledTeamName } from "./StyledTeamName";

/**
 * The editor that opens inside the team row: the board name first (empty
 * until a member types one: never the sign-up's "ทีม<nickname>"), then
 * colour, font and effect. A small preview stays pinned at the top and the
 * save button at the bottom while the options scroll. Locked options can be
 * tried in the preview but not saved.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  preview: "ตัวอย่างบนกระดาน",
  noName: "ยังไม่มีชื่อ",
  name: "ชื่อบนกระดาน",
  nameSolo: "ชื่อของฉันบนกระดาน",
  nameHint: "ห้ามใช้ชื่อจริงหรือชื่อเล่น ทุกคนในทีมเห็นและแก้ชื่อนี้ได้",
  nameHintSolo: "ห้ามใช้ชื่อจริงหรือชื่อเล่น คนเดียวก็ตั้งชื่อทีมได้",
  nameFirst: "ตั้งชื่อก่อน ถึงจะบันทึกได้",
  color: "สี",
  colorForGradient: "ไล่สีใช้คู่สีด้านล่างแทน",
  font: "ฟอนต์",
  effect: "เอฟเฟกต์",
  pair: "คู่สี",
  unlockAt: (n: number) => `ครบ ${n} เครื่อง`,
  tryOnly: (n: number) => `ลองดูได้ บันทึกได้เมื่อครบ ${n} เครื่อง`,
  save: "บันทึก",
  saving: "กำลังบันทึก",
  cancel: "ยกเลิก",
  failed: "บันทึกไม่สำเร็จ ลองอีกครั้ง",
  closed: "ตอนนี้แก้ไม่ได้แล้ว",
  locked: "ยังปลดล็อกไม่ถึง รีเฟรชหน้านี้แล้วลองใหม่",
  badName: `ชื่อยาวได้ไม่เกิน ${BOARD_NAME_MAX} ตัว`,
};

type Saved = { style: TeamNameStyle; boardName: string | null };

type Props = {
  token: string;
  demo?: boolean;
  devices: number;
  solo: boolean;
  initial: Saved;
  onCancel: () => void;
  onSaved: (saved: Saved) => void;
};

export function TeamStyleEditor({ token, demo, devices, solo, initial, onCancel, onSaved }: Props) {
  const [draft, setDraft] = useState<TeamNameStyle>(initial.style);
  const [name, setName] = useState(initial.boardName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlocked = unlockedParts(devices);
  const trimmed = name.replace(/\s+/g, " ").trim();
  const locked = lockedChoices(draft, devices);
  const lockAt = Math.max(0, ...locked.map((p) => TEAM_STYLE_TIERS[p]));
  const nameChanged = trimmed !== (initial.boardName ?? "");
  const styleChanged = JSON.stringify(draft) !== JSON.stringify(initial.style);
  const canSave = Boolean(trimmed) && locked.length === 0 && (nameChanged || styleChanged) && !saving;
  const sample = trimmed || "กขค Abc";

  const pick = (patch: Partial<TeamNameStyle>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const save = async () => {
    if (!trimmed) return setError(COPY.nameFirst);
    if (isRudeTeamName(trimmed)) return setError(TEAM_NAME_RUDE);
    if ([...trimmed].length > BOARD_NAME_MAX) return setError(COPY.badName);
    if (!canSave) return;
    setSaving(true);
    setError(null);
    let result = "ok";
    if (demo) {
      await new Promise((r) => setTimeout(r, 1600));
    } else {
      result = await fetch(`/api/hackathon/elemental/${token}/team-style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(nameChanged || !initial.boardName ? { boardName: trimmed } : {}), ...(styleChanged ? { style: draft } : {}) }),
      })
        .then(async (r) => (r.ok ? "ok" : (((await r.json().catch(() => ({}))) as { error?: string }).error ?? "failed")))
        .catch(() => "failed");
    }
    setSaving(false);
    if (result !== "ok") {
      return setError(
        result === "rude" ? TEAM_NAME_RUDE : result === "invalid_name" ? COPY.badName : result === "closed" ? COPY.closed : result === "locked" ? COPY.locked : COPY.failed,
      );
    }
    onSaved({ style: draft, boardName: trimmed });
  };

  return (
    <div className="pt-1">
      {/* Pinned while the options scroll. */}
      <div
        className="sticky top-0 z-10 flex min-h-14 items-center gap-3 py-2"
        style={{ backgroundColor: EL.cream, borderBottom: `1px solid ${hairline}` }}
        aria-live="polite"
      >
        <span className="shrink-0 text-xs" style={{ color: EL.inkSoft }}>
          {COPY.preview}
        </span>
        <StyledTeamName name={trimmed || null} style={draft} placeholder={COPY.noName} className="min-w-0 truncate text-[1.375rem] leading-[1.4]" />
      </div>

      <fieldset className="mt-4 space-y-7" disabled={saving}>
        <legend className="sr-only">{solo ? COPY.nameSolo : COPY.name}</legend>

        <label className="block space-y-2">
          <span className="block text-base font-semibold">{solo ? COPY.nameSolo : COPY.name}</span>
          <input
            value={name}
            onChange={(e) => {
              setError(null);
              setName(e.target.value);
            }}
            maxLength={BOARD_NAME_MAX}
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-lg outline-none"
            style={{ borderColor: trimmed ? hairline : EL.flame, color: EL.ink }}
            aria-describedby="board-name-hint"
          />
          <span id="board-name-hint" className="block text-sm" style={{ color: EL.inkSoft }}>
            {solo ? COPY.nameHintSolo : COPY.nameHint}
          </span>
        </label>

        <Group title={COPY.color} part="color" unlocked={unlocked.color} note={draft.effect === "gradient" ? COPY.colorForGradient : undefined}>
          <Swatches value={draft.color} onPick={(color) => pick({ color })} label={COPY.color} />
        </Group>

        <Group title={COPY.font} part="font" unlocked={unlocked.font}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={COPY.font}>
            {NAME_FONTS.map((f) => (
              <Choice key={f.id} on={draft.font === f.id} onClick={() => pick({ font: f.id })} label={f.label}>
                <span className="block truncate text-[1.375rem] leading-[1.45]" style={nameStyleCss({ ...DEFAULT_STYLE, color: draft.color, font: f.id })}>
                  {sample}
                </span>
              </Choice>
            ))}
          </div>
        </Group>

        <Group title={COPY.effect} part="effect" unlocked={unlocked.effect}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={COPY.effect}>
            {NAME_EFFECTS.map((e) => (
              <Choice key={e.id} on={draft.effect === e.id} onClick={() => pick({ effect: e.id })} label={e.th}>
                <span className="block truncate text-[1.375rem] leading-[1.45]">
                  <span style={nameStyleCss({ ...draft, effect: e.id })}>{sample}</span>
                </span>
              </Choice>
            ))}
          </div>
          {draft.effect === "gradient" && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold">{COPY.pair}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={COPY.pair}>
                {NAME_PAIRS.map((p) => {
                  const [from, to] = pairColors(p.id);
                  return (
                    <Choice key={p.id} on={draft.pair === p.id} onClick={() => pick({ pair: p.id })} label={`${colorOf(p.from).th} → ${colorOf(p.to).th}`}>
                      <span className="mb-1 mt-1 block h-6 rounded-md" style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }} />
                    </Choice>
                  );
                })}
              </div>
            </div>
          )}
        </Group>
      </fieldset>

      {/* Pinned to the bottom of the screen while the editor is taller than it; clear of the home bar. */}
      <div
        className="sticky bottom-0 z-10 mt-6 space-y-2 border-t pt-3"
        style={{ backgroundColor: EL.cream, borderColor: hairline, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {error ? (
          <p className="text-sm" style={{ color: EL.ember }} role="alert">
            {error}
          </p>
        ) : locked.length > 0 ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: EL.inkSoft }}>
            <Lock className="h-3.5 w-3.5 shrink-0" /> {COPY.tryOnly(lockAt)}
          </p>
        ) : !trimmed ? (
          <p className="text-sm" style={{ color: EL.inkSoft }}>
            {COPY.nameFirst}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold disabled:opacity-50"
            style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? COPY.saving : COPY.save}
          </button>
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-12 px-4 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
            {COPY.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One part of a style. Locked parts can still be tried, shown softer, with what unlocks them. */
function Group({ title, part, unlocked, note, children }: { title: string; part: StylePart; unlocked: boolean; note?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold">{title}</h4>
        {!unlocked ? (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: EL.inkSoft }}>
            <Lock className="h-3.5 w-3.5" /> {COPY.unlockAt(TEAM_STYLE_TIERS[part])}
          </span>
        ) : (
          note && (
            <span className="text-sm" style={{ color: EL.inkSoft }}>
              {note}
            </span>
          )
        )}
      </div>
      <div style={unlocked ? undefined : { opacity: 0.6 }}>{children}</div>
    </div>
  );
}

function Choice({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className="min-h-11 min-w-0 rounded-xl border px-3 pb-2 pt-2.5 text-left"
      style={{ borderColor: on ? EL.flame : "rgba(29,33,31,0.18)", backgroundColor: on ? "rgba(236,100,36,0.08)" : "white", boxShadow: on ? `inset 0 0 0 1px ${EL.flame}` : undefined }}
    >
      {children}
      <span className="mt-0.5 block text-xs" style={{ color: EL.inkSoft }}>
        {label}
      </span>
    </button>
  );
}

function Swatches({ value, onPick, label }: { value: ColorId; onPick: (id: ColorId) => void; label: string }) {
  return (
    <div className="grid grid-cols-5 gap-x-2 gap-y-3" role="radiogroup" aria-label={label}>
      {NAME_COLORS.map((c) => {
        const on = value === c.id;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} aria-label={c.th} onClick={() => onPick(c.id)} className="flex min-h-11 flex-col items-center gap-1">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: c.hex, boxShadow: on ? `0 0 0 2px ${EL.cream}, 0 0 0 4px ${EL.ink}` : undefined }}
            >
              {on && <Check className="h-4 w-4" style={{ color: EL.cream }} strokeWidth={3} />}
            </span>
            <span className="text-xs" style={{ color: on ? EL.ink : EL.inkSoft }}>
              {c.th}
            </span>
          </button>
        );
      })}
    </div>
  );
}
