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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  boardTopic,
  canEdit,
  changedSince,
  colorFor,
  hasChangedSince,
  markSeen,
  queueLatest,
  stampAuthor,
  type WhiteboardRole,
} from "@/lib/whiteboard/core";
import { createCanvasGuard } from "@/lib/whiteboard/canvas-guard";
import { exportBackgroundFor, loadBoardSettings } from "@/lib/whiteboard/settings";
import { createClient } from "@/utils/supabase/client";

import { nextFrame } from "./useViewportTick";

/**
 * Live sync for one board. Editors broadcast the elements they change over a
 * private Realtime channel and autosave them (the server merges by version).
 * Everyone shares presence, cursors and follow mode. Images go through the
 * files API and peers fetch any they are missing. Unsaved edits are also kept
 * in localStorage so a crash or lost connection does not lose them.
 *
 * Other features (emotes, comments, timer) ride the same channel through
 * `send` and `on`.
 *
 * Every Excalidraw update re-renders the whole editor, so incoming cursors and
 * edits are applied at most once per animation frame, and the localStorage
 * backup and thumbnail stay off the drawing hot path.
 */

export type SaveState = "saved" | "saving" | "unsaved" | "offline" | "error";

export type PresentUser = {
  userId: string;
  /** One per open tab, so the same person on two devices shows up twice. */
  socketId: string;
  name: string;
  avatarUrl: string | null;
  role: WhiteboardRole;
  /** socketId of the tab this one is following. */
  following: string | null;
  /** Whether the tab is in view. Missing (older tabs) counts as visible. */
  visible?: boolean;
};

/** Extra channel events that components can send and listen to. */
export type BoardEvent = "emote" | "comments" | "timer" | "versions" | "plugin";

type Me = { id: string; name: string; avatarUrl: string | null };
type Elements = readonly OrderedExcalidrawElement[];
type Bounds = readonly [number, number, number, number];

type CursorPayload = {
  kind?: "cursor";
  socketId: string;
  userId: string;
  pointer: { x: number; y: number; tool: "pointer" | "laser" };
  button: "up" | "down";
  selectedElementIds?: Record<string, true>;
};
type ViewportPayload = { kind: "viewport"; socketId: string; bounds: Bounds };
/**
 * Cursors and the follow-mode viewport share the "cursor" event: it is the
 * one event viewers may send (see the realtime policy in the migration).
 */
type AwarenessPayload = CursorPayload | ViewportPayload;

const BROADCAST_MS = 60;
const CURSOR_MS = 40;
const VIEWPORT_MS = 80;
const SAVE_DEBOUNCE_MS = 1200;
const THUMBNAIL_MS = 20_000;
/** Thumbnails wait until nobody here has edited for this long, so export never stalls a stroke. */
const THUMBNAIL_QUIET_MS = 3000;
/** The crash backup is written at most this often while editing, and right away when the tab hides. */
const BACKUP_MS = 800;
/** A cursor carries the selection only when it changed, or this often so newcomers see it too. */
const SELECTION_RESEND_MS = 2000;
const EXTRA_EVENTS: BoardEvent[] = ["emote", "comments", "timer", "versions", "plugin"];
/**
 * Live edits to a SHIFT canvas are shown from the database once their sender's save is through
 * (see canvas-guard.ts). The sender announces each save; without that notice, fetch after this long.
 */
const VERIFY_FALLBACK_MS = 6000;
/** While some are still not saved, check again after this long, doubling up to VERIFY_RETRY_MAX_MS... */
const VERIFY_RETRY_MS = 4000;
const VERIFY_RETRY_MAX_MS = 16_000;
/** ...and stop waiting this long after the last live edit to it (the save was refused or never came). */
const VERIFY_GIVE_UP_MS = 30_000;
/** At most one fetch per this long, however many notices arrive. */
const VERIFY_MIN_GAP_MS = 1000;

/** Postgres's answer to a save: elements it kept differently from how they were sent, and ids it left out. */
type SaveResult = { corrected?: Elements; dropped?: string[] };

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

/** Runs `cb` when the browser is idle (or soon, where requestIdleCallback is missing). Returns a cancel function. */
function whenIdle(cb: () => void, timeout: number): () => void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = window.requestIdleCallback(cb, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(cb, 0);
  return () => clearTimeout(t);
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

/**
 * A small WebP of the board for lists and version history. The live canvas is see-through (the
 * colour and the dots are our own layer under it), so the board's colour is passed in here.
 */
export async function boardThumbnail(api: ExcalidrawImperativeAPI, boardId: string): Promise<string | undefined> {
  const elements = api.getSceneElements();
  if (elements.length === 0) return undefined;
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  const blob = await exportToBlob({
    elements,
    files: api.getFiles(),
    mimeType: "image/webp",
    quality: 0.7,
    maxWidthOrHeight: 480,
    appState: { ...api.getAppState(), exportBackground: true, viewBackgroundColor: exportBackgroundFor(loadBoardSettings(boardId)) },
  });
  return blobToDataUrl(blob);
}

export function useWhiteboardSync({
  boardId,
  role,
  me,
  initialElements,
  managerIds = [],
  onCanvasBlocked,
}: {
  boardId: string;
  role: WhiteboardRole;
  me: Me;
  initialElements: Elements;
  /** Moderators, who may change any SHIFT canvas on this board: its owner and site admins on it. */
  managerIds?: readonly string[];
  /** Called when an edit inside someone else's SHIFT canvas was undone. */
  onCanvasBlocked?: () => void;
}) {
  const { id: myId, name: myName, avatarUrl: myAvatar } = me;
  const [mySocket] = useState(() => `${myId}:${crypto.randomUUID().slice(0, 8)}`);
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
  const following = useRef<string | null>(null);
  const listeners = useRef(new Map<BoardEvent, Set<(payload: unknown) => void>>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const lastSceneVersion = useRef(-1);
  // Who may change each SHIFT canvas; Postgres enforces the same rule on save (canvas-access.ts).
  const [guard] = useState(() => createCanvasGuard<OrderedExcalidrawElement>(initialElements));
  const managers = useRef<ReadonlySet<string>>(new Set());
  managers.current = new Set(managerIds);
  const onBlocked = useRef(onCanvasBlocked);
  onBlocked.current = onCanvasBlocked;
  const lastEditAt = useRef(0);
  const thumbVersion = useRef(-1);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const presentRef = useRef<PresentUser[]>([]);
  const cancelBackup = useRef<(() => void) | null>(null);
  const cancelCollaborators = useRef<(() => void) | null>(null);
  const lastSelection = useRef<unknown>(null);
  const lastSelectionAt = useRef(0);

  useEffect(() => {
    apiRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

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

  /** Writes the crash backup now, replacing any write still scheduled. */
  const writeBackup = useCallback(() => {
    cancelBackup.current?.();
    cancelBackup.current = null;
    // No canvas yet means no scene to compare: leave any backup for the restore effect to replay.
    if (!excalidrawAPI) return;
    try {
      const unsaved = changedSince(allElements(), savedSeen.current);
      if (unsaved.length) localStorage.setItem(backupKey(boardId), JSON.stringify(unsaved));
      else localStorage.removeItem(backupKey(boardId));
    } catch {
      // Storage full or blocked: the server save still runs.
    }
  }, [allElements, boardId, excalidrawAPI]);

  /** Writes the crash backup soon, off the hot path, so drags and typing do not stringify the scene every frame. */
  const scheduleBackup = useCallback(() => {
    if (cancelBackup.current) return;
    let cancelIdle: (() => void) | null = null;
    const timer = setTimeout(() => {
      cancelIdle = whenIdle(writeBackup, 1000);
    }, BACKUP_MS);
    cancelBackup.current = () => {
      clearTimeout(timer);
      cancelIdle?.();
    };
  }, [writeBackup]);

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

  /**
   * Puts this browser's copy right after a save, from Postgres's answer: elements it settled
   * differently (owners, authors, note versions) or left out (an edit this person may not make).
   * Only where nothing has changed here since the save was sent.
   */
  const applyCorrections = useCallback(
    (result: SaveResult | undefined, sent: Elements) => {
      if (!excalidrawAPI) return;
      const corrected = result?.corrected ?? [];
      const dropped = result?.dropped ?? [];
      if (corrected.length === 0 && dropped.length === 0) return;
      const sentById = new Map(sent.map((el) => [el.id, el]));
      const fix = new Map(corrected.map((el) => [el.id, el]));
      // Left out and never saved before: remove it here too, without saving or sending it again.
      for (const id of dropped) {
        const el = sentById.get(id);
        if (el && !fix.has(id)) fix.set(id, { ...el, isDeleted: true });
      }
      const applied: OrderedExcalidrawElement[] = [];
      const next = allElements().map((el) => {
        const replacement = fix.get(el.id);
        if (!replacement || el.version !== sentById.get(el.id)?.version) return el;
        applied.push(replacement);
        return replacement;
      });
      if (applied.length === 0) return;
      guard.trust(applied);
      markSeen(savedSeen.current, applied);
      markSeen(broadcastSeen.current, applied);
      excalidrawAPI.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.NEVER });
      lastSceneVersion.current = getSceneVersion(excalidrawAPI.getSceneElementsIncludingDeleted());
      if (dropped.length) onBlocked.current?.();
    },
    [allElements, excalidrawAPI, guard],
  );

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
          const result = await boardApi<SaveResult>(`/api/whiteboards/${boardId}`, {
            method: "PATCH",
            body: JSON.stringify({ elements: stampAuthor(changed, myId) }),
            keepalive: opts?.keepalive && JSON.stringify(changed).length < 60_000,
          });
          markSeen(savedSeen.current, changed);
          applyCorrections(result, changed);
          // Others show canvas edits from the database: tell them this save is through.
          send("saved", changed.length <= 1000 ? { ids: changed.map((el) => el.id) } : {});
          writeBackup();
          const more = changedSince(allElements(), savedSeen.current).length > 0;
          setSaveState(more ? "unsaved" : "saved");
          if (more) scheduleSave();
        } catch {
          writeBackup();
          setSaveState(navigator.onLine ? "error" : "offline");
          scheduleSave(5000);
        } finally {
          saving.current = null;
        }
      })();
      return saving.current;
    },
    [allElements, applyCorrections, boardId, editable, myId, scheduleSave, send, writeBackup],
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
      send("scene", { elements: stampAuthor(changed, myId) });
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
      // Undo edits inside SHIFT canvases this person may not change, and give new canvases
      // their owner; the corrected scene comes back through onChange and syncs from there.
      const { fixes, blocked } = guard.checkLocal(elements, myId, managers.current.has(myId));
      if (blocked) onBlocked.current?.();
      if (fixes.length) {
        const fixed = new Map(fixes.map((el) => [el.id, el]));
        excalidrawAPI.updateScene({
          elements: elements.map((el) => fixed.get(el.id) ?? el),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        return;
      }
      lastEditAt.current = Date.now();
      broadcastChanges.current(elements);
      if (hasChangedSince(elements, savedSeen.current)) {
        setSaveState((s) => (s === "saving" ? s : "unsaved"));
        scheduleSave();
        scheduleBackup();
      }
      void uploadFiles(files);
    },
    [allElements, editable, excalidrawAPI, guard, myId, scheduleBackup, scheduleSave, uploadFiles],
  );

  // The selection is read when the throttled message actually goes out, so a
  // payload that carries it is never dropped in favour of a later one without it.
  const sendCursor = useRef(
    throttle((payload: CursorPayload) => {
      const selection = apiRef.current?.getAppState().selectedElementIds;
      const now = Date.now();
      if (selection && (selection !== lastSelection.current || now - lastSelectionAt.current > SELECTION_RESEND_MS)) {
        lastSelection.current = selection;
        lastSelectionAt.current = now;
        payload = { ...payload, selectedElementIds: selection as Record<string, true> };
      }
      send("cursor", payload);
    }, CURSOR_MS),
  );

  const onPointerUpdate = useCallback(
    (update: { pointer: CursorPayload["pointer"]; button: "up" | "down" }) => {
      if (!channelRef.current) return;
      sendCursor.current({ socketId: mySocket, userId: myId, pointer: update.pointer, button: update.button });
    },
    [mySocket, myId],
  );

  // Follow mode: clicking someone's avatar follows their view. Who follows
  // whom lives in presence; the leader streams its view while anyone follows.
  const sendViewport = useRef(
    throttle(
      (bounds: Bounds) => send("cursor", { kind: "viewport", socketId: mySocket, bounds } satisfies ViewportPayload),
      VIEWPORT_MS,
    ),
  );
  const broadcastViewport = useCallback(() => {
    if (!excalidrawAPI || followers.current.size === 0) return;
    sendViewport.current(getVisibleSceneBounds(excalidrawAPI.getAppState()) as Bounds);
  }, [excalidrawAPI]);

  const onScrollChange = useCallback(() => broadcastViewport(), [broadcastViewport]);

  const trackMe = useCallback(async () => {
    await channelRef.current?.track({
      userId: myId,
      socketId: mySocket,
      name: myName,
      avatarUrl: myAvatar,
      role,
      following: following.current,
      visible: typeof document === "undefined" || document.visibilityState === "visible",
    } satisfies PresentUser);
  }, [myAvatar, myId, myName, mySocket, role]);

  // Tell the others when this tab is hidden, so a background tab never holds the thumbnail job.
  useEffect(() => {
    const onVisibility = () => {
      if (channelRef.current?.state === "joined") void trackMe();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [trackMe]);

  const onUserFollow = useCallback(
    (payload: OnUserFollowedPayload) => {
      following.current = payload.action === "FOLLOW" ? payload.userToFollow.socketId : null;
      void trackMe();
    },
    [trackMe],
  );

  // Excalidraw 0.18 reports these through its API, not as props.
  useEffect(() => {
    if (!excalidrawAPI) return;
    const offScroll = excalidrawAPI.onScrollChange(onScrollChange);
    const offFollow = excalidrawAPI.onUserFollow(onUserFollow);
    return () => {
      offScroll();
      offFollow();
    };
  }, [excalidrawAPI, onScrollChange, onUserFollow]);

  /**
   * Hands cursors and presence to Excalidraw at most once per frame. Each update
   * re-renders the editor, and a busy board sends dozens of cursor messages a second.
   */
  const pushCollaborators = useCallback(() => {
    if (!excalidrawAPI || cancelCollaborators.current) return;
    cancelCollaborators.current = nextFrame(() => {
      cancelCollaborators.current = null;
      excalidrawAPI.updateScene({
        collaborators: new Map(collaborators.current),
        captureUpdate: CaptureUpdateAction.NEVER,
      });
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

    // Edits from others are merged once per frame, however many messages arrive:
    // highest version per id wins, like the server merge.
    const remoteQueue = new Map<string, OrderedExcalidrawElement>();
    let cancelRemote: (() => void) | null = null;

    // Live edits that touch a SHIFT canvas, waiting for their saved copy: the version announced,
    // when the last live edit came, and when it was last fetched.
    const pending = new Map<string, { version: number; since: number; tried: number }>();
    let verifyTimer: ReturnType<typeof setTimeout> | null = null;
    let verifyAt = Infinity;
    let verifying = false;
    // A notice that came in during a fetch: fetch again straight after.
    let verifyAgain = false;
    let lastVerify = 0;
    let retryDelay = VERIFY_RETRY_MS;

    /**
     * Shows saved copies from the database, unless this browser has something newer, and trusts
     * what it shows. Returns the ids this browser is now caught up on (showing that copy or newer).
     */
    const applySaved = (saved: Elements): Set<string> => {
      const local = new Map(allElements().map((el) => [el.id, el]));
      const candidates = saved.filter((el) => (local.get(el.id)?.version ?? -1) <= el.version);
      if (candidates.length) {
        const merged = reconcileElements(
          allElements(),
          candidates as unknown as Parameters<typeof reconcileElements>[1],
          excalidrawAPI.getAppState(),
        );
        excalidrawAPI.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
        lastSceneVersion.current = getSceneVersion(excalidrawAPI.getSceneElementsIncludingDeleted());
        void fetchMissingFiles(candidates);
      }
      const shown = new Map(allElements().map((el) => [el.id, el]));
      const confirmed = saved.filter(
        (el) => shown.get(el.id)?.version === el.version && shown.get(el.id)?.versionNonce === el.versionNonce,
      );
      guard.trust(confirmed);
      markSeen(broadcastSeen.current, confirmed);
      markSeen(savedSeen.current, confirmed);
      return new Set(saved.filter((el) => (shown.get(el.id)?.version ?? -1) >= el.version).map((el) => el.id));
    };

    const verifyPending = async () => {
      verifyTimer = null;
      verifyAt = Infinity;
      if (verifying) {
        verifyAgain = true;
        return;
      }
      if (pending.size === 0) return;
      verifying = true;
      lastVerify = Date.now();
      // The ones asked about longest ago first, so a flood of made-up ids cannot starve real ones.
      const ids = [...pending.entries()]
        .sort((a, b) => a[1].tried - b[1].tried)
        .slice(0, 500)
        .map(([id]) => id);
      for (const id of ids) pending.get(id)!.tried = lastVerify;
      const saved = new Map<string, number>();
      let caughtUp = new Set<string>();
      try {
        const { elements } = await boardApi<{ elements: Elements }>(`/api/whiteboards/${boardId}/elements`, {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        if (cancelled) return;
        caughtUp = applySaved(elements);
        for (const el of elements) saved.set(el.id, el.version);
      } catch {
        // Tried again below.
      } finally {
        verifying = false;
      }
      let settled = false;
      const now = Date.now();
      for (const [id, wait] of pending) {
        // Done once the saved copy is as new as the live edit and on screen (not set aside because
        // someone here was typing in it).
        const done = caughtUp.has(id) && (saved.get(id) ?? -1) >= wait.version;
        settled ||= done;
        if (done || now - wait.since > VERIFY_GIVE_UP_MS) pending.delete(id);
      }
      // Nothing saved yet: the writer is still typing (their save waits for a pause), so ask less often.
      retryDelay = settled ? VERIFY_RETRY_MS : Math.min(retryDelay * 2, VERIFY_RETRY_MAX_MS);
      scheduleVerify(verifyAgain ? 0 : retryDelay);
      verifyAgain = false;
    };

    /** Fetches pending canvas edits after `delay`, or sooner if already planned; never more than once a second. */
    const scheduleVerify = (delay: number) => {
      if (cancelled || pending.size === 0) return;
      const at = Math.max(Date.now() + delay, lastVerify + VERIFY_MIN_GAP_MS);
      if (verifyTimer && verifyAt <= at) return;
      if (verifyTimer) clearTimeout(verifyTimer);
      verifyAt = at;
      verifyTimer = setTimeout(() => void verifyPending(), at - Date.now());
    };

    const applyRemote = () => {
      cancelRemote = null;
      if (remoteQueue.size === 0) return;
      // Edits that touch a SHIFT canvas wait for the copy Postgres saved; the rest show now.
      const { apply: remote, verify } = guard.filterRemote([...remoteQueue.values()]);
      remoteQueue.clear();
      if (verify.size) {
        const now = Date.now();
        for (const [id, version] of verify) {
          const wait = pending.get(id);
          pending.set(id, { version: Math.max(version, wait?.version ?? 0), since: now, tried: wait?.tried ?? 0 });
        }
        scheduleVerify(VERIFY_FALLBACK_MS);
      }
      if (remote.length === 0) return;
      const merged = reconcileElements(
        allElements(),
        remote as unknown as Parameters<typeof reconcileElements>[1],
        excalidrawAPI.getAppState(),
      );
      // Remote changes are already broadcast and saved by their author. Mark
      // them before updateScene, whose onChange must not echo or re-save them.
      markSeen(broadcastSeen.current, remote);
      markSeen(savedSeen.current, remote);
      excalidrawAPI.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
      lastSceneVersion.current = getSceneVersion(excalidrawAPI.getSceneElementsIncludingDeleted());
      void fetchMissingFiles(remote);
    };

    const queueRemote = (remote: Elements) => {
      queueLatest(remoteQueue, remote);
      cancelRemote ??= nextFrame(applyRemote);
    };

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const channel = supabase.channel(boardTopic(boardId), {
        config: { private: true, broadcast: { self: false }, presence: { key: mySocket } },
      });
      channelRef.current = channel;

      for (const event of EXTRA_EVENTS) {
        channel.on("broadcast", { event }, ({ payload }) => listeners.current.get(event)?.forEach((fn) => fn(payload)));
      }

      channel
        .on("broadcast", { event: "scene" }, ({ payload }) => queueRemote((payload as { elements: Elements }).elements))
        .on("broadcast", { event: "saved" }, ({ payload }) => {
          // Someone's save is through: fetch their canvas edits, including ones this browser
          // stopped waiting for (a save that came late) as long as they touched a canvas.
          const ids = (payload as { ids?: unknown } | null)?.ids;
          if (!Array.isArray(ids)) return scheduleVerify(0);
          const now = Date.now();
          let wanted = false;
          for (const id of ids.slice(0, 1000)) {
            if (typeof id !== "string" || !(pending.has(id) || guard.isHeld(id))) continue;
            wanted = true;
            if (!pending.has(id)) pending.set(id, { version: 0, since: now, tried: 0 });
          }
          if (wanted) scheduleVerify(0);
        })
        .on("broadcast", { event: "files" }, () => void fetchMissingFiles(allElements()))
        .on("broadcast", { event: "hello" }, () => {
          // A newcomer loaded the saved board; send them anything not saved yet.
          if (!editable) return;
          const unsaved = changedSince(allElements(), savedSeen.current);
          if (unsaved.length) send("scene", { elements: stampAuthor(unsaved, myId) });
        })
        .on("broadcast", { event: "cursor" }, ({ payload }) => {
          const p = payload as AwarenessPayload;
          if (p.socketId === mySocket) return;
          if (p.kind === "viewport") {
            const appState = excalidrawAPI.getAppState();
            if (appState.userToFollow?.socketId !== p.socketId) return;
            const next = zoomToFitBounds({ bounds: p.bounds as never, appState, fitToViewport: true, viewportZoomFactor: 1 });
            excalidrawAPI.updateScene({ appState: next.appState, captureUpdate: CaptureUpdateAction.NEVER });
            return;
          }
          const key = p.socketId as SocketId;
          const prev = collaborators.current.get(key);
          const unchanged =
            !p.selectedElementIds &&
            prev?.pointer?.x === p.pointer.x &&
            prev.pointer.y === p.pointer.y &&
            prev.pointer.tool === p.pointer.tool &&
            prev.button === p.button;
          if (unchanged) return;
          collaborators.current.set(key, {
            ...prev,
            id: p.userId,
            socketId: key,
            pointer: p.pointer,
            button: p.button,
            // Senders omit the selection when it has not changed.
            selectedElementIds: p.selectedElementIds ?? prev?.selectedElementIds,
            color: colorFor(p.userId),
          });
          pushCollaborators();
        })
        .on("presence", { event: "sync" }, () => {
          const users = Object.values(channel.presenceState<PresentUser>())
            .map((metas) => metas[0])
            .filter(Boolean) as PresentUser[];
          presentRef.current = users;
          setPresent(users);

          // Followers come from presence; a new one gets the current view straight away.
          const nextFollowers = new Set(users.filter((u) => u.following === mySocket).map((u) => u.socketId));
          const gained = [...nextFollowers].some((id) => !followers.current.has(id));
          followers.current = nextFollowers;
          if (gained) sendViewport.current(getVisibleSceneBounds(excalidrawAPI.getAppState()) as Bounds);

          // Stop following someone who left.
          const online = new Set(users.map((u) => u.socketId));
          const leader = excalidrawAPI.getAppState().userToFollow;
          if (leader && !online.has(leader.socketId)) {
            following.current = null;
            excalidrawAPI.updateScene({ appState: { userToFollow: null }, captureUpdate: CaptureUpdateAction.NEVER });
            void trackMe();
          }

          const next = new Map<SocketId, Collaborator>();
          for (const u of users) {
            const key = u.socketId as SocketId;
            next.set(key, {
              ...collaborators.current.get(key),
              id: u.userId,
              socketId: key,
              username: u.name,
              avatarUrl: u.avatarUrl ?? undefined,
              color: colorFor(u.userId),
              isCurrentUser: u.socketId === mySocket,
            });
          }
          collaborators.current = next;
          pushCollaborators();
        })
        .subscribe(async (status, error) => {
          if (status === "SUBSCRIBED") {
            setConnected(true);
            await trackMe();
            send("hello", {});
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (status !== "CLOSED") console.warn(`Whiteboard realtime ${status}`, error?.message);
            setConnected(false);
          }
        });
    })();

    return () => {
      cancelled = true;
      // Apply what already arrived, so no remote edit is lost on a re-subscribe.
      if (cancelRemote) {
        cancelRemote();
        try {
          applyRemote();
        } catch {
          // The canvas is already gone.
        }
      }
      if (verifyTimer) clearTimeout(verifyTimer);
      cancelCollaborators.current?.();
      cancelCollaborators.current = null;
      setConnected(false);
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [allElements, boardId, editable, excalidrawAPI, fetchMissingFiles, guard, myId, mySocket, pushCollaborators, send, trackMe]);

  // Small preview for the board list. Only one editor makes it: the one with
  // the visible editor with the lowest socketId (a tie is harmless), in idle time.
  useEffect(() => {
    if (!editable || !excalidrawAPI) return;
    let cancelIdle: (() => void) | null = null;
    const run = async () => {
      cancelIdle = null;
      if (document.hidden) return;
      const version = getSceneVersion(excalidrawAPI.getSceneElements());
      if (version === thumbVersion.current) return;
      thumbVersion.current = version;
      try {
        const thumbnail = await boardThumbnail(excalidrawAPI, boardId);
        if (thumbnail) {
          await boardApi(`/api/whiteboards/${boardId}`, { method: "PATCH", body: JSON.stringify({ thumbnail }) });
        }
      } catch {
        // A missing preview is fine; the next tick tries again.
        thumbVersion.current = -1;
      }
    };
    const timer = setInterval(() => {
      if (document.hidden || cancelIdle) return;
      // Exporting blocks the page, so skip ticks while someone here is drawing.
      if (Date.now() - lastEditAt.current < THUMBNAIL_QUIET_MS) return;
      const editors = presentRef.current
        .filter((u) => canEdit(u.role) && u.visible !== false)
        .map((u) => u.socketId);
      const leader = editors.length ? editors.reduce((a, b) => (b < a ? b : a)) : mySocket;
      if (leader !== mySocket) return;
      cancelIdle = whenIdle(() => void run(), 5000);
    }, THUMBNAIL_MS);
    return () => {
      clearInterval(timer);
      cancelIdle?.();
    };
  }, [boardId, editable, excalidrawAPI, mySocket]);

  // Save what is left when the tab goes away.
  useEffect(() => {
    if (!editable) return;
    // The backup is written synchronously first (replacing any scheduled write); the keepalive save is async.
    const flush = () => {
      writeBackup();
      void save({ keepalive: true });
    };
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
  }, [editable, save, scheduleSave, writeBackup]);

  // Warn before closing with unsaved work.
  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const refreshFiles = useCallback(() => void fetchMissingFiles(allElements()), [allElements, fetchMissingFiles]);

  return useMemo(
    () => ({
      excalidrawAPI,
      setExcalidrawAPI,
      onChange,
      onPointerUpdate,
      saveNow,
      refreshFiles,
      send,
      on,
      saveState,
      present,
      connected,
    }),
    [excalidrawAPI, onChange, onPointerUpdate, saveNow, refreshFiles, send, on, saveState, present, connected],
  );
}
