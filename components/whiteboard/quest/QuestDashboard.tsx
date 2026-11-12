"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ArrowDownAZ, ArrowLeft, Clock, Eye, PenLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  findQuests,
  questName,
  questRoster,
  questWork,
  type PersonWork,
  type Quest,
  type QuestLeads,
  type RosterRow,
} from "@/lib/whiteboard/quests";

import { Face } from "../chrome/Face";
import { useSceneMemo } from "../shift/sceneMemo";
import { useSceneTick } from "../useViewportTick";

export type Person = { userId: string; name: string; role: string; avatarUrl: string | null };
type Who = Pick<Person, "userId" | "name" | "avatarUrl">;

type Props = {
  api: ExcalidrawImperativeAPI;
  /** Pictures for people who are not on the members list (their Discord one when known). */
  avatarOf: (id: string) => string | null;
  /** Everyone on the board, to list who has not handed anything in yet. */
  people: Person[];
  nameOf: (id: string) => string;
  /** The owner, site admins and staff: whose "Quest" text makes a quest, and who is not a student. */
  leads: QuestLeads;
  /** A quest to open at (from a quest's card on the board); `n` changes on every request. */
  focus?: { questId: string; n: number } | null;
};

/** What the pane shows: the overview, one quest, or one person. */
type View = { kind: "all" } | { kind: "quest"; id: string } | { kind: "person"; id: string };

/** Selects work on the board and brings it into view. */
function showOnBoard(api: ExcalidrawImperativeAPI, ids: readonly string[]) {
  const wanted = new Set(ids);
  const elements = api.getSceneElements().filter((el) => wanted.has(el.id));
  if (elements.length === 0) return;
  api.updateScene({ appState: { selectedElementIds: Object.fromEntries(elements.map((el) => [el.id, true])) } });
  api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.7, animate: true });
}

/** "เมื่อกี้", "12 นาที", "3 ชม.", "2 วัน": how long ago, short. */
function ago(iso: string, now: number) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (min < 1) return "เมื่อกี้";
  if (min < 60) return `${min} นาที`;
  if (min < 60 * 24) return `${Math.round(min / 60)} ชม.`;
  return `${Math.round(min / 1440)} วัน`;
}

/** Re-renders every minute, so "12 นาที" keeps up while nothing on the board changes. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const pieces = (w: PersonWork) => w.texts.length + w.drawings;

/**
 * The Quest dashboard, for staff (the board's owner, site admins and staff).
 * It opens on an overview: each quest's progress, and a grid of every student
 * against every quest, those who have done least first. A quest or a person
 * opens their detail; a cell shows that work on the board.
 */
export function QuestDashboard({ api, people, nameOf, avatarOf, leads, focus }: Props) {
  useSceneTick(api);
  const now = useNow();
  const { quests, work } = useSceneMemo(
    api,
    (elements) => ({ quests: findQuests(elements, leads), work: questWork(elements, leads) }),
    [leads],
  );
  const [view, setView] = useState<View>({ kind: "all" });
  const [byName, setByName] = useState(false);
  const byId = useMemo(() => new Map(people.map((p) => [p.userId, p])), [people]);

  // Opened from a quest's card on the board: straight to that quest.
  useEffect(() => {
    if (focus) setView({ kind: "quest", id: focus.questId });
  }, [focus]);

  if (quests.length === 0 && work.length === 0) {
    return (
      <p className="wb-soft text-sm leading-relaxed">
        ยังไม่มี Quest บนบอร์ดนี้ เขียนคำว่า <b>Quest</b> บนบอร์ด แล้วเขียนงานไว้ใต้คำนั้น ปุ่มเริ่ม Quest จะขึ้นข้าง ๆ
      </p>
    );
  }

  const who = (id: string): Who => ({ userId: id, name: nameOf(id), avatarUrl: byId.get(id)?.avatarUrl ?? avatarOf(id) });
  // Students: everyone who can draw on the board, but not the owner, admins or staff.
  const students = people.filter((p) => p.role === "editor" && !leads?.has(p.userId)).map((p) => p.userId);
  const rows = questRoster(quests, work, students, leads, byName ? nameOf : undefined);
  const lost = work.filter((w) => !w.quest);
  const ctx = { api, quests, rows, who, now };

  if (view.kind === "quest") {
    const index = quests.findIndex((q) => q.id === view.id);
    if (index >= 0) return <QuestDetail {...ctx} index={index} onBack={() => setView({ kind: "all" })} onPerson={(id) => setView({ kind: "person", id })} />;
  }
  if (view.kind === "person") {
    const row = rows.find((r) => r.userId === view.id);
    if (row) return <PersonDetail {...ctx} row={row} onBack={() => setView({ kind: "all" })} onQuest={(id) => setView({ kind: "quest", id })} />;
  }

  const total = rows.length;
  const started = rows.filter((r) => r.done > 0).length;
  return (
    <div className="space-y-4">
      <p className="wb-soft text-xs">
        นักเรียน {total} คน · ส่งงานแล้ว {started} คน{total - started > 0 && ` · ยังไม่เริ่ม ${total - started} คน`}
      </p>

      {/* Each quest's progress: click for who has and has not handed in. */}
      <ol className="space-y-1">
        {quests.map((q, i) => {
          const done = rows.filter((r) => r.cells[i]).length;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setView({ kind: "quest", id: q.id })}
                className="wb-quest-option w-full space-y-1 rounded-lg px-2 py-1.5 text-left"
              >
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="wb-num shrink-0 font-semibold">Q{q.number}</span>
                  <span className="min-w-0 flex-1 truncate">{q.title || "ไม่มีคำอธิบาย"}</span>
                  <span className="wb-soft shrink-0 font-mono text-xs">
                    {done}/{total}
                  </span>
                </span>
                <Bar value={done} max={total} />
              </button>
            </li>
          );
        })}
      </ol>

      {/* Everyone against every quest. */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="wb-label flex-1">ใครทำอะไรแล้ว</p>
          <button
            type="button"
            onClick={() => setByName((v) => !v)}
            className="wb-quest-option wb-soft inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs"
            title={byName ? "เรียงคนที่ทำน้อยไว้บนสุด" : "เรียงตามชื่อ"}
          >
            {byName ? <Clock className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
            {byName ? "ทำน้อยก่อน" : "ตามชื่อ"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="wb-qd-grid w-full text-sm">
            <thead>
              <tr>
                <th className="text-left font-normal" />
                {quests.map((q) => (
                  <th key={q.id} className="px-0.5 font-normal">
                    <button
                      type="button"
                      onClick={() => setView({ kind: "quest", id: q.id })}
                      title={questName(q)}
                      className="wb-quest-option wb-num w-full rounded-md py-1 text-xs font-semibold"
                    >
                      Q{q.number}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td className="max-w-0 py-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => setView({ kind: "person", id: r.userId })}
                      className="wb-quest-option flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left"
                    >
                      <Face person={who(r.userId)} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{nameOf(r.userId)}</span>
                        <span className="wb-soft block truncate text-[0.7rem] leading-tight">
                          {r.last ? `ล่าสุด ${ago(r.last, now)}` : "ยังไม่ส่งงาน"}
                        </span>
                      </span>
                    </button>
                  </td>
                  {r.cells.map((c, i) => (
                    <td key={quests[i].id} className="px-0.5 text-center">
                      <Cell work={c} label={`${nameOf(r.userId)} · ${questName(quests[i])}`} onShow={() => c && showOnBoard(api, c.ids)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wb-soft text-[0.7rem]">ช่องสีคืองานที่ส่งแล้ว (ตัวเลขคือจำนวนชิ้น) กดเพื่อดูบนบอร์ด</p>
      </section>

      {lost.length > 0 && (
        <section className="space-y-1.5">
          <p className="wb-label">งานของ Quest ที่ถูกลบไปแล้ว</p>
          {lost.flatMap((w) => w.people.map((p) => <WorkRow key={`${w.questId}:${p.userId}`} api={api} label={nameOf(p.userId)} who={who(p.userId)} work={p} />))}
        </section>
      )}
    </div>
  );
}

type Ctx = { api: ExcalidrawImperativeAPI; quests: Quest[]; rows: RosterRow[]; who: (id: string) => Who; now: number };

function QuestDetail({ api, quests, rows, who, now, index, onBack, onPerson }: Ctx & { index: number; onBack: () => void; onPerson: (id: string) => void }) {
  const quest = quests[index];
  const handed = rows
    .filter((r) => r.cells[index])
    .map((r) => ({ userId: r.userId, work: r.cells[index]! }))
    .sort((a, b) => b.work.last.localeCompare(a.work.last));
  const missing = rows.filter((r) => !r.cells[index]);
  const all = handed.flatMap((h) => h.work.ids);

  return (
    <div className="space-y-3">
      <Back onClick={onBack} />
      <div className="space-y-1.5">
        <p role="heading" aria-level={3} className="text-sm font-semibold leading-snug">
          {questName(quest)}
        </p>
        <Bar value={handed.length} max={rows.length} />
        <div className="flex items-center gap-2">
          <p className="wb-soft flex-1 text-xs">
            ส่งแล้ว {handed.length} จาก {rows.length} คน
          </p>
          {all.length > 0 && <ShowButton onClick={() => showOnBoard(api, all)} label="ดูทั้งหมดบนบอร์ด" />}
        </div>
      </div>

      {missing.length > 0 && (
        <section className="space-y-1.5">
          <p className="wb-label">ยังไม่ส่ง ({missing.length})</p>
          <div className="flex flex-wrap gap-1">
            {missing.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => onPerson(m.userId)}
                className="wb-quest-option wb-qd-chip inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs"
              >
                <Face person={who(m.userId)} size={20} />
                <span className="max-w-[8rem] truncate">{who(m.userId).name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {handed.length > 0 && (
        <section className="space-y-1.5">
          <p className="wb-label">งานที่ส่ง · ใหม่สุดก่อน</p>
          {handed.map((h) => (
            <WorkRow key={h.userId} api={api} label={who(h.userId).name} who={who(h.userId)} work={h.work} when={ago(h.work.last, now)} />
          ))}
        </section>
      )}
    </div>
  );
}

function PersonDetail({ api, quests, who, now, row, onBack, onQuest }: Ctx & { row: RosterRow; onBack: () => void; onQuest: (id: string) => void }) {
  const person = who(row.userId);
  const all = row.cells.flatMap((c) => c?.ids ?? []);
  return (
    <div className="space-y-3">
      <Back onClick={onBack} />
      <div className="flex items-center gap-2.5">
        <Face person={person} size={36} />
        <div className="min-w-0 flex-1">
          <p role="heading" aria-level={3} className="truncate text-sm font-semibold">
            {person.name}
          </p>
          <p className="wb-soft text-xs">
            ส่งแล้ว {row.done} จาก {quests.length} Quest{row.last && ` · ล่าสุด ${ago(row.last, now)}`}
          </p>
        </div>
        {all.length > 0 && <ShowButton onClick={() => showOnBoard(api, all)} label="ดูทั้งหมด" />}
      </div>
      {quests.map((q, i) => {
        const c = row.cells[i];
        return (
          <section key={q.id} className="space-y-1">
            <button type="button" onClick={() => onQuest(q.id)} className="wb-quest-option flex w-full items-baseline gap-2 rounded-md px-1 py-0.5 text-left text-sm">
              <span className="wb-num shrink-0 font-semibold">Q{q.number}</span>
              <span className="min-w-0 flex-1 truncate">{q.title || "ไม่มีคำอธิบาย"}</span>
              {!c && <span className="wb-soft shrink-0 text-xs">ยังไม่ส่ง</span>}
            </button>
            {c && <WorkRow api={api} label="งานที่ส่ง" work={c} when={ago(c.last, now)} />}
          </section>
        );
      })}
    </div>
  );
}

/** One student's cell for one quest: filled with the number of pieces, or an empty dashed box. */
function Cell({ work, label, onShow }: { work: PersonWork | null; label: string; onShow: () => void }) {
  if (!work) return <span className="wb-qd-cell wb-qd-cell--empty" aria-label={`${label}: ยังไม่ส่ง`} />;
  return (
    <button type="button" onClick={onShow} className="wb-qd-cell wb-qd-cell--done font-mono text-xs" title={`${label}: ${pieces(work)} ชิ้น · ดูบนบอร์ด`}>
      {pieces(work)}
    </button>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <span className="wb-qd-bar block" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className="wb-qd-bar__fill block" style={{ width: `${pct}%` }} />
    </span>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="wb-quest-option wb-soft -ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs">
      <ArrowLeft className="h-3.5 w-3.5" /> ภาพรวม
    </button>
  );
}

function ShowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wb-quest-option inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs"
      title="เลือกงานบนบอร์ดแล้วซูมไปดู"
    >
      <Eye className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function WorkRow({
  api,
  label,
  who,
  work,
  when,
}: {
  api: ExcalidrawImperativeAPI;
  label: string;
  /** Whose work it is, for their face beside the name. */
  who?: { userId: string; name: string; avatarUrl: string | null };
  work: PersonWork;
  /** How long ago their latest piece was, already worded. */
  when?: string;
}) {
  return (
    <div className="wb-rule space-y-1 border-t border-dashed pt-1.5">
      <div className="flex items-center gap-2">
        {who && <Face person={who} size={24} />}
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        <span className="wb-soft shrink-0 font-mono text-xs">
          {pieces(work)} ชิ้น{when && ` · ${when}`}
        </span>
        <ShowButton onClick={() => showOnBoard(api, work.ids)} label="ดูบนบอร์ด" />
      </div>
      {work.texts.slice(0, 3).map((t, i) => (
        <p key={i} className="wb-soft line-clamp-2 text-xs leading-relaxed">
          “{t}”
        </p>
      ))}
      {(work.texts.length > 3 || work.drawings > 0) && (
        <p className="wb-soft flex items-center gap-1 text-xs">
          <PenLine className="h-3 w-3" />
          {[work.texts.length > 3 && `อีก ${work.texts.length - 3} ข้อความ`, work.drawings > 0 && `ภาพวาด ${work.drawings} ชิ้น`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
