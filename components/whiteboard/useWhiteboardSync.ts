"use client";

import {
  CaptureUpdateAction,
  getSceneVersion,
  getVisibleSceneBounds,
  reconcileElements,
  zoomToFitBounds,
} from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  BinaryFileData,
  BinaryFiles,
  Collaborator,
  ExcalidrawImperativeAPI,
  OnUserFollowedPayload,
  SocketId,
} from "@excalidraw/excalidraw/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { boardTopic, canEdit, changedSince, colorFor, markSeen, type WhiteboardRole } from "@/lib/whiteboard/core";
import { createClient } from "@/utils/supabase/client";

/**
 * Live sync for one board. Editors broadcast the elements they change over a
 * private Realtime channel and autosave them (the server merges by version).
 * Everyone shares presence, cursors and follow mode. Images go through the
 * files API and peers fetch any they are missing. Unsaved edits are also kept
 * in localStorage so a crash or lost connection does not lose them.
 *
 * Other features (emotes, comments, timer) ride the same channel through
 * `send` and `on`.
 */

export type SaveState = "saved" | "saving" | "unsaved" | "offline" | "error";

export type PresentUser = { userId: string; name: string; avatarUrl: string | null; role: WhiteboardRole };

/** Extra channel events that components can send and listen to. */
export type BoardEvent = "emote" | "comments" | "timer" | "versions";

type Me = { id: string; name: string; avatarUrl: string | null };
type Elements = readonly OrderedExcalidrawElement[];
type Bounds = readonly [number, number, number, number];

type CursorPayload = {
  userId: string;
  pointer: { x: number; y: number; tool: "pointer" | "laser" };
  button: "up" | "down";
  selectedElementIds?: Record<string, true>;
};

const BROADCAST_MS = 60;
const CURSOR_MS = 40;
const VIEWPORT_MS = 80;
const SAVE_DEBOUNCE_MS = 1200;
const THUMBNAIL_MS = 20_000;
const EXTRA_EVENTS: BoardEvent[] = ["emote", "comments", "timer", "versions"];

const backupKey = (boardId: string) => `whiteboard-backup:${boardId}`;

function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;
  const run = () => {
    last = Date.now();
    timer = null;
    if (pending) fn(...pending);
    pending = null;
  };
  return (...args: A) => {
    pending = args;
    if (timer) return;
    timer = setTimeout(run, Math.max(0, ms - (Date.now() - last)));
  };
}

export async function boardApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

const imageFileIds = (elements: Elements): string[] =>
  elements.flatMap((el) => (el.type === "image" && el.fileId && !el.isDeleted ? [el.fileId] : []));

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** A small WebP of the board for lists and version history. */
export async function boardThumbnail(api: ExcalidrawImperativeAPI): Promise<string | undefined> {
  const elements = api.getSceneElements();
  if (elements.length === 0) return undefined;
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  const blob = await exportToBlob({
    elements,
    files: api.getFiles(),
    mimeType: "image/webp",
    quality: 0.7,
    maxWidthOrHeight: 480,
    appState: { ...api.getAppState(), exportBackground: true },
  });
  return blobToDataUrl(blob);
}

export function useWhiteboardSync({
  boardId,
  role,
  me,
  initialElements,
}: {
  boardId: string;
  role: WhiteboardRole;
  me: Me;
  initialElements: Elements;
}) {
  const { id: myId, name: myName, avatarUrl: myAvatar } = me;
  const editable = canEdit(role);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [present, setPresent] = useState<PresentUser[]>([]);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const broadcastSeen = useRef(new Map<string, number>());
  const savedSeen = useRef(new Map<string, number>());
  const knownFiles = useRef(new Set<string>());
  const requestedFiles = useRef(new Set<string>());
  const collaborators = useRef(new Map<SocketId, Collaborator>());
  const followers = useRef(new Set<string>());
  const listeners = useRef(new Map<BoardEvent, Set<(payload: unknown) => void>>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const lastSceneVersion = useRef(-1);
  const thumbVersion = useRef(-1);

  // Everything already on the board counts as sent and saved.
  useEffect(() => {
    markSeen(broadcastSeen.current, initialElements);
    markSeen(savedSeen.current, initialElements);
  }, [initialElements]);

  const allElements = useCallback(
    (): Elements => (excalidrawAPI?.getSceneElementsIncludingDeleted() ?? []) as Elements,
    [excalidrawAPI],
  );

  const send = useCallback((event: string, payload: unknown) => {
    // Only over the socket: before the join, supabase-js falls back to one REST call per message.
    const channel = channelRef.current;
    if (channel?.state === "joined") void channel.send({ type: "broadcast", event, payload });
  }, []);

  /** Listen to one of the extra board events. Returns an unsubscribe. */
  const on = useCallback((event: BoardEvent, handler: (payload: unknown) => void) => {
    const set = listeners.current.get(event) ?? new Set();
    set.add(handler);
    listeners.current.set(event, set);
    return () => void set.delete(handler);
  }, []);

  const writeBackup = useCallback(() => {
    try {
      const unsaved = changedSince(allElements(), savedSeen.current);
      if (unsaved.length) localStorage.setItem(backupKey(boardId), JSON.stringify(unsaved));
      else localStorage.removeItem(backupKey(boardId));
    } catch {
      // Storage full or blocked: the server save still runs.
    }
  }, [allElements, boardId]);

  /** Fetches images that elements point to but this browser does not have yet. */
  const fetchMissingFiles = useCallback(
    async (elements: Elements) => {
      if (!excalidrawAPI) return;
      const have = excalidrawAPI.getFiles();
      const missing = imageFileIds(elements).filter((id) => !have[id] && !requestedFiles.current.has(id));
      if (missing.length === 0) return;
      missing.forEach((id) => requestedFiles.current.add(id));
      for (let i = 0; i < missing.length; i += 50) {
        const ids = missing.slice(i, i + 50);
        try {
          const { files } = await boardApi<{ files: { id: string; mimeType: string; dataURL: string }[] }>(
            `/api/whiteboards/${boardId}/files?ids=${ids.join(",")}`,
          );
          files.forEach((f) => knownFiles.current.add(f.id));
          excalidrawAPI.addFiles(files.map((f) => ({ ...f, created: Date.now() }) as unknown as BinaryFileData));
          // Ids not returned yet (still uploading) may be retried later.
          ids.filter((id) => !files.some((f) => f.id === id)).forEach((id) => requestedFiles.current.delete(id));
        } catch {
          ids.forEach((id) => requestedFiles.current.delete(id));
        }
      }
    },
    [boardId, excalidrawAPI],
  );

  const saveRef = useRef<(opts?: { keepalive?: boolean }) => Promise<void>>(async () => {});

  const scheduleSave = useCallback((delay = SAVE_DEBOUNCE_MS) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveRef.current(), delay);
  }, []);

  const save = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      if (!editable) return;
      if (saving.current) return saving.current;
      const changed = changedSince(allElements(), savedSeen.current);
      if (changed.length === 0) {
        setSaveState("saved");
        return;
      }
      setSaveState("saving");
      saving.current = (async () => {
        try {
          await boardApi(`/api/whiteboards/${boardId}`, {
            method: "PATCH",
            body: JSON.stringify({ elements: changed }),
            keepalive: opts?.keepalive && JSON.stringify(changed).length < 60_000,
          });
          markSeen(savedSeen.current, changed);
          writeBackup();
          const more = changedSince(allElements(), savedSeen.current).length > 0;
          setSaveState(more ? "unsaved" : "saved");
          if (more) scheduleSave();
        } catch {
          setSaveState(navigator.onLine ? "error" : "offline");
          scheduleSave(5000);
        } finally {
          saving.current = null;
        }
      })();
      return saving.current;
    },
    [allElements, boardId, editable, scheduleSave, writeBackup],
  );
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Saves everything now (Ctrl+S, before naming a version). Resolves once nothing is pending. */
  const saveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    for (let i = 0; i < 5; i++) {
      await save();
      if (changedSince(allElements(), savedSeen.current).length === 0) return true;
    }
    return false;
  }, [allElements, save]);

  const broadcastChanges = useRef(
    throttle((elements: Elements) => {
      const changed = changedSince(elements, broadcastSeen.current);
      if (changed.length === 0) return;
      markSeen(broadcastSeen.current, changed);
      send("scene", { elements: changed });
    }, BROADCAST_MS),
  );

  const uploadFiles = useCallback(
    async (files: BinaryFiles) => {
      const fresh = Object.values(files).filter((f) => !knownFiles.current.has(f.id));
      for (const file of fresh) {
        knownFiles.current.add(file.id);
        try {
          await boardApi(`/api/whiteboards/${boardId}/files`, {
            method: "POST",
            body: JSON.stringify([{ id: file.id, mimeType: file.mimeType, dataURL: file.dataURL }]),
          });
          send("files", { ids: [file.id] });
        } catch {
          knownFiles.current.delete(file.id);
          setSaveState("error");
        }
      }
    },
    [boardId, send],
  );

  const onChange = useCallback(
    (_elements: Elements, _appState: unknown, files: BinaryFiles) => {
      if (!editable || !excalidrawAPI) return;
      const elements = allElements();
      const version = getSceneVersion(elements);
      if (version === lastSceneVersion.current) return;
      lastSceneVersion.current = version;
      broadcastChanges.current(elements);
      if (changedSince(elements, savedSeen.current).length > 0) {
        setSaveState((s) => (s === "saving" ? s : "unsaved"));
        scheduleSave();
        writeBackup();
      }
      void uploadFiles(files);
    },
    [allElements, editable, excalidrawAPI, scheduleSave, uploadFiles, writeBackup],
  );

  const sendCursor = useRef(throttle((payload: CursorPayload) => send("cursor", payload), CURSOR_MS));

  const onPointerUpdate = useCallback(
    (update: { pointer: CursorPayload["pointer"]; button: "up" | "down" }) => {
      if (!channelRef.current) return;
      sendCursor.current({
        userId: myId,
        pointer: update.pointer,
        button: update.button,
        selectedElementIds: excalidrawAPI?.getAppState().selectedElementIds as Record<string, true> | undefined,
      });
    },
    [excalidrawAPI, myId],
  );

  // Follow mode: clicking someone's avatar follows their view.
  const sendViewport = useRef(
    throttle((bounds: Bounds) => send("viewport", { userId: myId, bounds }), VIEWPORT_MS),
  );
  const broadcastViewport = useCallback(() => {
    if (!excalidrawAPI || followers.current.size === 0) return;
    sendViewport.current(getVisibleSceneBounds(excalidrawAPI.getAppState()) as Bounds);
  }, [excalidrawAPI]);

  const onScrollChange = useCallback(() => broadcastViewport(), [broadcastViewport]);

  const onUserFollow = useCallback(
    (payload: OnUserFollowedPayload) => {
      send("follow", { target: payload.userToFollow.socketId, follower: myId, action: payload.action });
    },
    [myId, send],
  );

  const pushCollaborators = useCallback(() => {
    excalidrawAPI?.updateScene({
      collaborators: new Map(collaborators.current),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  }, [excalidrawAPI]);

  // Load images, then replay any edits a previous visit could not save.
  useEffect(() => {
    if (!excalidrawAPI) return;
    void fetchMissingFiles(initialElements);
    if (!editable) return;
    try {
      const raw = localStorage.getItem(backupKey(boardId));
      if (!raw) return;
      const backup = JSON.parse(raw) as Elements;
      const newer = backup.filter((el) => (savedSeen.current.get(el.id) ?? -1) < el.version);
      if (newer.length === 0) return localStorage.removeItem(backupKey(boardId));
      const merged = reconcileElements(
        allElements(),
        newer as unknown as Parameters<typeof reconcileElements>[1],
        excalidrawAPI.getAppState(),
      );
      excalidrawAPI.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
      excalidrawAPI.setToast({ message: "กู้งานที่ยังไม่ได้บันทึกกลับมาแล้ว · Restored unsaved changes", duration: 4000 });
      scheduleSave(300);
    } catch {
      localStorage.removeItem(backupKey(boardId));
    }
  }, [allElements, boardId, editable, excalidrawAPI, fetchMissingFiles, initialElements, scheduleSave]);

  // Realtime channel.
  useEffect(() => {
    if (!excalidrawAPI) return;
    const supabase = createClient();
    let cancelled = false;

    const applyRemote = (remote: Elements) => {
      const merged = reconcileElements(
        allElements(),
        remote as unknown as Parameters<typeof reconcileElements>[1],
        excalidrawAPI.getAppState(),
      );
      // Remote changes are already broadcast and saved by their author.
      markSeen(broadcastSeen.current, remote);
      markSeen(savedSeen.current, remote);
      excalidrawAPI.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
      lastSceneVersion.current = getSceneVersion(excalidrawAPI.getSceneElementsIncludingDeleted());
      void fetchMissingFiles(remote);
    };

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const channel = supabase.channel(boardTopic(boardId), {
        config: { private: true, broadcast: { self: false }, presence: { key: myId } },
      });
      channelRef.current = channel;

      for (const event of EXTRA_EVENTS) {
        channel.on("broadcast", { event }, ({ payload }) => listeners.current.get(event)?.forEach((fn) => fn(payload)));
      }

      channel
        .on("broadcast", { event: "scene" }, ({ payload }) => applyRemote((payload as { elements: Elements }).elements))
        .on("broadcast", { event: "files" }, () => void fetchMissingFiles(allElements()))
        .on("broadcast", { event: "hello" }, () => {
          // A newcomer loaded the saved board; send them anything not saved yet.
          if (!editable) return;
          const unsaved = changedSince(allElements(), savedSeen.current);
          if (unsaved.length) send("scene", { elements: unsaved });
        })
        .on("broadcast", { event: "follow" }, ({ payload }) => {
          const p = payload as { target: string; follower: string; action: "FOLLOW" | "UNFOLLOW" };
          if (p.target !== myId) return;
          if (p.action === "FOLLOW") followers.current.add(p.follower);
          else followers.current.delete(p.follower);
          broadcastViewport();
        })
        .on("broadcast", { event: "viewport" }, ({ payload }) => {
          const p = payload as { userId: string; bounds: Bounds };
          const appState = excalidrawAPI.getAppState();
          if (appState.userToFollow?.socketId !== p.userId) return;
          const next = zoomToFitBounds({ bounds: p.bounds as never, appState, fitToViewport: true, viewportZoomFactor: 1 });
          excalidrawAPI.updateScene({ appState: next.appState, captureUpdate: CaptureUpdateAction.NEVER });
        })
        .on("broadcast", { event: "cursor" }, ({ payload }) => {
          const p = payload as CursorPayload;
          if (p.userId === myId) return;
          const key = p.userId as SocketId;
          collaborators.current.set(key, {
            ...collaborators.current.get(key),
            id: p.userId,
            socketId: key,
            pointer: p.pointer,
            button: p.button,
            selectedElementIds: p.selectedElementIds,
            color: colorFor(p.userId),
          });
          pushCollaborators();
        })
        .on("presence", { event: "sync" }, () => {
          const users = Object.values(channel.presenceState<PresentUser>())
            .map((metas) => metas[0])
            .filter(Boolean) as PresentUser[];
          setPresent(users);
          const online = new Set(users.map((u) => u.userId));
          for (const id of followers.current) if (!online.has(id)) followers.current.delete(id);
          const next = new Map<SocketId, Collaborator>();
          for (const u of users) {
            const key = u.userId as SocketId;
            next.set(key, {
              ...collaborators.current.get(key),
              id: u.userId,
              socketId: key,
              username: u.name,
              avatarUrl: u.avatarUrl ?? undefined,
              color: colorFor(u.userId),
              isCurrentUser: u.userId === myId,
            });
          }
          collaborators.current = next;
          pushCollaborators();
        })
        .subscribe(async (status, error) => {
          if (status === "SUBSCRIBED") {
            setConnected(true);
            await channel.track({ userId: myId, name: myName, avatarUrl: myAvatar, role } satisfies PresentUser);
            send("hello", {});
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (status !== "CLOSED") console.warn(`Whiteboard realtime ${status}`, error?.message);
            setConnected(false);
          }
        });
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [
    allElements,
    boardId,
    broadcastViewport,
    editable,
    excalidrawAPI,
    fetchMissingFiles,
    myAvatar,
    myId,
    myName,
    pushCollaborators,
    role,
    send,
  ]);

  // Small preview for the board list.
  useEffect(() => {
    if (!editable || !excalidrawAPI) return;
    const timer = setInterval(async () => {
      const version = getSceneVersion(excalidrawAPI.getSceneElements());
      if (version === thumbVersion.current) return;
      thumbVersion.current = version;
      try {
        const thumbnail = await boardThumbnail(excalidrawAPI);
        if (thumbnail) {
          await boardApi(`/api/whiteboards/${boardId}`, { method: "PATCH", body: JSON.stringify({ thumbnail }) });
        }
      } catch {
        // A missing preview is fine; the next tick tries again.
        thumbVersion.current = -1;
      }
    }, THUMBNAIL_MS);
    return () => clearInterval(timer);
  }, [boardId, editable, excalidrawAPI]);

  // Save what is left when the tab goes away.
  useEffect(() => {
    if (!editable) return;
    const flush = () => void save({ keepalive: true });
    const onHide = () => document.visibilityState === "hidden" && flush();
    const onOnline = () => scheduleSave(200);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
    };
  }, [editable, save, scheduleSave]);

  // Warn before closing with unsaved work.
  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  return {
    excalidrawAPI,
    setExcalidrawAPI,
    onChange,
    onPointerUpdate,
    onScrollChange,
    onUserFollow,
    saveNow,
    refreshFiles: () => void fetchMissingFiles(allElements()),
    send,
    on,
    saveState,
    present,
    connected,
  };
}
