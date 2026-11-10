"use client";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, SocketId } from "@excalidraw/excalidraw/types";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { colorFor } from "@/lib/whiteboard/core";

import type { PresentUser } from "../useWhiteboardSync";
import { focusCanvas } from "./useActiveTool";
import { useDismiss } from "./useDismiss";

const MAX_FACES = 3;
/** Excalidraw's phone layout starts below 730px; the card has room for one face there. */
const NARROW = "(max-width: 729px)";

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

type Person = { userId: string; socketId: string; name: string; avatarUrl: string | null };

function Face({ person, size = 32 }: { person: Person; size?: number }) {
  const color = colorFor(person.userId).background;
  return (
    <span className="wb-face" style={{ width: size, height: size, ["--wb-face-ring" as string]: color }}>
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="wb-face__initial" style={{ background: color }}>
          {person.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** Who Excalidraw is following now, kept in sync with its follow events. */
function useFollowing(api: ExcalidrawImperativeAPI | null) {
  const [following, setFollowing] = useState<string | null>(null);
  useEffect(() => {
    if (!api) return;
    setFollowing(api.getAppState().userToFollow?.socketId ?? null);
    return api.onUserFollow(() => {
      // The event fires before the state settles on an unfollow + follow pair; read it after.
      queueMicrotask(() => setFollowing(api.getAppState().userToFollow?.socketId ?? null));
    });
  }, [api]);

  const toggle = useCallback(
    (person: Person) => {
      if (!api) return;
      const current = api.getAppState().userToFollow?.socketId ?? null;
      api.updateScene({
        appState: {
          userToFollow:
            current === person.socketId ? null : { socketId: person.socketId as SocketId, username: person.name },
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      // This card is outside Excalidraw's container: hand focus back so shortcuts keep working.
      focusCanvas();
    },
    [api],
  );
  return { following, toggle };
}

/**
 * The top-right card: everyone else on the board (click a face to follow their
 * view, again to stop), the shared timer and the Share button.
 */
export const PeopleCorner = memo(function PeopleCorner({
  api,
  present,
  meId,
  timer,
  onShare,
}: {
  api: ExcalidrawImperativeAPI | null;
  present: PresentUser[];
  meId: string;
  timer: ReactNode;
  onShare: () => void;
}) {
  // One face per person (their first tab), without me.
  const people = useMemo(() => {
    const seen = new Set<string>([meId]);
    const list: Person[] = [];
    for (const p of present) {
      if (seen.has(p.userId)) continue;
      seen.add(p.userId);
      list.push({ userId: p.userId, socketId: p.socketId, name: p.name, avatarUrl: p.avatarUrl });
    }
    return list;
  }, [present, meId]);
  const { following, toggle } = useFollowing(api);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const closeMore = useCallback(() => {
    setMoreOpen(false);
    focusCanvas();
  }, []);
  useDismiss(moreRef, moreOpen, closeMore);

  const narrow = useNarrow();
  const max = narrow ? 1 : MAX_FACES;
  const followed = people.find((p) => p.socketId === following);
  // Keep the person being followed in view even when the list is long.
  const faces = followed && !people.slice(0, max).includes(followed) ? [followed, ...people.slice(0, max - 1)] : people.slice(0, max);
  const extra = people.length - faces.length;

  const faceButton = (p: Person) => {
    const on = p.socketId === following;
    const label = on ? `เลิกติดตาม ${p.name} · Stop following` : `ติดตามมุมมองของ ${p.name} · Follow ${p.name}`;
    return (
      <button
        key={p.socketId}
        type="button"
        onClick={() => toggle(p)}
        aria-label={label}
        aria-pressed={on}
        data-tip={label}
        data-tip-side="bottom"
        className={`wb-face-button ${on ? "wb-face-button--on" : ""}`}
      >
        <Face person={p} />
      </button>
    );
  };

  return (
    <div className="wb-corner wb-corner--right">
      {people.length > 0 && (
        <div className="wb-faces" ref={moreRef}>
          {faces.map(faceButton)}
          {extra > 0 && (
            <button
              type="button"
              onClick={() => (moreOpen ? closeMore() : setMoreOpen(true))}
              aria-expanded={moreOpen}
              aria-label={`อีก ${extra} คน · ${extra} more`}
              data-tip={`ทุกคนในบอร์ด · Everyone here (${people.length})`}
              data-tip-side="bottom"
              className="wb-face-button"
            >
              <span className="wb-face wb-face--more">+{extra}</span>
            </button>
          )}
          {moreOpen && (
            <div className="wb-popover wb-popover--down right-0 w-64 p-1.5" role="menu">
              <p className="wb-popover__label">ออนไลน์ตอนนี้ · Online now</p>
              <ul className="max-h-72 overflow-y-auto">
                {people.map((p) => {
                  const on = p.socketId === following;
                  return (
                    <li key={p.socketId}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          toggle(p);
                          setMoreOpen(false);
                        }}
                        className="wb-row"
                      >
                        <Face person={p} size={28} />
                        <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                        <span className="text-xs opacity-60">{on ? "กำลังติดตาม · Following" : "ติดตาม · Follow"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
      {timer}
      <button type="button" onClick={onShare} aria-label="แชร์บอร์ด · Share board" className="wb-share">
        {narrow ? "แชร์" : "แชร์ · Share"}
      </button>
    </div>
  );
});
