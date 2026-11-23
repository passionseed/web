"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { bangkokTime, shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import {
  BOARD_STAGES,
  buildPipelineWrite,
  columnSummaries,
  compareForList,
  ELEMENT_LABEL,
  KIND_LABEL,
  LOCAL_WRITE_GRACE_MS,
  matchesFilter,
  mergeServerItems,
  NEEDS_NEXT_STEP,
  noReasonLine,
  PIPELINE_ELEMENTS,
  PIPELINE_KINDS,
  PIPELINE_STAGES,
  pipelineProgress,
  STAGE_LABEL,
  STAGE_WEIGHT_GUESS,
  type PipelineCreateInput,
  type PipelineItem,
  type PipelineKind,
  type PipelineStage,
  type PipelineUpdateInput,
} from "@/lib/hackathon/elemental/pipeline";
import type { Owner } from "@/lib/hackathon/elemental/targets";
import { cn } from "@/lib/utils";

import { useOwnerPref } from "./owner-pref";
import { OwnerSelect } from "./OwnerSelect";
import { apiCreate, apiDelete, apiImport, apiUpdate } from "./pipeline-api";
import { parsePipelineHash, PIPELINE_FOCUS_EVENT, type PipelineFocus } from "./pipeline-focus";
import { formatBaht, PipelineCardGhost } from "./PipelineCard";
import { NoPileCollapsed, PipelineColumn, type QuickAddExtra } from "./PipelineColumn";
import { PipelineSheet } from "./PipelineSheet";
import { PipelineTable } from "./PipelineTable";
import { PasteImportDialog } from "./PasteImportDialog";
import { DashSection, ProgressRow, QuietNotice, Stat } from "./ProgressMeter";
import { StageMoveDialog, type MoveAnswer, type MoveRequest } from "./StageMoveDialog";

export type PipelineState =
  | { status: "ok"; items: PipelineItem[] }
  | { status: "not_set_up"; migration: string }
  | { status: "failed" };

let tempSeq = 0;

/**
 * Per-card bookkeeping for saves in flight. Responses can come back out of
 * order, so the card keeps its optimistic look until every save for it has
 * settled, then shows the newest row the server confirmed.
 */
type SaveTrack = { seq: number; applied: number; inFlight: number; confirmed: PipelineItem };

type MoveFocus = { id: string; from: "left" | "right" };

type View = "list" | "board";

// ---------------------------------------------------------------------------
// Small hooks

const WIDE = "(min-width: 768px)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/** True at the md breakpoint and up. False on the server, so phones never flash the board. */
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

const weightsNote = BOARD_STAGES.map((s) => `${STAGE_LABEL[s].toLowerCase()} ${Math.round(STAGE_WEIGHT_GUESS[s] * 100)}%`).join(", ");

// ---------------------------------------------------------------------------
// Progress block

function PipelineProgressBlock({ items }: { items: PipelineItem[] }) {
  const p = useMemo(() => pipelineProgress(items), [items]);
  return (
    <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
      <div>
        <ProgressRow
          label="Cash signed"
          hint={p.cashYes > 0 ? `+${formatBaht(p.cashYes)} at yes` : "vs prize pool"}
          value={p.cashSigned}
          extra={p.cashYes}
          target={p.prizePool}
          format={formatBaht}
        />
        <p className="-mt-1 pb-2 text-xs tabular-nums text-muted-foreground">
          {p.sponsorsSigned} of {p.sponsorsTarget} sponsors signed by {shortDate(p.sponsorsBy)}
          {p.sponsorsYes > 0 && `, ${p.sponsorsYes} at yes`}
          {p.sponsorsTalking > 0 && `, ${p.sponsorsTalking} talking`}
        </p>
      </div>
      <div>
        <ProgressRow
          label="Voices, one per element"
          hint={`by ${shortDate(p.voicesBy)}`}
          value={p.elementsCovered.length}
          target={p.voicesTarget}
        />
        <div className="-mt-0.5 flex flex-wrap gap-1.5 pb-2 text-[11px]">
          {PIPELINE_ELEMENTS.map((e) => {
            const has = p.elementsCovered.includes(e);
            return (
              <span
                key={e}
                className={cn(
                  "rounded border px-1.5 py-px",
                  has ? "border-foreground/30 text-foreground" : "border-dashed text-muted-foreground",
                )}
              >
                {ELEMENT_LABEL[e]}
                <span className="sr-only">{has ? ": has a voice" : ": none yet"}</span>
              </span>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:col-span-2">
        <Stat label="Merchandise, yes or signed" value={formatBaht(p.inKindValue)} detail="kept apart from cash" />
        <Stat label="Partners, yes or signed" value={p.partnersCommitted} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section

/** The sponsor / partner / speaker pipeline. Starts empty; names come from the team. */
export function PipelineSection({
  state,
  today,
  loadedAt,
}: {
  state: PipelineState;
  today: string;
  /** When the server read this data (ISO), shown as "Updated 14:02". */
  loadedAt: string;
}) {
  if (state.status !== "ok") {
    return (
      <DashSection id="pipeline" title="Pipeline">
        <QuietNotice>
          {state.status === "not_set_up"
            ? `Pipeline table not set up yet: apply migration ${state.migration}`
            : "The pipeline did not load, so this is not an empty list. Refresh to try again."}
        </QuietNotice>
      </DashSection>
    );
  }
  return <PipelineBoard initialItems={state.items} today={today} loadedAt={loadedAt} />;
}

function PipelineBoard({
  initialItems,
  today,
  loadedAt,
}: {
  initialItems: PipelineItem[];
  today: string;
  loadedAt: string;
}) {
  const [items, setItems] = useState<PipelineItem[]>(initialItems);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [kind, setKind] = useState<PipelineKind>("sponsor");
  const [openId, setOpenId] = useState<string | null>(null);
  // The sheet stays mounted (keyed on the last card opened) while it slides out.
  const [sheet, setSheet] = useState<{ id: string; n: number } | null>(null);
  const saves = useRef(new Map<string, SaveTrack>());
  const creating = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef<MoveFocus | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [showNo, setShowNo] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [moveReq, setMoveReqState] = useState<MoveRequest | null>(null);
  // Where focus was when the move dialog opened, to go back to when it closes.
  const returnFocus = useRef<HTMLElement | null>(null);
  const setMoveReq = (req: MoveRequest | null) => {
    if (req) returnFocus.current = document.activeElement as HTMLElement | null;
    setMoveReqState(req);
  };
  const restoreFocus = () => {
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus());
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState("");
  const [pickedOwner, setNewOwner] = useState<Owner | null | undefined>(undefined);
  const ownerPref = useOwnerPref();
  const defaultOwner: Owner | null = ownerPref === "all" ? null : ownerPref;
  const newOwner = pickedOwner === undefined ? defaultOwner : pickedOwner;
  const wide = useWide();
  const [chosenView, setView] = useState<View | null>(null);
  const view: View = chosenView ?? (wide ? "board" : "list");

  // Fresh server data (router.refresh) is merged into the board, but never
  // while someone is dragging, editing, answering a move, or a save is in
  // flight. Data that arrives then waits in `pending` and is merged once the
  // board is free. The merge keeps rows saved here more recently than the
  // read, and keeps cards added or deleted here in the last two minutes.
  const busy = draggingId !== null || openId !== null || moveReq !== null || pasteOpen;
  const recentlyDeleted = useRef(new Map<string, number>());
  const recentlyCreated = useRef(new Map<string, number>());
  const pending = useRef<{ items: PipelineItem[]; loadedAt: string } | null>(null);
  const [appliedAt, setAppliedAt] = useState(loadedAt);
  const [settled, setSettled] = useState(0);
  const markSettled = () => setSettled((n) => n + 1);
  useEffect(() => {
    pending.current = { items: initialItems, loadedAt };
  }, [initialItems, loadedAt]);
  useEffect(() => {
    const next = pending.current;
    if (!next || busy || saves.current.size > 0 || creating.current > 0) return;
    pending.current = null;
    const now = Date.now();
    const recent = (m: Map<string, number>) => {
      for (const [id, t] of m) if (now - t > LOCAL_WRITE_GRACE_MS) m.delete(id);
      return new Set(m.keys());
    };
    setItems((cur) => mergeServerItems(cur, next.items, recent(recentlyDeleted.current), recent(recentlyCreated.current)));
    setAppliedAt(next.loadedAt);
  }, [initialItems, loadedAt, busy, settled]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const ofKind = useMemo(() => items.filter((i) => i.kind === kind && matchesFilter(i, filter)), [items, kind, filter]);
  // Column totals follow the filter, so a header never counts cards it hides.
  const summaries = useMemo(() => columnSummaries(ofKind, kind), [ofKind, kind]);
  const byStage = useMemo(() => {
    const out = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, [] as PipelineItem[]])) as Record<
      PipelineStage,
      PipelineItem[]
    >;
    for (const it of ofKind) out[it.stage].push(it);
    return out;
  }, [ofKind]);
  const listItems = useMemo(
    () => ofKind.filter((i) => showNo || i.stage !== "no").sort(compareForList(today)),
    [ofKind, showNo, today],
  );
  const noCount = useMemo(() => items.filter((i) => i.kind === kind && i.stage === "no").length, [items, kind]);
  const kindCounts = useMemo(
    () => Object.fromEntries(PIPELINE_KINDS.map((k) => [k, items.filter((i) => i.kind === k && i.stage !== "no").length])),
    [items],
  );

  const replace = (id: string, next: PipelineItem | null) =>
    setItems((cur) => (next ? cur.map((i) => (i.id === id ? next : i)) : cur.filter((i) => i.id !== id)));

  /**
   * Optimistic update. When the last save for this card settles, the card
   * shows the newest row the server confirmed, so a failed save rolls back
   * and an older response never overwrites a newer one.
   */
  const update = async (id: string, patch: PipelineUpdateInput): Promise<boolean> => {
    const before = itemsRef.current.find((i) => i.id === id);
    if (!before) return false;
    // updated_by is not sent: the server sets it from the signed-in admin.
    const track = saves.current.get(id) ?? { seq: 0, applied: 0, inFlight: 0, confirmed: before };
    saves.current.set(id, track);
    const seq = ++track.seq;
    track.inFlight += 1;
    replace(id, { ...before, ...buildPipelineWrite(before, patch, new Date()) } as PipelineItem);
    let ok = false;
    try {
      const saved = await apiUpdate(id, patch);
      if (seq > track.applied) {
        track.applied = seq;
        track.confirmed = saved;
      }
      ok = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save. Try again.");
    } finally {
      track.inFlight -= 1;
      if (track.inFlight === 0) {
        saves.current.delete(id);
        setItems((cur) => cur.map((i) => (i.id === id ? track.confirmed : i)));
        markSettled();
      }
    }
    return ok;
  };

  const commitMove = (id: string, patch: PipelineUpdateInput, from?: "left" | "right") => {
    if (patch.stage === "no") setShowNo(true);
    focusAfterMove.current = from ? { id, from } : null;
    void update(id, patch);
  };

  /** Moves straight away, or asks first when the new stage needs a next step or a reason. */
  const requestMove = (id: string, stage: PipelineStage, from?: "left" | "right") => {
    const it = itemsRef.current.find((i) => i.id === id);
    if (!it || it.stage === stage || it.id.startsWith("temp-")) return;
    if (NEEDS_NEXT_STEP.includes(stage) || stage === "no") {
      setMoveReq({
        id,
        name: it.name,
        stage,
        mode: "move",
        from,
        next_step: it.next_step ?? "",
        next_step_due: it.next_step_due ?? "",
      });
      return;
    }
    commitMove(id, { stage }, from);
  };

  const touch = (id: string) => {
    const it = itemsRef.current.find((i) => i.id === id);
    if (!it) return;
    void update(id, { touched: true });
    setMoveReq({
      id,
      name: it.name,
      stage: it.stage,
      mode: "touch",
      next_step: it.next_step ?? "",
      next_step_due: it.next_step_due ?? "",
    });
  };

  const answerMove = (req: MoveRequest, a: MoveAnswer) => {
    setMoveReq(null);
    // An arrow move puts focus on the card in its new column (effect below); anything else goes back.
    if (!req.from || req.mode === "touch") restoreFocus();
    else returnFocus.current = null;
    if (req.mode === "touch") {
      void update(req.id, { next_step: a.next_step, next_step_due: a.next_step_due });
    } else if (req.stage === "no") {
      commitMove(req.id, { stage: "no", append_note: noReasonLine(a.reason, today) }, req.from);
    } else {
      commitMove(req.id, { stage: req.stage, next_step: a.next_step, next_step_due: a.next_step_due }, req.from);
    }
  };

  // A card moved with its arrow mounts again in another column; put focus
  // back on the same arrow (or the other one, or the card) so keyboard users
  // can keep moving it.
  useEffect(() => {
    const want = focusAfterMove.current;
    if (!want) return;
    focusAfterMove.current = null;
    const card = boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(want.id)}"]`);
    const other = want.from === "left" ? "right" : "left";
    const target =
      card?.querySelector<HTMLElement>(`[data-move="${want.from}"]`) ??
      card?.querySelector<HTMLElement>(`[data-move="${other}"]`) ??
      card?.querySelector<HTMLElement>("[data-open]");
    target?.focus();
  }, [items]);

  const openCard = (id: string) => {
    setOpenId(id);
    setSheet((s) => ({ id, n: (s?.n ?? 0) + 1 }));
  };

  const quickAdd = async (name: string, stage: PipelineStage, extra: QuickAddExtra) => {
    const now = new Date().toISOString();
    const temp: PipelineItem = {
      id: `temp-${++tempSeq}`,
      event_slug: "",
      kind,
      name,
      organisation: null,
      element: null,
      stage,
      owner: extra.owner,
      amount_thb: null,
      why_fit: null,
      reach: null,
      next_step: extra.next_step,
      next_step_due: extra.next_step_due,
      notes: null,
      position: null,
      in_kind: false,
      stage_changed_at: null,
      last_touched_at: null,
      updated_by: null,
      created_at: now,
      updated_at: now,
    };
    creating.current += 1;
    setItems((cur) => [...cur, temp]);
    try {
      const created = await apiCreate({
        kind,
        name,
        stage,
        owner: extra.owner,
        next_step: extra.next_step,
        next_step_due: extra.next_step_due,
      });
      recentlyCreated.current.set(created.id, Date.now());
      replace(temp.id, created);
    } catch (error) {
      replace(temp.id, null);
      toast.error(error instanceof Error ? error.message : "Could not add. Try again.");
    } finally {
      creating.current -= 1;
      markSettled();
    }
  };

  const submitNew = (e: FormEvent) => {
    e.preventDefault();
    const v = newName.trim();
    if (!v) return;
    void quickAdd(v, "to_contact", { owner: newOwner, next_step: null, next_step_due: null });
    setNewName("");
  };

  const remove = async (id: string) => {
    const before = itemsRef.current;
    const idx = before.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const removed = before[idx];
    setOpenId(null);
    replace(id, null);
    // Until the server answers, and for a while after, an older read must not bring it back.
    recentlyDeleted.current.set(id, Date.now());
    try {
      await apiDelete(id);
      recentlyDeleted.current.set(id, Date.now());
      toast.success(`Deleted ${removed.name}.`);
    } catch (error) {
      recentlyDeleted.current.delete(id);
      setItems((cur) => {
        const next = [...cur];
        next.splice(Math.min(idx, next.length), 0, removed);
        return next;
      });
      toast.error(error instanceof Error ? error.message : "Could not delete. Try again.");
    }
  };

  /** `alreadyThere`: rows the dialog left out because they are on the board already. */
  const importRows = async (rows: PipelineCreateInput[], alreadyThere: number): Promise<boolean> => {
    creating.current += 1;
    try {
      const { items: created, skipped } = await apiImport(rows);
      const now = Date.now();
      for (const c of created) recentlyCreated.current.set(c.id, now);
      setItems((cur) => [...cur, ...created]);
      const there = skipped + alreadyThere;
      toast.success(`${created.length} added${there > 0 ? `, ${there} already there` : ""}.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import. Try again.");
      return false;
    } finally {
      creating.current -= 1;
      markSettled();
    }
  };

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    if (!e.over) return;
    const stage = String(e.over.id) as PipelineStage;
    if ((PIPELINE_STAGES as readonly string[]).includes(stage)) requestMove(String(e.active.id), stage);
  };

  // j/k walk the cards in the order they are on screen: the list order, or
  // column by column on the board.
  const navItems = useMemo(
    () =>
      view === "board"
        ? [...BOARD_STAGES, ...(showNo ? (["no"] as const) : [])].flatMap((s) => byStage[s])
        : listItems,
    [view, showNo, byStage, listItems],
  );

  // Keyboard: j/k select, 1-5 set stage, n new, e edit, / filter. Ignored while typing or in a dialog.
  const keyState = useRef({ listItems: navItems, selectedId, busy });
  keyState.current = { listItems: navItems, selectedId, busy };
  const actions = useRef({ requestMove, openCard });
  actions.current = { requestMove, openCard };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const { listItems: list, selectedId: sel, busy: isBusy } = keyState.current;
      if (isBusy) return;
      const idx = sel ? list.findIndex((i) => i.id === sel) : -1;
      const select = (i: number) => {
        const it = list[Math.max(0, Math.min(list.length - 1, i))];
        if (!it) return;
        setSelectedId(it.id);
        document
          .querySelector<HTMLElement>(`[data-row-id="${CSS.escape(it.id)}"], [data-card-id="${CSS.escape(it.id)}"]`)
          ?.scrollIntoView({ block: "nearest" });
      };
      if (e.key === "j") select(idx + 1);
      else if (e.key === "k") select(idx < 0 ? 0 : idx - 1);
      else if (e.key === "/") filterRef.current?.focus();
      else if (e.key === "n") addRef.current?.focus();
      else if (e.key === "e" && sel && idx >= 0) actions.current.openCard(sel);
      else if (/^[1-5]$/.test(e.key) && sel && idx >= 0) actions.current.requestMove(sel, BOARD_STAGES[Number(e.key) - 1]);
      else if (e.key === "Escape" && sel) setSelectedId(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Links from the Today strip: open that card on its tab, or the Speakers tab.
  useEffect(() => {
    const apply = (focus: PipelineFocus | null) => {
      if (!focus) return;
      document.getElementById("pipeline")?.scrollIntoView({ block: "start" });
      if (focus.type === "kind") {
        setKind(focus.kind);
        return;
      }
      const it = itemsRef.current.find((i) => i.id === focus.id);
      if (!it) {
        toast.error("That card is no longer on the board.");
        return;
      }
      setKind(it.kind);
      if (it.stage === "no") setShowNo(true);
      setSelectedId(it.id);
      actions.current.openCard(it.id);
    };
    const onFocus = (e: Event) => apply((e as CustomEvent<PipelineFocus>).detail ?? null);
    const onHash = () => apply(parsePipelineHash(window.location.hash));
    onHash();
    window.addEventListener(PIPELINE_FOCUS_EVENT, onFocus);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(PIPELINE_FOCUS_EVENT, onFocus);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const sheetItem = sheet ? (items.find((i) => i.id === sheet.id) ?? null) : null;
  const draggingItem = draggingId ? (items.find((i) => i.id === draggingId) ?? null) : null;
  const columnProps = {
    kind,
    today,
    draggingId,
    selectedId,
    defaultOwner,
    onOpen: openCard,
    onMove: requestMove,
    onTouch: touch,
    onQuickAdd: quickAdd,
  };

  const segmented = cn(
    "h-9 min-w-0 gap-1 rounded px-3 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground md:h-8",
    "data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-sm",
  );

  return (
    <DashSection id="pipeline" title="Pipeline" meta={<span className="tabular-nums">Updated {bangkokTime(new Date(appliedAt))}</span>}>
      <PipelineProgressBlock items={items} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={kind}
          onValueChange={(v) => v && setKind(v as PipelineKind)}
          aria-label="Pipeline kind"
          className="inline-flex gap-0 rounded-md border bg-muted/30 p-0.5"
        >
          {PIPELINE_KINDS.map((k) => (
            <ToggleGroupItem key={k} value={k} className={segmented}>
              {KIND_LABEL[k]} <span className="tabular-nums text-muted-foreground">{kindCounts[k]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          aria-label="Layout"
          className="inline-flex gap-0 rounded-md border bg-muted/30 p-0.5"
        >
          <ToggleGroupItem value="list" className={segmented}>
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="board" className={segmented}>
            Board
          </ToggleGroupItem>
        </ToggleGroup>
        <Button type="button" variant="outline" size="sm" className="h-9 md:h-8 sm:ml-auto" onClick={() => setPasteOpen(true)}>
          <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Paste list
        </Button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <Input
          ref={filterRef}
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFilter("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Filter  ( / )"
          aria-label="Filter by name, organisation, owner or next step"
          className="h-10 md:h-8"
        />
        <form onSubmit={submitNew} className="flex min-w-0 gap-2">
          <Input
            ref={addRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            placeholder={`New ${KIND_LABEL[kind].replace(/s$/, "").toLowerCase()}  ( n )`}
            aria-label={`New ${KIND_LABEL[kind].replace(/s$/, "").toLowerCase()} name, added to To contact`}
            maxLength={200}
            className="h-10 min-w-0 flex-1 md:h-8"
          />
          <OwnerSelect value={newOwner} onChange={setNewOwner} label="Owner of the new card" className="h-10 w-28 shrink-0 md:h-8" />
          <Button type="submit" size="sm" className="h-10 shrink-0 md:h-8" disabled={!newName.trim()}>
            Add
          </Button>
        </form>
      </div>

      {view === "list" ? (
        <div className="mt-3">
          <PipelineTable
            items={listItems}
            summaries={summaries}
            kind={kind}
            today={today}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={openCard}
          />
          {noCount > 0 && (
            <button
              type="button"
              onClick={() => setShowNo((s) => !s)}
              className="mt-1 min-h-9 text-sm text-muted-foreground hover:text-foreground"
              aria-pressed={showNo}
            >
              {showNo ? `Hide the No pile (${noCount})` : `Show the No pile (${noCount})`}
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
          <div ref={boardRef} className="-mx-4 mt-3 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5">
            <div className="flex w-max gap-2.5">
              {BOARD_STAGES.map((stage) => (
                <PipelineColumn key={stage} stage={stage} items={byStage[stage]} summary={summaries[stage]} {...columnProps} />
              ))}
              {showNo ? (
                <PipelineColumn
                  stage="no"
                  items={byStage.no}
                  summary={summaries.no}
                  onCollapse={() => setShowNo(false)}
                  {...columnProps}
                />
              ) : (
                <NoPileCollapsed count={summaries.no.count} onOpen={() => setShowNo(true)} />
              )}
            </div>
          </div>
          <DragOverlay>{draggingItem ? <PipelineCardGhost item={draggingItem} today={today} /> : null}</DragOverlay>
        </DndContext>
      )}

      {ofKind.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {filter.trim()
            ? "Nothing matches the filter."
            : `No ${KIND_LABEL[kind].toLowerCase()} yet. Add one above, or paste a list.`}
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {kind === "sponsor" && <>Weighted cash uses guessed odds per stage, not data: {weightsNote}. </>}
        <span className="hidden md:inline">Keys: j and k to select, 1 to 5 to set the stage, e to open, n to add, / to filter.</span>
      </p>

      <PipelineSheet
        key={sheet ? `${sheet.id}-${sheet.n}` : "none"}
        item={sheetItem}
        open={openId !== null && sheetItem !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onSave={update}
        onMove={requestMove}
        onTouch={touch}
        onDelete={remove}
      />
      <StageMoveDialog
        request={moveReq}
        onCancel={() => {
          setMoveReq(null);
          restoreFocus();
        }}
        onConfirm={answerMove}
      />
      <PasteImportDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        defaultKind={kind}
        defaultOwner={defaultOwner}
        existing={items}
        onImport={importRows}
      />
    </DashSection>
  );
}
