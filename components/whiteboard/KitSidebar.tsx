"use client";

import { Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { formatDistanceToNow } from "date-fns";
import { memo, type ReactNode } from "react";

import { CARD_KINDS, CARDS, cardSkeleton } from "@/lib/whiteboard/cards";
import { STAMPS, STICKY_COLORS } from "@/lib/whiteboard/core";
import { sticky, TEMPLATES } from "@/lib/whiteboard/templates";

import { insertSkeletons, viewportCenter } from "./insert";
import { ShiftKit } from "./shift/ShiftKit";
import type { CommentsApi } from "./useComments";
import { VersionHistory } from "./VersionHistory";

export const KIT_SIDEBAR = "board-kit";
/** The kit's tabs, opened from the Apps menu. */
export type KitTab = "create" | "shift" | "templates" | "comments" | "history" | "activity";
/** Id of the room cards section in the "create" tab, so the Apps menu can scroll to it. */
export const KIT_CARDS_ID = "wb-kit-cards";

/** Opens the kit on a tab, optionally scrolling to a section in it. */
export function openKit(api: ExcalidrawImperativeAPI, tab: KitTab, sectionId?: string) {
  api.toggleSidebar({ name: KIT_SIDEBAR, tab, force: true });
  if (sectionId) {
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }
}

type Props = {
  api: ExcalidrawImperativeAPI;
  boardId: string;
  editable: boolean;
  /** Names a new SHIFT project frame. */
  myName: string;
  comments: CommentsApi;
  showResolved: boolean;
  onShowResolved: (show: boolean) => void;
  onOpenThread: (id: string) => void;
  saveNow: () => Promise<boolean>;
  refreshFiles: () => void;
  onVersionSaved: () => void;
  onVersionsChanged: (fn: () => void) => () => void;
  /** Admin-only Activity tab. */
  activity?: ReactNode;
};

const STICKY_TEXT_SIZE = 200;

/**
 * Drops a sticky and selects it; double-click it to type. Without `at` (scene coordinates of its
 * centre) it lands near the middle of the screen.
 */
export function addSticky(api: ExcalidrawImperativeAPI, color: string, at?: { x: number; y: number }) {
  // Offset each new sticky a little so a row of clicks fans out instead of stacking.
  const c = viewportCenter(api);
  const jitter = () => Math.round(Math.random() * 40 - 20);
  return insertSkeletons(api, [sticky(0, 0, color, "", STICKY_TEXT_SIZE)], at ?? { x: c.x + jitter(), y: c.y + jitter() });
}

export function addStamp(api: ExcalidrawImperativeAPI, stamp: string) {
  const skeleton = { type: "text", x: 0, y: 0, text: stamp, fontSize: 56, fontFamily: 6 } as ExcalidrawElementSkeleton;
  const c = viewportCenter(api);
  insertSkeletons(api, [skeleton], { x: c.x + Math.random() * 60 - 30, y: c.y + Math.random() * 60 - 30 });
}

/**
 * The board kit on the right: stickies, stamps and room cards, templates, all
 * comments, version history and (admins) activity. Opened from the Apps menu.
 */
export const KitSidebar = memo(function KitSidebar(props: Props) {
  const { api, editable, comments } = props;
  const openThreads = comments.threads.filter((t) => props.showResolved || !t.resolvedAt);

  return (
    <Sidebar name={KIT_SIDEBAR} className="whiteboard-kit">
      <Sidebar.Header>
        <span className="text-sm font-semibold">บอร์ด · Board</span>
      </Sidebar.Header>
      <Sidebar.Tabs>
        <Sidebar.TabTriggers>
          {editable && <Sidebar.TabTrigger tab="create">สร้าง</Sidebar.TabTrigger>}
          {editable && <Sidebar.TabTrigger tab="shift">SHIFT</Sidebar.TabTrigger>}
          {editable && <Sidebar.TabTrigger tab="templates">เทมเพลต</Sidebar.TabTrigger>}
          <Sidebar.TabTrigger tab="comments">คอมเมนต์</Sidebar.TabTrigger>
          <Sidebar.TabTrigger tab="history">ประวัติ</Sidebar.TabTrigger>
          {props.activity && <Sidebar.TabTrigger tab="activity">ใครทำอะไร</Sidebar.TabTrigger>}
        </Sidebar.TabTriggers>

        {editable && (
          <Sidebar.Tab tab="create" className="wb-kit-sections space-y-5 p-3">
            <section>
              <h3 className="mb-2">โน้ต · Sticky notes</h3>
              <div className="grid grid-cols-4 gap-2">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={`โน้ต${c.name} · ${c.name} sticky`}
                    onClick={() => addSticky(api, c.fill)}
                    className="wb-swatch"
                    style={{ background: c.fill }}
                  />
                ))}
              </div>
              <p className="wb-soft mt-2 text-xs">ดับเบิลคลิกที่โน้ตเพื่อพิมพ์</p>
            </section>
            <section id={KIT_CARDS_ID} className="scroll-mt-3">
              <h3 className="mb-2">การ์ดห้อง · Room cards</h3>
              <div className="grid grid-cols-2 gap-2">
                {CARD_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      const c = viewportCenter(api);
                      insertSkeletons(api, [cardSkeleton(kind)], { x: c.x + Math.random() * 40 - 20, y: c.y + Math.random() * 40 - 20 });
                    }}
                    className="wb-kit-card p-2 text-left text-xs"
                    style={{ background: CARDS[kind].color, color: "#1e1e1e" }}
                  >
                    <span className="block font-semibold">
                      {CARDS[kind].emoji} {CARDS[kind].title.split(" · ")[0]}
                    </span>
                    <span className="block opacity-70">{CARDS[kind].prompt.split("\n")[0]}</span>
                  </button>
                ))}
              </div>
              <p className="wb-soft mt-2 text-xs">บอร์ดจำว่าใครแปะการ์ดไหน ใช้นับว่ามากี่คน ใครช่วยใคร</p>
            </section>
            <section>
              <h3 className="mb-2">แสตมป์ · Stamps</h3>
              <div className="grid grid-cols-5 gap-1">
                {STAMPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addStamp(api, s)}
                    className="wb-emoji"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </Sidebar.Tab>
        )}

        {editable && (
          <Sidebar.Tab tab="shift" className="p-3">
            <ShiftKit api={api} myName={props.myName} />
          </Sidebar.Tab>
        )}

        {editable && (
          <Sidebar.Tab tab="templates" className="space-y-2 p-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const placed = insertSkeletons(api, t.build());
                  api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.8, animate: true });
                }}
                className="wb-tile flex w-full items-start gap-3 p-3 text-left"
              >
                <span className="text-2xl">{t.emoji}</span>
                <span>
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="wb-soft block text-xs">{t.description}</span>
                </span>
              </button>
            ))}
          </Sidebar.Tab>
        )}

        <Sidebar.Tab tab="comments" className="p-3">
          <label className="wb-soft mb-3 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={props.showResolved} onChange={(e) => props.onShowResolved(e.target.checked)} />
            แสดงที่ปิดแล้ว · Show resolved
          </label>
          {openThreads.length === 0 ? (
            <p className="wb-soft py-8 text-center text-sm">ยังไม่มีคอมเมนต์ กดปุ่มคอมเมนต์ที่แถบด้านล่าง แล้วคลิกบนบอร์ด</p>
          ) : (
            <ul className="space-y-2">
              {openThreads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (t.x !== null && t.y !== null) {
                        const { width, height, zoom } = api.getAppState();
                        api.updateScene({
                          appState: { scrollX: -t.x + width / 2 / zoom.value, scrollY: -t.y + height / 2 / zoom.value },
                        });
                      }
                      props.onOpenThread(t.id);
                    }}
                    className={`wb-tile w-full p-2.5 text-left ${
                      t.resolvedAt ? "opacity-50" : ""
                    }`}
                  >
                    <p className="text-xs">
                      <span className="font-semibold">{t.authorName}</span>{" "}
                      <span className="wb-soft">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                    </p>
                    <p className="line-clamp-2 text-sm">{t.body}</p>
                    {t.replies.length > 0 && (
                      <p className="wb-soft mt-1 text-xs">
                        <span className="wb-num">{t.replies.length}</span> คำตอบ · replies
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Sidebar.Tab>

        <Sidebar.Tab tab="history" className="p-3">
          <VersionHistory
            api={api}
            boardId={props.boardId}
            editable={editable}
            saveNow={props.saveNow}
            refreshFiles={props.refreshFiles}
            onVersionSaved={props.onVersionSaved}
            onVersionsChanged={props.onVersionsChanged}
          />
        </Sidebar.Tab>

        {props.activity && (
          <Sidebar.Tab tab="activity" className="p-3">
            {props.activity}
          </Sidebar.Tab>
        )}
      </Sidebar.Tabs>
    </Sidebar>
  );
});
