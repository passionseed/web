"use client";

import { useState, type ReactNode } from "react";

import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import {
  BOARD_NAME_MAX,
  colorLabel,
  colorOf,
  DEFAULT_STYLE,
  lockedChoices,
  NAME_COLORS,
  NAME_EFFECTS,
  NAME_FONTS,
  NAME_PAIRS,
  nameColor,
  nameStyleCss,
  nextUnlock,
  pairColors,
  STYLE_PART_TH,
  TEAM_STYLE_TIERS,
  unlockedParts,
  type ColorId,
  type StylePart,
  type TeamNameStyle,
  type TeamStyleCardData,
} from "@/lib/hackathon/elemental/team-style";
import { BOARD_YOU_KEY } from "@/lib/hackathon/elemental/team-style-phase";

import { TEAM_NAME_RUDE } from "../join/draft";
import { BoardRow, RestHeader } from "../leaderboard/BoardRow";
import { Body, EditorialLink, Fine, H1, ItemTitle, Page, PrimaryButton, SecondaryButton, StickyBar, Tag, TextInput, v } from "../share/ui";
import css from "./team-editor.module.css";

/**
 * The team editor, its own full-screen page on the dark ground
 * (/hackathon/join/<token>/team, demo /hackathon/join/demo/team): the team's
 * row pinned at the top exactly as the board draws it, with the draft name
 * and style; the board name (empty until a member types one: never the
 * sign-up's "ทีม<nickname>"); then colour, font and effect. Locked options
 * say what unlocks them and can be tried in the preview but not saved. One
 * primary action, "บันทึก", in the sticky bar.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  title: "แต่งชื่อทีม",
  titleSolo: "แต่งชื่อของฉัน",
  count: (n: number) => `ทั้งทีม ${n} เครื่องที่เปิดลิงก์`,
  countSolo: (n: number) => `${n} เครื่องที่เปิดลิงก์ของฉัน`,
  next: (left: number, part: string) => `อีก ${left} เครื่อง ปลดล็อก${part}`,
  allOpen: "ปลดล็อกครบแล้ว แต่งได้ทุกแบบ",
  frozen: "ปิดนับแล้ว ตัวเลขหยุดนับ แต่งชื่อได้ถึงวัน Demo Day",
  preview: "ตัวอย่างบนกระดาน",
  previewLocked: "ลองดู ยังบันทึกไม่ได้",
  name: "ชื่อทีมบนกระดาน",
  nameSolo: "ชื่อของฉันบนกระดาน",
  nameHint: "ห้ามใช้ชื่อจริงหรือชื่อเล่น ทุกคนในทีมเห็นและแก้ชื่อนี้ได้",
  nameHintSolo: "ห้ามใช้ชื่อจริงหรือชื่อเล่น คนเดียวก็ตั้งชื่อทีมได้",
  namePlaceholder: "เช่น ไฟป่า",
  nameFirst: "ตั้งชื่อก่อน ถึงจะบันทึกได้",
  color: "สี",
  colorForGradient: "ไล่สีใช้คู่สีด้านล่าง",
  font: "ฟอนต์",
  effect: "เอฟเฟกต์",
  pair: "คู่สี",
  lockAt: (n: number, left: number) => `ครบ ${n} เครื่อง · อีก ${left}`,
  tryOnly: (n: number, left: number) => `ลองดูได้ บันทึกได้เมื่อครบ ${n} เครื่อง (อีก ${left})`,
  save: "บันทึก",
  saving: "กำลังบันทึก…",
  saved: "บันทึกแล้ว",
  seeBoard: "ดูบนกระดาน",
  failed: "บันทึกไม่สำเร็จ ลองอีกครั้ง",
  closed: "ตอนนี้แก้ไม่ได้แล้ว",
  closedBack: "กลับหน้าของฉัน",
  locked: "ยังปลดล็อกไม่ถึง รีเฟรชหน้านี้แล้วลองใหม่",
  badName: `ชื่อยาวได้ไม่เกิน ${BOARD_NAME_MAX} ตัว`,
  unavailableTitle: "กระดานทีมยังไม่เปิด",
  unavailable: "ตั้งชื่อและแต่งชื่อทีมได้เมื่อกระดานทีมเปิด",
  sample: "กข Aa",
};

type Saved = { style: TeamNameStyle; boardName: string | null };

/** The board's note in this tab (left by the team line) learns the team now has a name. */
function markNamed() {
  try {
    const raw = sessionStorage.getItem(BOARD_YOU_KEY);
    if (raw) sessionStorage.setItem(BOARD_YOU_KEY, JSON.stringify({ ...JSON.parse(raw), named: true }));
  } catch {
    // Storage off: the board finds out on the next pay-page visit.
  }
}

export function TeamEditor({
  token,
  data,
  payHref,
  boardHref,
  demo = false,
  demoFail = false,
}: {
  token: string;
  data: TeamStyleCardData;
  /** "← หน้าของฉัน". */
  payHref: string;
  boardHref: string;
  demo?: boolean;
  /** Demo only: the save fails, to see the error. */
  demoFail?: boolean;
}) {
  const [saved, setSaved] = useState<Saved>({ style: data.style, boardName: data.boardName });
  const [draft, setDraft] = useState<TeamNameStyle>(data.style);
  const [name, setName] = useState(data.boardName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const { devices, solo, editable } = data;
  const unlocked = unlockedParts(devices);
  const trimmed = name.replace(/\s+/g, " ").trim();
  const locked = lockedChoices(draft, devices);
  const lockAt = Math.max(0, ...locked.map((p) => TEAM_STYLE_TIERS[p]));
  const nameChanged = trimmed !== (saved.boardName ?? "");
  const styleChanged = JSON.stringify(draft) !== JSON.stringify(saved.style);
  const canSave = editable && Boolean(trimmed) && locked.length === 0 && (nameChanged || styleChanged) && !saving;
  const next = nextUnlock(devices);

  const change = (fn: () => void) => {
    setError(null);
    setJustSaved(false);
    fn();
  };
  const pick = (patch: Partial<TeamNameStyle>) => change(() => setDraft((d) => ({ ...d, ...patch })));

  const save = async () => {
    if (!trimmed) return setError(COPY.nameFirst);
    if (isRudeTeamName(trimmed)) return setError(TEAM_NAME_RUDE);
    if ([...trimmed].length > BOARD_NAME_MAX) return setError(COPY.badName);
    if (!canSave) return;
    setSaving(true);
    setError(null);
    let result = "ok";
    if (demo) {
      await new Promise((r) => setTimeout(r, 1200));
      if (demoFail) result = "failed";
    } else {
      result = await fetch(`/api/hackathon/elemental/${token}/team-style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(nameChanged || !saved.boardName ? { boardName: trimmed } : {}), ...(styleChanged ? { style: draft } : {}) }),
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
    setSaved({ style: draft, boardName: trimmed });
    setJustSaved(true);
    markNamed();
  };

  const status: { text: ReactNode; tone: "error" | "action" | "secondary"; alert?: boolean } | null = !editable
    ? { text: COPY.closed, tone: "secondary" }
    : error
      ? { text: error, tone: "error", alert: true }
      : justSaved
        ? { text: COPY.saved, tone: "action" }
        : locked.length > 0
          ? { text: COPY.tryOnly(lockAt, lockAt - devices), tone: "secondary" }
          : !trimmed
            ? { text: COPY.nameFirst, tone: "secondary" }
            : null;

  const bar = (
    <StickyBar>
      <div className="w-full">
        {status && (
          <p
            role={status.alert ? "alert" : "status"}
            className="mb-2"
            style={{ fontSize: 14, lineHeight: "22px", color: status.tone === "error" ? v.error : status.tone === "action" ? v.action : v.secondary }}
          >
            {status.text}
          </p>
        )}
        {editable && justSaved && !nameChanged && !styleChanged ? (
          // Saved and untouched since: the next step is to see it on the board. The next edit brings "บันทึก" back.
          <PrimaryButton href={boardHref} full arrow>
            {COPY.seeBoard}
          </PrimaryButton>
        ) : editable ? (
          <PrimaryButton onClick={save} disabled={!canSave} full>
            {saving ? COPY.saving : COPY.save}
          </PrimaryButton>
        ) : (
          <SecondaryButton href={payHref} full>
            {COPY.closedBack}
          </SecondaryButton>
        )}
      </div>
    </StickyBar>
  );

  return (
    <Page surface="ground" back={{ href: payHref }} bar={bar} wordmark={false}>
      <H1>{solo ? COPY.titleSolo : COPY.title}</H1>
      <Body secondary className="mt-2">
        {[(solo ? COPY.countSolo : COPY.count)(devices), !editable ? COPY.closed : data.final ? COPY.frozen : next ? COPY.next(next.left, STYLE_PART_TH[next.part]) : COPY.allOpen].join(" · ")}
      </Body>

      {/* The team's row as the board draws it, pinned while the options scroll. */}
      <div className={`${css.preview} -mx-5 mt-6 border-y sm:-mx-8`} style={{ borderColor: v.rule }} aria-live="polite">
        <div className="px-2 sm:px-4">
          <RestHeader
            as="div"
            compact
            label={locked.length ? COPY.previewLocked : COPY.preview}
            labelTone={locked.length ? "action" : "secondary"}
            columns={!(data.rank !== null && data.rank <= 3)}
          />
          <BoardRow as="div" bare entry={{ key: data.key, rank: data.rank, name: trimmed || null, style: draft, schools: [], solo, paid: data.paid, devices }} />
        </div>
      </div>

      <fieldset className={`mt-8 ${editable ? "" : css.readonly}`} disabled={saving || !editable}>
        <legend className="sr-only">{solo ? COPY.nameSolo : COPY.name}</legend>
        <TextInput
          id="board-name"
          label={<span style={{ fontWeight: 600, fontSize: 18, lineHeight: "28px" }}>{solo ? COPY.nameSolo : COPY.name}</span>}
          hint={solo ? COPY.nameHintSolo : COPY.nameHint}
          value={name}
          placeholder={COPY.namePlaceholder}
          onChange={(e) => {
            const value = e.target.value;
            change(() => setName(value));
          }}
          maxLength={BOARD_NAME_MAX}
          autoComplete="off"
          enterKeyHint="done"
        />

        <Group title={COPY.color} part="color" unlocked={unlocked.color} devices={devices} note={draft.effect === "gradient" ? COPY.colorForGradient : undefined}>
          <Swatches value={draft.color} onPick={(color) => pick({ color })} label={COPY.color} />
        </Group>

        <Group title={COPY.font} part="font" unlocked={unlocked.font} devices={devices}>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={COPY.font}>
            {NAME_FONTS.map((f) => (
              <Tile key={f.id} on={draft.font === f.id} onClick={() => pick({ font: f.id })} label={f.label}>
                <span className="block whitespace-nowrap text-center" style={{ ...nameStyleCss({ ...DEFAULT_STYLE, color: draft.color, font: f.id }), fontSize: 24, lineHeight: 1.4 }}>
                  {COPY.sample}
                </span>
              </Tile>
            ))}
          </div>
        </Group>

        <Group title={COPY.effect} part="effect" unlocked={unlocked.effect} devices={devices}>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={COPY.effect}>
            {NAME_EFFECTS.map((e) => (
              <Tile key={e.id} on={draft.effect === e.id} onClick={() => pick({ effect: e.id })} label={e.th}>
                <span className="block text-center" style={{ fontSize: 26, lineHeight: 1.4 }}>
                  <span style={nameStyleCss({ ...draft, effect: e.id })}>กข</span>
                </span>
              </Tile>
            ))}
          </div>
          {draft.effect === "gradient" && (
            <div className="mt-6">
              <p className="mb-3" style={{ fontSize: 16, lineHeight: "26px" }}>
                {COPY.pair}
              </p>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={COPY.pair}>
                {NAME_PAIRS.map((p) => {
                  const [from, to] = pairColors(p.id);
                  return (
                    <Tile key={p.id} on={draft.pair === p.id} onClick={() => pick({ pair: p.id })} label={p.th} ariaLabel={`${p.th}: ${colorOf(p.from).th} ไป ${colorOf(p.to).th}`}>
                      <span className="mx-auto flex h-5 w-12" aria-hidden="true">
                        <span className="flex-1" style={{ backgroundColor: from }} />
                        <span className="flex-1" style={{ backgroundColor: to }} />
                      </span>
                    </Tile>
                  );
                })}
              </div>
            </div>
          )}
        </Group>
      </fieldset>
    </Page>
  );
}

/** One part of a style, under a 1px rule. A locked part says what unlocks it, and its options are quieter but can be tried. */
function Group({ title, part, unlocked, devices, note, children }: { title: string; part: StylePart; unlocked: boolean; devices: number; note?: string; children: ReactNode }) {
  const at = TEAM_STYLE_TIERS[part];
  return (
    <section className="mt-8 border-t pt-6" style={{ borderColor: v.rule }}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <ItemTitle as="h2">{title}</ItemTitle>
        {!unlocked ? (
          <Tag tone="action">{COPY.lockAt(at, at - devices)}</Tag>
        ) : (
          note && (
            <Body secondary as="span">
              {note}
            </Body>
          )
        )}
      </div>
      <div className={unlocked ? undefined : css.locked}>{children}</div>
    </section>
  );
}

/** A square tile with its label in the bottom corner; the selection is a 2px flameCore rule inside. */
function Tile({ on, onClick, label, ariaLabel, children }: { on: boolean; onClick: () => void; label: string; ariaLabel?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={`${css.tile} flex aspect-square min-h-11 min-w-0 flex-col justify-between p-2`}
    >
      <span className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">{children}</span>
      <Fine as="span" className="block truncate text-left">
        <span style={{ color: on ? v.text : undefined }}>{label}</span>
      </Fine>
    </button>
  );
}

/** Square 44px swatches in the colours as the ground draws them; the selection is a 2px rule under the swatch. */
function Swatches({ value, onPick, label }: { value: ColorId; onPick: (id: ColorId) => void; label: string }) {
  return (
    <div className="grid grid-cols-5 gap-x-2 gap-y-4" role="radiogroup" aria-label={label}>
      {NAME_COLORS.map((c) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={colorLabel(c.id)}
            onClick={() => onPick(c.id)}
            className={`${css.swatch} flex min-h-11 flex-col items-center gap-1.5`}
          >
            <span className="block h-11 w-11 rounded-[2px]" style={{ backgroundColor: nameColor(c.id) }} />
            <span className={css.swatchRule} aria-hidden="true" />
            <Fine as="span">
              <span style={{ color: on ? v.text : undefined }}>{colorLabel(c.id)}</span>
            </Fine>
          </button>
        );
      })}
    </div>
  );
}

/** Before the board launches (or when the team row can't load): nothing to edit yet. */
export function TeamEditorUnavailable({ payHref }: { payHref: string }) {
  return (
    <Page surface="ground" back={{ href: payHref }} wordmark={false}>
      <H1>{COPY.title}</H1>
      <div className="mt-6 border-y py-6" style={{ borderColor: v.rule }}>
        <ItemTitle as="h2">{COPY.unavailableTitle}</ItemTitle>
        <Body secondary className="mt-1">
          {COPY.unavailable}
        </Body>
        <EditorialLink href={payHref} size="md" className="mt-4">
          {COPY.closedBack}
        </EditorialLink>
      </div>
    </Page>
  );
}
