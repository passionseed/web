"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Eye, Flag, PenLine, Users } from "lucide-react";
import { useState } from "react";

import { findQuests, questName, questWork, type PersonWork, type Quest } from "@/lib/whiteboard/quests";

import { useSceneMemo } from "../shift/sceneMemo";
import { useSceneTick } from "../useViewportTick";

type Person = { userId: string; name: string; role: string };

type Props = {
  api: ExcalidrawImperativeAPI;
  /** Everyone on the board, to list who has not handed anything in yet. */
  people: Person[];
  nameOf: (id: string) => string;
};

type View = "quest" | "person";

/** The DOM id of a quest's section, so the "N คน" chip on the board can scroll to it. */
export const questSectionId = (questId: string) => `quest-dash-${questId}`;

/** Selects someone's work for a quest and brings it into view. */
function showOnBoard(api: ExcalidrawImperativeAPI, ids: string[]) {
  const wanted = new Set(ids);
  const elements = api.getSceneElements().filter((el) => wanted.has(el.id));
  if (elements.length === 0) return;
  api.updateScene({ appState: { selectedElementIds: Object.fromEntries(elements.map((el) => [el.id, true])) } });
  api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.7, animate: true });
}

/**
 * The Quest dashboard (a tab of the board's side panel): for the board's
 * owner, site admins and the people the owner lets review quests. Each quest
 * with what each person made for it, or each person with their quests, and a
 * button that shows that work on the board.
 */
export function QuestDashboard({ api, people, nameOf }: Props) {
  useSceneTick(api);
  const { quests, work } = useSceneMemo(api, (elements) => ({ quests: findQuests(elements), work: questWork(elements) }), []);
  const [view, setView] = useState<View>("quest");

  if (quests.length === 0 && work.length === 0) {
    return (
      <p className="wb-soft text-sm leading-relaxed">
        ยังไม่มี Quest บนบอร์ดนี้ เขียนคำว่า <b>Quest</b> บนบอร์ด แล้วเขียนงานไว้ใต้คำนั้น ปุ่มเริ่ม Quest จะขึ้นข้าง ๆ
      </p>
    );
  }

  const byQuest = new Map(work.map((w) => [w.questId, w]));
  // Students: everyone who can draw on the board, but not the owner.
  const students = people.filter((p) => p.role === "editor");
  const workers = [...new Set(work.flatMap((w) => w.people.map((p) => p.userId)))];
  const lostWork = work.filter((w) => !w.quest);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="wb-label flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5" /> {quests.length} Quest · {workers.length} คนส่งงาน
        </p>
        <div className="wb-input flex rounded-lg p-0.5 text-xs" role="tablist">
          {(["quest", "person"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-2 py-1 ${view === v ? "wb-quest-tab--on font-semibold" : "wb-soft"}`}
            >
              {v === "quest" ? "ตาม Quest" : "ตามคน"}
            </button>
          ))}
        </div>
      </div>

      {view === "quest" ? (
        <>
          {quests.map((q) => (
            <QuestSection
              key={q.id}
              api={api}
              quest={q}
              people={byQuest.get(q.id)?.people ?? []}
              missing={students.filter((s) => !byQuest.get(q.id)?.people.some((p) => p.userId === s.userId))}
              nameOf={nameOf}
            />
          ))}
          {lostWork.map((w) => (
            <QuestSection key={w.questId} api={api} quest={null} people={w.people} missing={[]} nameOf={nameOf} />
          ))}
        </>
      ) : (
        workers
          .sort((a, b) => nameOf(a).localeCompare(nameOf(b), "th"))
          .map((userId) => (
            <section key={userId} className="wb-quest-card space-y-1.5 rounded-lg p-2.5">
              <p role="heading" aria-level={3} className="text-sm font-semibold">
                {nameOf(userId)}
              </p>
              {work.map((w) => {
                const p = w.people.find((x) => x.userId === userId);
                return p ? (
                  <WorkRow key={w.questId} api={api} label={w.quest ? questName(w.quest) : "Quest ที่ถูกลบไปแล้ว"} work={p} />
                ) : null;
              })}
              {quests
                .filter((q) => !byQuest.get(q.id)?.people.some((p) => p.userId === userId))
                .map((q) => (
                  <p key={q.id} className="wb-soft truncate text-xs">
                    ยังไม่ส่ง · {questName(q)}
                  </p>
                ))}
            </section>
          ))
      )}
    </div>
  );
}

function QuestSection({
  api,
  quest,
  people,
  missing,
  nameOf,
}: {
  api: ExcalidrawImperativeAPI;
  quest: Quest | null;
  people: PersonWork[];
  missing: Person[];
  nameOf: (id: string) => string;
}) {
  const sorted = [...people].sort((a, b) => nameOf(a.userId).localeCompare(nameOf(b.userId), "th"));
  return (
    <section id={quest ? questSectionId(quest.id) : undefined} className="wb-quest-card space-y-1.5 rounded-lg p-2.5">
      {/* Not an h3: the side panel styles those as small numbered labels. */}
      <p role="heading" aria-level={3} className="text-sm font-semibold leading-snug">
        {quest ? questName(quest) : "Quest ที่ถูกลบไปแล้ว"}
      </p>
      <p className="wb-soft flex items-center gap-1 text-xs">
        <Users className="h-3 w-3" /> ส่งแล้ว {people.length} คน{missing.length > 0 && ` · ยังไม่ส่ง ${missing.length} คน`}
      </p>
      {sorted.map((p) => (
        <WorkRow key={p.userId} api={api} label={nameOf(p.userId)} work={p} />
      ))}
      {missing.length > 0 && (
        <p className="wb-soft text-xs leading-relaxed">ยังไม่ส่ง: {missing.map((m) => m.name).join(", ")}</p>
      )}
    </section>
  );
}

function WorkRow({ api, label, work }: { api: ExcalidrawImperativeAPI; label: string; work: PersonWork }) {
  const pieces = work.texts.length + work.drawings;
  return (
    <div className="wb-rule space-y-1 border-t border-dashed pt-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        <span className="wb-soft shrink-0 font-mono text-xs">{pieces} ชิ้น</span>
        <button
          type="button"
          onClick={() => showOnBoard(api, work.ids)}
          className="wb-quest-option inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs"
          title="เลือกงานชิ้นนี้บนบอร์ดแล้วซูมไปดู"
        >
          <Eye className="h-3.5 w-3.5" /> ดูบนบอร์ด
        </button>
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
