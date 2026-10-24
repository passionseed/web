"use client";

import { Sidebar } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { formatDistanceToNow } from "date-fns";

import { STAMPS, STICKY_COLORS } from "@/lib/whiteboard/core";
import { sticky, TEMPLATES } from "@/lib/whiteboard/templates";

import { insertSkeletons, viewportCenter } from "./insert";
import type { CommentsApi } from "./useComments";
import { VersionHistory } from "./VersionHistory";

export const KIT_SIDEBAR = "board-kit";

type Props = {
  api: ExcalidrawImperativeAPI;
  boardId: string;
  editable: boolean;
  comments: CommentsApi;
  showResolved: boolean;
  onShowResolved: (show: boolean) => void;
  onOpenThread: (id: string) => void;
  saveNow: () => Promise<boolean>;
  refreshFiles: () => void;
  onVersionSaved: () => void;
  onVersionsChanged: (fn: () => void) => () => void;
};

const STICKY_TEXT_SIZE = 200;

/** Drops a sticky near the middle of the screen; double-click it to type. */
function addSticky(api: ExcalidrawImperativeAPI, color: string) {
  // Offset each new sticky a little so a row of clicks fans out instead of stacking.
  const c = viewportCenter(api);
  const jitter = () => Math.round(Math.random() * 40 - 20);
  insertSkeletons(api, [sticky(0, 0, color, "", STICKY_TEXT_SIZE)], { x: c.x + jitter(), y: c.y + jitter() });
}

function addStamp(api: ExcalidrawImperativeAPI, stamp: string) {
  const skeleton = { type: "text", x: 0, y: 0, text: stamp, fontSize: 56, fontFamily: 6 } as ExcalidrawElementSkeleton;
  const c = viewportCenter(api);
  insertSkeletons(api, [skeleton], { x: c.x + Math.random() * 60 - 30, y: c.y + Math.random() * 60 - 30 });
}

export function KitSidebar(props: Props) {
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
          {editable && <Sidebar.TabTrigger tab="templates">เทมเพลต</Sidebar.TabTrigger>}
          <Sidebar.TabTrigger tab="comments">คอมเมนต์</Sidebar.TabTrigger>
          <Sidebar.TabTrigger tab="history">ประวัติ</Sidebar.TabTrigger>
        </Sidebar.TabTriggers>

        {editable && (
          <Sidebar.Tab tab="create" className="space-y-5 p-3">
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Sticky notes</h3>
              <div className="grid grid-cols-4 gap-2">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={`${c.name} sticky`}
                    onClick={() => addSticky(api, c.fill)}
                    className="aspect-square rounded-md shadow-sm ring-1 ring-black/10 transition-transform hover:-rotate-3 hover:scale-105"
                    style={{ background: c.fill }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs opacity-60">ดับเบิลคลิกที่โน้ตเพื่อพิมพ์</p>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Stamps · โหวต</h3>
              <div className="grid grid-cols-5 gap-1">
                {STAMPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addStamp(api, s)}
                    className="rounded-md py-1.5 text-2xl transition-transform hover:scale-125"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
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
                  <span className="block text-xs opacity-60">{t.description}</span>
                </span>
              </button>
            ))}
          </Sidebar.Tab>
        )}

        <Sidebar.Tab tab="comments" className="p-3">
          <label className="mb-3 flex items-center gap-2 text-xs opacity-70">
            <input type="checkbox" checked={props.showResolved} onChange={(e) => props.onShowResolved(e.target.checked)} />
            แสดงที่ปิดแล้ว · Show resolved
          </label>
          {openThreads.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">ยังไม่มีคอมเมนต์ กด 💬 แล้วคลิกบนบอร์ด</p>
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
                      <span className="opacity-60">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                    </p>
                    <p className="line-clamp-2 text-sm">{t.body}</p>
                    {t.replies.length > 0 && <p className="mt-1 text-xs opacity-60">{t.replies.length} replies</p>}
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
      </Sidebar.Tabs>
    </Sidebar>
  );
}
