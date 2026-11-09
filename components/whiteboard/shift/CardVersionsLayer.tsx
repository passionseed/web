"use client";

import { CaptureUpdateAction, newElementWith, sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, ExcalidrawTextElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { History, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  addVersion,
  type CardVersion,
  hasUnsavedEdit,
  isVersionedCard,
  isWritten,
  MAX_WHY,
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
      {chips.map(({ card, versions, text, selected, pos }) => {
        const latest = versions.at(-1);
        const edited = hasUnsavedEdit(card.customData, text);
        return (
          <button
            key={card.id}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpenId(openId === card.id ? null : card.id)}
            title="ประวัติเวอร์ชัน · Versions"
            className={`pointer-events-auto absolute flex -translate-x-full -translate-y-full items-center gap-1 rounded-full rounded-br-none px-2 py-0.5 text-[11px] font-semibold shadow transition-transform hover:scale-105 ${
              selected ? "bg-neutral-900 text-white" : "bg-white/90 text-neutral-800 ring-1 ring-black/10"
            }`}
            style={{ left: pos.x, top: pos.y - 2 }}
          >
            <History className="h-3 w-3" />
            {latest ? `v${latest.v}${edited ? " · แก้อยู่" : ""}` : "เก็บเวอร์ชัน"}
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
          onClose={() => setOpenId(null)}
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
  const { at, kind, versions, text, editable, nameOf } = props;
  const [why, setWhy] = useState("");
  const latest = versions.at(-1);
  const written = isWritten(kind, text);
  const unchanged = Boolean(latest) && !hasUnsavedEdit({ versions }, text);
  const hint = !written
    ? "เขียนบนการ์ดก่อน แล้วค่อยเก็บเวอร์ชัน"
    : unchanged
      ? `ยังเหมือน v${latest!.v} อยู่ แก้ข้อความบนการ์ดก่อน`
      : null;

  // Opens to the right of the card, so the card's text stays visible next to its history.
  const width = 320;
  const left = Math.min(Math.max(at.x + 8, 8), (typeof window !== "undefined" ? window.innerWidth : 1200) - width - 8);
  const top = Math.min(Math.max(at.y - 10, 70), (typeof window !== "undefined" ? window.innerHeight : 800) - 420);

  return (
    <div
      className="pointer-events-auto absolute rounded-xl border border-black/10 bg-white text-neutral-900 shadow-2xl"
      style={{ left, top, width }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
        <p className="text-sm font-semibold">
          {SHIFT_CARDS[kind].emoji} {shortTitle(kind)}
          {latest && <span className="ml-1 font-normal opacity-60">· v{latest.v}</span>}
        </p>
        <button type="button" onClick={props.onClose} aria-label="Close" className="rounded p-1 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      </div>

      {editable && (
        <div className="space-y-2 border-b border-black/5 p-3">
          {latest && (
            <textarea
              value={why}
              rows={2}
              maxLength={MAX_WHY}
              placeholder="เปลี่ยนเพราะอะไร? เช่น คุยกับพี่เภสัชแล้วเจอว่า... (ไม่ใส่ก็ได้)"
              onChange={(e) => setWhy(e.target.value)}
              className="w-full resize-none rounded-lg border border-black/10 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
          )}
          <button
            type="button"
            disabled={Boolean(hint)}
            onClick={() => props.onSave(why) && setWhy("")}
            className="w-full rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            เก็บเป็น v{(latest?.v ?? 0) + 1} · Save version
          </button>
          {hint && <p className="text-xs opacity-60">{hint}</p>}
        </div>
      )}

      {versions.length === 0 ? (
        <p className="p-3 text-xs opacity-60">
          ยังไม่มีเวอร์ชัน เก็บไว้ทุกครั้งที่ความคิดเปลี่ยน จะได้เห็นว่าโปรเจกต์คมขึ้นยังไง
        </p>
      ) : (
        <ol className="max-h-72 space-y-3 overflow-y-auto p-3">
          {[...versions].reverse().map((v) => (
            <li key={v.v} className="text-xs">
              <p className="font-semibold">
                v{v.v} <span className="font-normal opacity-60">· {when(v.at)} · {nameOf(v.by)}</span>
              </p>
              {v.why && <p className="mt-0.5 text-orange-700">เพราะ: {v.why}</p>}
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-neutral-50 p-2 opacity-80">{v.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
