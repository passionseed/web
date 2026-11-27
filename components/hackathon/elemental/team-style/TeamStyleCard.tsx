"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import {
  DEFAULT_STYLE,
  effectOf,
  lockedChoices,
  NAME_COLORS,
  NAME_EFFECTS,
  NAME_FONTS,
  nameStyleCss,
  nextUnlock,
  SOLO_NAME_MAX,
  TEAM_STYLE_TIERS,
  unlockedParts,
  type StylePart,
  type TeamNameStyle,
  type TeamStyleCardData,
  withDistinctColors,
} from "@/lib/hackathon/elemental/team-style";

import { TEAM_NAME_RUDE } from "../join/draft";
import { StyledTeamName } from "./StyledTeamName";
import { PART_TH, UnlockTrack } from "./UnlockTrack";

/**
 * The pay page's name style card: the team's name as the board shows it, its
 * rank, how close the next unlock is, and an editor to pick a colour, a font
 * and an effect. Locked options can be tried in the preview but not saved.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "ชื่อทีมบนกระดาน",
  titleSolo: "ชื่อของฉันบนกระดาน",
  rank: "อันดับ",
  of: (n: number) => `จาก ${n}`,
  offBoard: "ยังไม่ขึ้น",
  devices: "เครื่องที่เปิดลิงก์",
  paid: "ที่นั่งที่จ่ายแล้ว",
  next: (left: number, part: StylePart) => `อีก ${left} เครื่อง ปลดล็อก${PART_TH[part]}`,
  allOpen: "ปลดล็อกครบแล้ว แต่งได้ทุกแบบ",
  how: "นับเครื่องที่เปิดลิงก์แชร์ของทุกคนในทีม เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
  howSolo: "นับเครื่องที่เปิดลิงก์แชร์ของเรา เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว",
  getLink: "รับลิงก์ของฉัน",
  edit: "แต่งชื่อ",
  setName: "ตั้งชื่อ",
  board: "ดูกระดาน",
  color: "สี",
  font: "ฟอนต์",
  effect: "เอฟเฟกต์",
  color2: "สีที่สอง",
  unlockAt: (n: number) => `ครบ ${n} เครื่อง`,
  soloName: "ชื่อที่โชว์บนกระดาน",
  soloNameHint: "อย่าใช้ชื่อจริงหรือชื่อเล่น ตั้งเป็นชื่อทีม คนเดียวก็เป็นทีมได้",
  noName: "ตั้งชื่อก่อน ถึงจะเห็นชื่อบนกระดาน",
  tryOnly: (n: number) => `ลองดูได้ บันทึกได้เมื่อครบ ${n} เครื่อง`,
  save: "บันทึก",
  saving: "กำลังบันทึก",
  saved: "บันทึกแล้ว",
  cancel: "ยกเลิก",
  failed: "บันทึกไม่สำเร็จ ลองอีกครั้ง",
  closed: "ตอนนี้แต่งชื่อไม่ได้แล้ว",
  locked: "ยังปลดล็อกไม่ถึง รีเฟรชหน้านี้แล้วลองใหม่",
};

type Props = {
  token: string;
  data: TeamStyleCardData;
  demo?: boolean;
};

const line = "rgba(29,33,31,0.18)";
const pill = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50";
const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };

export function TeamStyleCard({ token, data, demo }: Props) {
  const [saved, setSaved] = useState<{ style: TeamNameStyle; name: string | null }>({ style: data.style, name: data.name });
  const [draft, setDraft] = useState<TeamNameStyle>(data.style);
  const [draftName, setDraftName] = useState(data.name ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pinned, setPinned] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // While the editor is open the preview sticks to the top; it gets a rule only once it is pinned.
  useEffect(() => {
    const el = sentinel.current;
    if (!open || !el || typeof IntersectionObserver === "undefined") return setPinned(false);
    const io = new IntersectionObserver(([e]) => setPinned(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [open]);

  // The demo page opens the editor with &edit=1.
  useEffect(() => {
    if (demo && new URLSearchParams(window.location.search).get("edit") === "1") setOpen(true);
  }, [demo]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const devices = data.devices;
  const open_ = unlockedParts(devices);
  const next = nextUnlock(devices);
  const style = open ? draft : saved.style;
  const shownName = open && data.canName ? draftName.trim() || null : saved.name;
  const locked = lockedChoices(draft, devices);
  const lockAt = Math.max(0, ...locked.map((p) => TEAM_STYLE_TIERS[p]));
  const nameChanged = data.canName && draftName.trim() !== (saved.name ?? "");
  const changed = JSON.stringify(draft) !== JSON.stringify(saved.style) || nameChanged;
  const sample = shownName ?? "กขค Abc";
  const boardHref = `/hackathon/elemental/leaderboard${demo ? "/demo" : ""}#${data.key}`;

  const pick = (patch: Partial<TeamNameStyle>) => {
    setError(null);
    setDraft((d) => {
      const next = { ...d, ...patch };
      // A two-colour effect with both colours the same would look plain.
      return effectOf(next.effect).twoColors && !("color2" in patch) ? withDistinctColors(next) : next;
    });
  };

  const cancel = () => {
    setDraft(saved.style);
    setDraftName(saved.name ?? "");
    setError(null);
    setOpen(false);
  };

  const save = async () => {
    const name = draftName.trim();
    if (data.canName && name && isRudeTeamName(name)) return setError(TEAM_NAME_RUDE);
    if (locked.length > 0 || !changed) return;
    setSaving(true);
    setError(null);
    let result: "ok" | string = "ok";
    if (demo) {
      await new Promise((r) => setTimeout(r, 1600));
    } else {
      result = await fetch(`/api/hackathon/elemental/${token}/team-style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: draft, ...(data.canName && name ? { name } : {}) }),
      })
        .then(async (r) => (r.ok ? "ok" : ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "failed"))
        .catch(() => "failed");
    }
    setSaving(false);
    if (result !== "ok") {
      return setError(result === "rude" ? TEAM_NAME_RUDE : result === "closed" ? COPY.closed : result === "locked" ? COPY.locked : COPY.failed);
    }
    setSaved({ style: draft, name: data.canName ? name || saved.name : saved.name });
    setOpen(false);
    setJustSaved(true);
  };

  return (
    <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: line }} aria-labelledby="team-style-title">
      <h2 id="team-style-title" className="text-xl font-semibold">
        {data.canName ? COPY.titleSolo : COPY.title}
      </h2>

      {/* The preview stays in view while the editor scrolls under it. */}
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className={`${open ? "sticky top-0 z-10 -mx-5 px-5 sm:-mx-6 sm:px-6" : ""} mt-2 py-3`}
        style={open ? { backgroundColor: EL.cream, borderBottom: `1px solid ${pinned ? line : "transparent"}` } : undefined}
        aria-live="polite"
      >
        <StyledTeamName
          name={shownName}
          style={style}
          className="block text-[2.125rem] leading-[1.3]"
          placeholder={data.canName ? COPY.noName : undefined}
          sizeStyle={shownName ? undefined : { fontSize: "1.125rem" }}
        />
      </div>

      <Stats data={data} boardHref={boardHref} />

      <div className="mt-6">
        <UnlockTrack devices={devices} />
        <p className="mt-1 text-base font-semibold">{next ? COPY.next(next.left, next.part) : COPY.allOpen}</p>
        <p className="mt-1 text-sm" style={{ color: EL.inkSoft }}>
          {data.canName ? COPY.howSolo : COPY.how}
          {data.shareHref && (
            <>
              {" "}
              <Link href={data.shareHref} className="whitespace-nowrap underline underline-offset-4" style={{ color: EL.ink }}>
                {COPY.getLink}
              </Link>
            </>
          )}
        </p>
      </div>

      {open ? (
        <Editor
          data={data}
          draft={draft}
          draftName={draftName}
          sample={sample}
          unlocked={open_}
          saving={saving}
          onPick={pick}
          onName={(v) => {
            setError(null);
            setDraftName(v);
          }}
        />
      ) : null}

      {error && (
        <p className="mt-4 text-sm" style={{ color: EL.ember }} role="alert">
          {error}
        </p>
      )}

      {open ? (
        <div className="mt-6 space-y-3">
          {locked.length > 0 && (
            <p className="flex items-center gap-2 text-sm" style={{ color: EL.inkSoft }}>
              <Lock className="h-3.5 w-3.5 shrink-0" /> {COPY.tryOnly(lockAt)}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || locked.length > 0 || !changed}
              className={`${pill} px-7 py-3 text-base`}
              style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? COPY.saving : COPY.save}
            </button>
            <button type="button" onClick={cancel} disabled={saving} className="px-3 py-3 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
              {COPY.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpen(true)} className={pill} style={outline}>
            {data.canName && !saved.name ? COPY.setName : COPY.edit}
          </button>
          <Link href={boardHref} className={pill} style={{ color: EL.ink }}>
            {COPY.board}
          </Link>
          {justSaved && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm" role="status">
              <Check className="h-4 w-4" /> {COPY.saved}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/** Rank, devices and paid seats, the numbers the board ranks by. */
function Stats({ data, boardHref }: { data: TeamStyleCardData; boardHref: string }) {
  const cell = "min-w-0 px-3 py-3 first:pl-0 last:pr-0";
  const num = "block text-[1.75rem] leading-none tabular-nums";
  const numStyle = { fontFamily: EL_FONT.display, fontWeight: 300 };
  return (
    <div className="mt-2 grid grid-cols-3 border-y" style={{ borderColor: line }}>
      <Link href={boardHref} className={cell} aria-label={data.rank ? `${COPY.rank} ${data.rank} ${COPY.of(data.teamsOnBoard)}` : COPY.offBoard}>
        <span className="block text-xs" style={{ color: EL.inkSoft }}>
          {COPY.rank}
        </span>
        <span className="mt-1.5 flex items-baseline gap-1">
          <span className={num} style={numStyle}>
            {data.rank ?? "–"}
          </span>
          <span className="truncate text-xs underline underline-offset-2" style={{ color: EL.inkSoft }}>
            {data.rank ? COPY.of(data.teamsOnBoard) : COPY.offBoard}
          </span>
        </span>
      </Link>
      <div className={`${cell} border-l`} style={{ borderColor: line }}>
        <span className="block text-xs" style={{ color: EL.inkSoft }}>
          {COPY.devices}
        </span>
        <span className={`${num} mt-1.5`} style={numStyle}>
          {data.devices}
        </span>
      </div>
      <div className={`${cell} border-l`} style={{ borderColor: line }}>
        <span className="block text-xs" style={{ color: EL.inkSoft }}>
          {COPY.paid}
        </span>
        <span className={`${num} mt-1.5`} style={numStyle}>
          {data.paid}
        </span>
      </div>
    </div>
  );
}

type EditorProps = {
  data: TeamStyleCardData;
  draft: TeamNameStyle;
  draftName: string;
  sample: string;
  unlocked: Record<StylePart, boolean>;
  saving: boolean;
  onPick: (patch: Partial<TeamNameStyle>) => void;
  onName: (name: string) => void;
};

function Editor({ data, draft, draftName, sample, unlocked, saving, onPick, onName }: EditorProps) {
  const twoColors = effectOf(draft.effect).twoColors;
  const fontSample = sample;

  return (
    <fieldset className="mt-8 space-y-7" disabled={saving}>
      <legend className="sr-only">{COPY.edit}</legend>

      {data.canName && (
        <label className="block space-y-2">
          <span className="block text-base font-semibold">{COPY.soloName}</span>
          <input
            value={draftName}
            onChange={(e) => onName(e.target.value)}
            maxLength={SOLO_NAME_MAX}
            className="w-full rounded-xl border bg-white px-4 py-3 text-lg outline-none"
            style={{ borderColor: line, color: EL.ink }}
          />
          <span className="block text-sm" style={{ color: EL.inkSoft }}>
            {COPY.soloNameHint}
          </span>
        </label>
      )}

      <Group title={COPY.color} part="color" unlocked={unlocked.color}>
        <Swatches value={draft.color} onPick={(color) => onPick({ color })} label={COPY.color} />
      </Group>

      <Group title={COPY.font} part="font" unlocked={unlocked.font}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={COPY.font}>
          {NAME_FONTS.map((f) => {
            const on = draft.font === f.id;
            return (
              <Choice key={f.id} on={on} onClick={() => onPick({ font: f.id })} label={f.label}>
                <span
                  className="block truncate text-[1.375rem] leading-[1.45]"
                  style={nameStyleCss({ ...DEFAULT_STYLE, color: draft.color, font: f.id })}
                >
                  {fontSample}
                </span>
              </Choice>
            );
          })}
        </div>
      </Group>

      <Group title={COPY.effect} part="effect" unlocked={unlocked.effect}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={COPY.effect}>
          {NAME_EFFECTS.map((e) => {
            const on = draft.effect === e.id;
            return (
              <Choice key={e.id} on={on} onClick={() => onPick({ effect: e.id })} label={e.th}>
                <span className="block truncate text-[1.375rem] leading-[1.45]">
                  <span style={nameStyleCss(withDistinctColors({ ...draft, effect: e.id }))}>{fontSample}</span>
                </span>
              </Choice>
            );
          })}
        </div>
        {twoColors && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold">{COPY.color2}</p>
            <Swatches value={draft.color2} onPick={(color2) => onPick({ color2 })} label={COPY.color2} />
          </div>
        )}
      </Group>
    </fieldset>
  );
}

/** One part of a style. Locked parts can still be tried, shown softer, with what unlocks them. */
function Group({ title, part, unlocked, children }: { title: string; part: StylePart; unlocked: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {!unlocked && (
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: EL.inkSoft }}>
            <Lock className="h-3.5 w-3.5" /> {COPY.unlockAt(TEAM_STYLE_TIERS[part])}
          </span>
        )}
      </div>
      <div style={unlocked ? undefined : { opacity: 0.6 }}>{children}</div>
    </div>
  );
}

function Choice({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className="min-w-0 rounded-xl border px-3 pb-2 pt-2.5 text-left"
      style={{ borderColor: on ? EL.flame : line, backgroundColor: on ? "rgba(236,100,36,0.08)" : "white", boxShadow: on ? `inset 0 0 0 1px ${EL.flame}` : undefined }}
    >
      {children}
      <span className="mt-0.5 block text-xs" style={{ color: EL.inkSoft, fontFamily: "inherit" }}>
        {label}
      </span>
    </button>
  );
}

function Swatches({ value, onPick, label }: { value: string; onPick: (id: (typeof NAME_COLORS)[number]["id"]) => void; label: string }) {
  return (
    <div className="grid grid-cols-5 gap-x-2 gap-y-3" role="radiogroup" aria-label={label}>
      {NAME_COLORS.map((c) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={c.th}
            onClick={() => onPick(c.id)}
            className="flex flex-col items-center gap-1"
          >
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
