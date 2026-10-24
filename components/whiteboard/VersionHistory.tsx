"use client";

import { CaptureUpdateAction, restoreElements } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { format, formatDistanceToNow } from "date-fns";
import { Copy, History, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { WhiteboardVersion } from "@/lib/supabase/whiteboards";
import { restoreVersion } from "@/lib/whiteboard/core";

import { boardApi, boardThumbnail } from "./useWhiteboardSync";

type Props = {
  api: ExcalidrawImperativeAPI;
  boardId: string;
  editable: boolean;
  saveNow: () => Promise<boolean>;
  refreshFiles: () => void;
  onVersionSaved: () => void;
  onVersionsChanged: (fn: () => void) => () => void;
};

/**
 * Named versions plus automatic snapshots. Restoring is a normal edit, so it
 * syncs to everyone and Ctrl+Z undoes it.
 */
export function VersionHistory({ api, boardId, editable, saveNow, refreshFiles, onVersionSaved, onVersionsChanged }: Props) {
  const [versions, setVersions] = useState<WhiteboardVersion[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { versions: list } = await boardApi<{ versions: WhiteboardVersion[] }>(`/api/whiteboards/${boardId}/versions`);
      setVersions(list);
    } catch {
      setVersions([]);
    }
  }, [boardId]);

  useEffect(() => {
    void load();
    return onVersionsChanged(() => void load());
  }, [load, onVersionsChanged]);

  const saveVersion = async () => {
    const name = label.trim() || format(new Date(), "d MMM, HH:mm");
    setBusy("save");
    try {
      if (!(await saveNow())) throw new Error("Could not save the latest changes");
      const thumbnail = await boardThumbnail(api).catch(() => undefined);
      await boardApi(`/api/whiteboards/${boardId}/versions`, {
        method: "POST",
        body: JSON.stringify({ label: name, ...(thumbnail ? { thumbnail } : {}) }),
      });
      setLabel("");
      toast.success(`บันทึกเวอร์ชัน "${name}" แล้ว`);
      onVersionSaved();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save version");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (v: WhiteboardVersion) => {
    if (!window.confirm("ย้อนบอร์ดกลับไปเวอร์ชันนี้? ทุกคนจะเห็นทันที (กด Ctrl+Z เพื่อย้อนกลับได้)")) return;
    setBusy(v.id);
    try {
      const { elements } = await boardApi<{ elements: unknown[] }>(`/api/whiteboards/${boardId}/versions/${v.id}`);
      const snapshot = restoreElements(elements as never, null) as readonly OrderedExcalidrawElement[];
      const next = restoreVersion(api.getSceneElementsIncludingDeleted(), snapshot);
      api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
      refreshFiles();
      toast.success("ย้อนกลับแล้ว · Restored");
    } catch {
      toast.error("ย้อนกลับไม่สำเร็จ · Could not restore");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (v: WhiteboardVersion) => {
    setBusy(`copy-${v.id}`);
    try {
      const { id } = await boardApi<{ id: string }>(`/api/whiteboards/${boardId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ versionId: v.id }),
      });
      window.open(`/whiteboard/${id}`, "_blank");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ · Could not copy");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {editable && (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void saveVersion();
          }}
        >
          <input
            value={label}
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="ตั้งชื่อเวอร์ชัน · Name this version"
            className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-sm dark:border-white/10"
          />
          <button
            type="submit"
            disabled={busy === "save"}
            className="rounded-md bg-orange-500 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </form>
      )}
      <p className="text-xs opacity-60">บันทึกอัตโนมัติทุกครั้งที่แก้ และเก็บเวอร์ชันย้อนหลังให้ทุก 30 นาที</p>

      {versions === null ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin opacity-50" />
      ) : versions.length === 0 ? (
        <p className="py-6 text-center text-sm opacity-60">
          <History className="mx-auto mb-2 h-6 w-6" />
          ยังไม่มีเวอร์ชันเก่า
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="wb-tile overflow-hidden">
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt="" className="h-24 w-full bg-white object-contain" />
              )}
              <div className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.label ?? "บันทึกอัตโนมัติ · Autosave"}</p>
                  <p className="text-xs opacity-60" title={format(new Date(v.createdAt), "PPpp")}>
                    {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    {v.createdBy ? ` · ${v.createdBy}` : ""}
                  </p>
                </div>
                {editable && (
                  <button
                    type="button"
                    title="Restore"
                    disabled={busy !== null}
                    onClick={() => void restore(v)}
                    className="rounded-md p-1.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                  >
                    {busy === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  title="Copy to a new board"
                  disabled={busy !== null}
                  onClick={() => void copy(v)}
                  className="rounded-md p-1.5 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                >
                  {busy === `copy-${v.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
