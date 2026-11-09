"use client";

import { CaptureUpdateAction, newElementWith, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, ExcalidrawTextElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { History, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  addVersion,
  answerOf,
  type CardVersion,
  hasUnsavedEdit,
  isVersionedCard,
  isWritten,
  MAX_WHY,
  newLines,
  readVersions,
  SHIFT_CARDS,
  shortTitle,
  type ShiftCardKind,
} from "@/lib/whiteboard/shift-cards";

import { useViewportTick } from "../CommentsLayer";

type Props = {
  api: ExcalidrawImperativeAPI;
  meId: string;
  editable: boolean;
  nameOf: (id: string) => string;
};

const MAX_CHIPS = 300;
const PANEL_WIDTH = 320;
/** The panel keeps at least this much of itself on screen; the history list scrolls inside it. */
const PANEL_MIN_HEIGHT = 240;
/** Space between the panel and the card, and the screen's edges. */
const EDGE = 12;

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

const labelText = (label: ExcalidrawTextElement | undefined) => label?.originalText ?? label?.text ?? "";

/**
 * Saves the card's current text as its next version, stored in the card's
 * customData so it syncs, undoes and travels with the card like any edit.
 * Returns the new version number, or null when there was nothing new to save.
 */
function saveVersion(api: ExcalidrawImperativeAPI, cardId: string, meId: string, why: string): number | null {
  const all = api.getSceneElementsIncludingDeleted();
  const card = all.find((el) => el.id === cardId && !el.isDeleted);
  const kind = card?.customData?.card;
  if (!card || !isVersionedCard(kind)) return null;
  const label = all.find((el) => el.type === "text" && el.containerId === cardId && !el.isDeleted) as
    | ExcalidrawTextElement
    | undefined;
  const next = addVersion(kind, card.customData, { text: labelText(label), by: meId, at: new Date().toISOString(), why });
  if (!next) return null;
  api.updateScene({
    elements: all.map((el) => (el.id === cardId ? newElementWith(el as ExcalidrawElement, { customData: next }) : el)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return readVersions(next).at(-1)?.v ?? null;
}

/**
 * Version chips on SHIFT cards that keep versions (problem, target user, idea,
 * ship): a "v2" tag on each card with saved versions, a save button on the
 * selected card, and a panel with the card's history.
 */
export function CardVersionsLayer({ api, meId, editable, nameOf }: Props) {
  useViewportTick(api, { elements: true, selection: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  // Closing hands focus back to the chip that opened the panel.
  const close = useCallback(() => {
    setOpenId((id) => {
      if (id) requestAnimationFrame(() => chipRefs.current.get(id)?.focus());
      return null;
    });
  }, []);

  // Escape while focus is on the canvas; the panel handles its own Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const appState = api.getAppState();
  const elements = api.getSceneElements();
  const labels = new Map<string, ExcalidrawTextElement>();
  for (const el of elements) if (el.type === "text" && el.containerId) labels.set(el.containerId, el);

  const selectedIds = Object.keys(appState.selectedElementIds);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  const chips = elements
    .filter((el) => el.type === "rectangle" && isVersionedCard(el.customData?.card))
    .flatMap((card) => {
      const versions = readVersions(card.customData);
      const label = labels.get(card.id);
      const selected = selectedId !== null && (card.id === selectedId || label?.id === selectedId);
      if (versions.length === 0 && !(selected && editable)) return [];
      const pos = sceneCoordsToViewportCoords({ sceneX: card.x + card.width, sceneY: card.y }, appState);
      const text = labelText(label);
      return [{ card, kind: card.customData!.card as ShiftCardKind, versions, text, selected, pos }];
    })
    .slice(0, MAX_CHIPS);

  const open = chips.find((c) => c.card.id === openId);

  return (
    <>
    {/* Chips sit under Excalidraw's own menus, like the other overlays. */}
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {chips.map(({ card, kind, versions, text, selected, pos }) => {
        const latest = versions.at(-1);
        const edited = hasUnsavedEdit(card.customData, text);
        const label = latest ? `v${latest.v}${edited ? " · แก้อยู่" : ""}` : "เก็บเวอร์ชัน";
        return (
          <button
            key={card.id}
            ref={(el) => {
              if (el) chipRefs.current.set(card.id, el);
              else chipRefs.current.delete(card.id);
            }}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => (openId === card.id ? close() : setOpenId(card.id))}
            aria-haspopup="dialog"
            aria-expanded={openId === card.id}
            aria-label={`เวอร์ชันของการ์ด${shortTitle(kind)}: ${label}`}
            title="ประวัติเวอร์ชัน · Versions"
            className={`wb-version-chip pointer-events-auto absolute flex -translate-x-full -translate-y-full items-center gap-1 rounded-full rounded-br-none px-2.5 text-xs font-semibold ${
              selected ? "wb-version-chip--on" : ""
            }`}
            style={{ left: pos.x, top: pos.y - 2 }}
          >
            <History className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>

    {/* The panel sits above Excalidraw's menus: selecting a card opens its style panel on the left. */}
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {open && (
        <VersionPanel
          key={open.card.id}
          at={open.pos}
          kind={open.kind}
          versions={open.versions}
          text={open.text}
          editable={editable}
          nameOf={nameOf}
          onClose={close}
          onSave={(why) => {
            const v = saveVersion(api, open.card.id, meId, why);
            if (v) api.setToast({ message: `เก็บ v${v} แล้ว · Saved v${v}`, duration: 1500 });
            return v !== null;
          }}
        />
      )}
    </div>
    </>
  );
}

function VersionPanel(props: {
  at: { x: number; y: number };
  kind: ShiftCardKind;
  versions: CardVersion[];
  text: string;
  editable: boolean;
  nameOf: (id: string) => string;
  onClose: () => void;
  onSave: (why: string) => boolean;
}) {
  const { at, kind, versions, text, editable, nameOf, onClose } = props;
  const [why, setWhy] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  // Focus moves into the panel when it opens: the reason field, else the save button, else close.
  useEffect(() => {
    const root = panel.current;
    const target =
      root?.querySelector<HTMLElement>("textarea") ??
      root?.querySelector<HTMLElement>("[data-save]:not(:disabled)") ??
      root?.querySelector<HTMLElement>("button");
    target?.focus();
  }, []);

  // Excalidraw catches Escape in text fields before React sees it (it only blurs the field),
  // so listen on the window in the capture phase for an Escape from inside this panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);
  const latest = versions.at(-1);
  const written = isWritten(kind, text);
  const unchanged = Boolean(latest) && !hasUnsavedEdit({ versions }, text);
  const next = (latest?.v ?? 0) + 1;
  // Nothing to save: one quiet line instead of a disabled form.
  const idle = !written
    ? "เขียนคำตอบบนการ์ดก่อน แล้วค่อยเก็บเวอร์ชัน"
    : unchanged
      ? `ตรงกับ v${latest!.v} แล้ว แก้การ์ดเมื่อความคิดเปลี่ยน แล้วค่อยเก็บ v${next}`
      : null;

  // Opens to the right of the card, so the card's text stays visible next to its history,
  // and never runs off the screen: it is at most as tall as the space below it, and the list scrolls.
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewH = typeof window !== "undefined" ? window.innerHeight : 800;
  const width = Math.min(PANEL_WIDTH, viewW - 2 * EDGE);
  const left = Math.min(Math.max(at.x + EDGE, EDGE), viewW - width - EDGE);
  const top = Math.min(Math.max(at.y - EDGE, EDGE), viewH - PANEL_MIN_HEIGHT - EDGE);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={`ประวัติเวอร์ชัน: ${shortTitle(kind)}`}
      className="wb-window wb-version-panel pointer-events-auto absolute flex flex-col"
      style={{ left, top, width, maxHeight: viewH - top - EDGE }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between wb-rule border-b px-3 py-2">
        <p className="text-sm font-semibold">
          {SHIFT_CARDS[kind].emoji} {shortTitle(kind)}
          {latest && <span className="wb-soft ml-1 font-normal">· v{latest.v}</span>}
        </p>
        <button type="button" onClick={onClose} aria-label="ปิด · Close" className="wb-soft rounded-md p-1.5 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>

      {editable && idle && <p className="wb-rule wb-soft border-b px-3 py-2.5 text-xs">{idle}</p>}
      {editable && !idle && (
        <div className="space-y-2 wb-rule border-b p-3">
          {latest && (
            <label className="block space-y-1">
              <span className="text-xs font-medium">เปลี่ยนเพราะอะไร (ไม่ใส่ก็ได้)</span>
              <textarea
                value={why}
                rows={2}
                maxLength={MAX_WHY}
                placeholder="เช่น คุยกับพี่เภสัชแล้วเจอว่า…"
                onChange={(e) => setWhy(e.target.value)}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm"
              />
            </label>
          )}
          <button
            type="button"
            data-save
            onClick={() => props.onSave(why) && setWhy("")}
            className="wb-save w-full rounded-lg px-3 py-2 text-sm font-medium"
          >
            เก็บเป็น v{next} · Save version
          </button>
        </div>
      )}

      {versions.length === 0 ? (
        <p className="wb-soft p-3 text-xs">
          ยังไม่มีเวอร์ชัน เก็บไว้ทุกครั้งที่ความคิดเปลี่ยน จะได้เห็นว่าโปรเจกต์คมขึ้นยังไง
        </p>
      ) : (
        <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {[...versions].reverse().map((v, i, list) => (
            <li key={v.v} className="text-xs">
              <p className="font-semibold">
                v{v.v} <span className="wb-soft font-normal">· {when(v.at)} · {nameOf(v.by)}</span>
              </p>
              {v.why && <p className="wb-why mt-0.5">เพราะ: {v.why}</p>}
              <VersionAnswer kind={kind} text={v.text} previous={list[i + 1]?.text} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * One version's answer, without the card's header and question, with the lines
 * that are new since the version before it marked, so a student sees how their
 * thinking changed.
 */
function VersionAnswer({ kind, text, previous }: { kind: ShiftCardKind; text: string; previous?: string }) {
  const answer = answerOf(kind, text);
  if (!answer) return <p className="wb-quote wb-soft mt-1 rounded-md p-2">(ยังไม่มีคำตอบ)</p>;
  const added = previous === undefined ? new Set<number>() : newLines(answerOf(kind, previous), answer);
  return (
    <p className="wb-quote mt-1 whitespace-pre-wrap rounded-md p-2">
      {answer.split("\n").map((line, i) => (
        <span key={i} className={added.has(i) ? "wb-new" : undefined}>
          {line}
          {"\n"}
        </span>
      ))}
    </p>
  );
}
