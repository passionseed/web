"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SPYFALL_LOCATIONS } from "@/lib/content/spyfall-locations";
import type { GameStart } from "@/lib/whiteboard/games";
import { normalizeName } from "@/lib/whiteboard/games";

import type { BoardPluginPlayer } from "../types";
import { MAX_LOCATIONS, MAX_PLAYERS, MIN_PLAYERS, TIMER_CHOICES, draftDeck, parseCustomLocation, toGameStart, type SetupDraft } from "./setup";
import { Avatar, Num, PrimaryButton, Section, Segmented, SoftButton } from "./ui";

function HowToPlay() {
  return (
    <ol className="wb-howto wb-box wb-box--dashed list-decimal space-y-0.5 p-3 pl-7 text-xs leading-relaxed">
      <li>ทุกคนได้การ์ดสถานที่เดียวกันพร้อมบทบาท ยกเว้นสายลับที่ไม่รู้ว่าอยู่ที่ไหน</li>
      <li>ผลัดกันถามคำถามเกี่ยวกับสถานที่ ตอบให้พอรู้ว่าเรารู้ แต่อย่าให้สายลับเดาได้</li>
      <li>โหวตจับสายลับให้ได้ ส่วนสายลับชนะถ้ารอดหรือทายสถานที่ถูก</li>
    </ol>
  );
}

function PlayerChecklist({
  players,
  excluded,
  onToggle,
}: {
  players: BoardPluginPlayer[];
  excluded: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (players.length === 0) return <p className="wb-soft text-xs">ยังไม่มีใครออนไลน์ในบอร์ดนี้</p>;
  return (
    <ul className="space-y-1">
      {players.map((p) => {
        const on = !excluded.has(p.userId);
        return (
          <li key={p.userId}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(p.userId)}
              className="wb-hover-row flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm"
            >
              <span className={`wb-check ${on ? "wb-check--on" : ""}`}>{on && <Check className="h-3.5 w-3.5" aria-hidden />}</span>
              <Avatar name={p.name} url={p.avatarUrl} userId={p.userId} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CustomLocationForm({ onAdd }: { onAdd: (name: string, roles: string) => boolean }) {
  const [name, setName] = useState("");
  const [roles, setRoles] = useState("");
  const input = "wb-input min-h-11 w-full px-3 text-sm";
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (onAdd(name, roles)) {
          setName("");
          setRoles("");
        }
      }}
    >
      <input className={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="ชื่อสถานที่ เช่น ห้องชมรม · Club room" />
      <input className={input} value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="บทบาท คั่นด้วยจุลภาค เช่น ประธาน, เหรัญญิก, สมาชิกใหม่" />
      <SoftButton type="submit" className="wb-btn--quiet w-full">
        <Plus className="h-4 w-4" /> เพิ่มสถานที่ · Add location
      </SoftButton>
    </form>
  );
}

function DeckPicker({ draft, onChange }: { draft: SetupDraft; onChange: (next: SetupDraft) => void }) {
  const off = new Set(draft.presetOff);
  const [open, setOpen] = useState(false);
  const togglePreset = (name: string) =>
    onChange({ ...draft, presetOff: off.has(name) ? draft.presetOff.filter((n) => n !== name) : [...draft.presetOff, name] });

  const addCustom = (name: string, roles: string) => {
    const loc = parseCustomLocation(name, roles);
    if (!loc) {
      toast.error("ใส่ชื่อสถานที่และบทบาทอย่างน้อย 1 บทบาท");
      return false;
    }
    if (draftDeck({ ...draft, presetOff: [] }).some((l) => normalizeName(l.name) === normalizeName(loc.name))) {
      toast.error("มีสถานที่ชื่อนี้แล้ว");
      return false;
    }
    if (draftDeck(draft).length >= MAX_LOCATIONS) {
      toast.error(`สำรับเต็มแล้ว ${MAX_LOCATIONS} แห่ง ปิดหรือลบบางที่ก่อน`);
      return false;
    }
    onChange({ ...draft, custom: [...draft.custom, loc] });
    return true;
  };

  return (
    <Section
      title="สถานที่ · Deck"
      count={<Num>{draftDeck(draft).length}</Num>}
      aside={
        <SoftButton className="wb-btn--quiet min-h-9 px-2 text-xs" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "ซ่อน" : "เลือก"}
        </SoftButton>
      }
    >
      {open && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <SoftButton className="wb-btn--quiet flex-1 text-xs" onClick={() => onChange({ ...draft, presetOff: [] })}>
              เลือกทั้งหมด
            </SoftButton>
            <SoftButton className="wb-btn--quiet flex-1 text-xs" onClick={() => onChange({ ...draft, presetOff: SPYFALL_LOCATIONS.map((l) => l.name) })}>
              ไม่เลือกเลย
            </SoftButton>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SPYFALL_LOCATIONS.map((l) => {
              const on = !off.has(l.name);
              return (
                <button
                  key={l.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePreset(l.name)}
                  className={`wb-pick min-h-11 px-2.5 text-xs ${on ? "" : "wb-pick--off"}`}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
          {draft.custom.length > 0 && (
            <ul className="space-y-1">
              {draft.custom.map((l) => (
                <li key={l.name} className="wb-box flex items-center gap-2 pl-3 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    <b className="font-semibold">{l.name}</b> <span className="wb-soft">{l.roles.join(", ")}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`ลบ ${l.name}`}
                    onClick={() => onChange({ ...draft, custom: draft.custom.filter((c) => c.name !== l.name) })}
                    className="wb-soft flex h-11 w-11 items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <CustomLocationForm onAdd={addCustom} />
        </div>
      )}
    </Section>
  );
}

/** The menu before a round: who plays, how many spies, the timer and the deck. Anyone on the board can deal. */
export function SetupPanel({
  players,
  draft,
  onDraft,
  busy,
  onDeal,
  onCancel,
}: {
  players: BoardPluginPlayer[];
  draft: SetupDraft;
  onDraft: (next: SetupDraft) => void;
  busy: boolean;
  onDeal: (body: GameStart) => void;
  /** Set when this menu opened over a finished round. */
  onCancel?: () => void;
}) {
  const excluded = new Set(draft.excluded);
  const playing = players.filter((p) => !excluded.has(p.userId)).length;
  const toggle = (id: string) =>
    onDraft({ ...draft, excluded: excluded.has(id) ? draft.excluded.filter((x) => x !== id) : [...draft.excluded, id] });
  const ready = toGameStart(
    draft,
    players.map((p) => p.userId),
  );

  return (
    <div className="wb-spy space-y-4 p-3">
      <HowToPlay />
      <Section title="ผู้เล่น · Players" count={<Num>{playing}</Num>}>
        <PlayerChecklist players={players} excluded={excluded} onToggle={toggle} />
        <p className="wb-soft text-[11px]">
          เลือกได้ <Num>{MIN_PLAYERS}</Num> ถึง <Num>{MAX_PLAYERS}</Num> คน เฉพาะคนที่เปิดบอร์ดนี้อยู่
        </p>
      </Section>
      <Section title="สายลับ · Spies">
        <Segmented
          value={draft.spyCount}
          onChange={(spyCount) => onDraft({ ...draft, spyCount })}
          options={[1, 2, 3].map((n) => ({ num: n, label: "คน", value: n, disabled: n >= Math.max(playing, MIN_PLAYERS) }))}
        />
      </Section>
      <Section title="เวลา · Timer">
        <Segmented
          value={draft.seconds}
          onChange={(seconds) => onDraft({ ...draft, seconds })}
          // "5 นาที": the minutes in the mono face, the unit in the sans.
          options={TIMER_CHOICES.map((t) => (t.seconds ? { num: t.seconds / 60, label: "นาที", value: t.seconds } : { label: t.label, value: t.seconds }))}
        />
      </Section>
      <DeckPicker draft={draft} onChange={onDraft} />
      <div className="wb-sticky-foot sticky bottom-0 -mx-3 space-y-1.5 p-3">
        {!ready.ok && <p className="wb-alert text-center text-xs font-medium">{ready.error}</p>}
        <div className="flex gap-1.5">
          {onCancel && (
            <SoftButton className="wb-btn--quiet" onClick={onCancel}>
              กลับ
            </SoftButton>
          )}
          <PrimaryButton className="flex-1" disabled={busy || !ready.ok} onClick={() => ready.ok && onDeal(ready.body)}>
            แจกการ์ด · Deal cards
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
