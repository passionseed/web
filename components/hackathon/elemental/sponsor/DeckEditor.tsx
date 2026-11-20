"use client";

import { useCallback, useEffect, useState } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import type { DeckEditResult } from "./deck-edits";

/**
 * Local edit mode for the sponsor deck: click any text and type, fill in the
 * yellow markers, then Save writes SponsorDeck.tsx through
 * app/api/dev/sponsor-deck. Rendered only by `next dev`, never on the site.
 * Open it with the button, or with ?edit in the URL.
 */

/**
 * Each editable element keeps what it said when edit mode started in data-*
 * attributes, so a hot reload of this component doesn't lose track of edits.
 */
type Kind = "text" | "fill";
/** The deck on screen. In dev, Next can leave a hidden copy from streaming. */
const deckRoot = () => Array.from(document.querySelectorAll<HTMLElement>(".elemental-deck")).find((el) => !el.closest("[hidden]"));
const editables = () => Array.from(deckRoot()?.querySelectorAll<HTMLElement>(".deck-editable") ?? []);
const isChanged = (el: HTMLElement) => clean(el.textContent ?? "") !== el.dataset.before;

const RESULTS_KEY = "sponsor-deck-edit-results";
const RESULTS_FOR_MS = 2 * 60 * 1000;
const SKIP = "[data-deck-fill], [data-deck-draft], [data-deck-ui], .deck-no-print, button, script, style";

const CSS = `
.elemental-deck.deck-editing .deck-editable { outline: 1px dashed rgba(127,127,127,0.55); outline-offset: 2px; border-radius: 2px; cursor: text; }
.elemental-deck.deck-editing .deck-editable:hover { outline-color: ${EL.toxicCyan}; }
.elemental-deck.deck-editing .deck-editable:focus { outline: 2px solid ${EL.toxicCyan}; }
.elemental-deck.deck-editing .deck-changed { background: rgba(0, 214, 214, 0.22); outline: 2px solid ${EL.toxicCyan}; }
`;

/** "(fill in: price)" → "price". */
const fillValue = (text: string) => text.replace(/^\s*\(fill in:\s*/, "").replace(/\)\s*$/, "").trim();
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function DeckEditor() {
  const [on, setOn] = useState(false);
  const [changed, setChanged] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DeckEditResult[] | null>(null);

  const recount = useCallback(() => {
    let n = 0;
    for (const el of editables()) {
      el.classList.toggle("deck-changed", isChanged(el));
      if (isChanged(el)) n++;
    }
    setChanged(n);
  }, []);

  const start = useCallback(() => {
    const root = deckRoot();
    if (!root) return;
    if (!root.classList.contains("deck-editing")) {
      root.classList.add("deck-editing");
      const seen = new Map<string, number>();
      const editable = (el: HTMLElement, kind: Kind, before: string) => {
        const key = `${kind}\u0000${before}`;
        const nth = seen.get(key) ?? 0;
        seen.set(key, nth + 1);
        el.contentEditable = "plaintext-only";
        el.spellcheck = false;
        el.classList.add("deck-editable");
        Object.assign(el.dataset, { kind, before, nth: String(nth) });
      };

      // Walk the page in order, so `nth` counts the same way the source does.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      const found: (Text | HTMLElement)[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof HTMLElement && node.matches("[data-deck-fill]")) found.push(node);
        else if (node instanceof Text && !node.parentElement?.closest(SKIP)) {
          const core = node.data.trim();
          if (core.length >= 2 && /[\p{L}\p{N}]/u.test(core)) found.push(node);
        }
      }
      for (const node of found) {
        if (node instanceof HTMLElement) {
          const value = fillValue(node.textContent ?? "");
          node.textContent = value;
          editable(node, "fill", value);
          continue;
        }
        const raw = node.data;
        const core = raw.trim();
        const at = raw.indexOf(core);
        const span = document.createElement("span");
        span.textContent = core;
        node.replaceWith(...[raw.slice(0, at), span, raw.slice(at + core.length)].filter((x) => x !== ""));
        editable(span, "text", clean(core));
      }
    }
    setOn(true);
    recount();
  }, [recount]);

  // One set of listeners for the whole page: typing, Enter, and links.
  useEffect(() => {
    if (!on) return;
    const onInput = (e: Event) => {
      if ((e.target as HTMLElement).closest?.(".deck-editable")) recount();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = (e.target as HTMLElement).closest?.<HTMLElement>(".deck-editable");
      if (el && e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };
    // Clicking text in a link edits it instead of following the link.
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".elemental-deck a")) e.preventDefault();
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [on, recount]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULTS_KEY) ?? "null") as { at: number; results: DeckEditResult[] } | null;
      if (saved && Date.now() - saved.at < RESULTS_FOR_MS) setResults(saved.results);
    } catch {
      // Storage blocked: nothing to show.
    }
    if (new URLSearchParams(window.location.search).has("edit")) start();
  }, [start]);

  const closeResults = () => {
    try {
      sessionStorage.removeItem(RESULTS_KEY);
    } catch {
      // Storage blocked.
    }
    setResults(null);
  };

  const reloadInEditMode = () => window.location.replace(`${window.location.pathname}?edit`);

  const save = async () => {
    const edits = editables()
      .filter(isChanged)
      .map((el) => ({ kind: el.dataset.kind as Kind, before: el.dataset.before ?? "", after: clean(el.textContent ?? ""), nth: Number(el.dataset.nth) }));
    if (edits.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/sponsor-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits }),
      });
      if (!res.ok) throw new Error(`บันทึกไม่สำเร็จ (${res.status})`);
      const data = (await res.json()) as { results: DeckEditResult[] };
      try {
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify({ at: Date.now(), results: data.results }));
      } catch {
        // Storage blocked: the reload still shows the saved text.
      }
      // Reload only once the server renders the saved text. Reloading earlier
      // lets the hot update land on the edited page and duplicate content.
      const probe = data.results.find((r) => r.ok)?.after.replace(/["'&<>]/g, " ").split(" ").sort((x, y) => y.length - x.length)[0];
      for (let i = 0; probe && i < 25; i++) {
        const html = await fetch(window.location.pathname, { cache: "no-store" }).then((r) => r.text());
        if (html.includes(probe)) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      reloadInEditMode();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  };

  const failed = results?.filter((r) => !r.ok) ?? [];
  const saved = results?.filter((r) => r.ok).length ?? 0;

  return (
    <div data-deck-ui className="deck-no-print fixed bottom-4 right-4 z-50 flex max-w-[min(460px,calc(100vw-32px))] flex-col items-end gap-2" style={{ fontFamily: EL_FONT.display }}>
      <style>{CSS}</style>

      {results ? (
        <div className="w-full rounded-[4px] p-4 text-[14px] leading-[1.5] shadow-lg" style={{ background: EL.cream, color: EL.ink }}>
          <p className="m-0">บันทึกแล้ว {saved} จุด{failed.length ? ` · ไม่สำเร็จ ${failed.length} จุด` : ""}</p>
          {failed.map((r, i) => (
            <p key={i} className="m-0 mt-2" style={{ color: EL.inkSoft }}>
              “{r.before}”: {r.reason}
            </p>
          ))}
          <button type="button" onClick={closeResults} className="mt-3 underline underline-offset-4">
            ปิด
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="m-0 rounded-[4px] px-3 py-2 text-[14px]" style={{ background: EL.toxicYellow, color: EL.ink }}>
          {error}
        </p>
      ) : null}

      {on ? (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-[4px] p-3 shadow-lg" style={{ background: EL.ink, color: EL.cream }}>
          <span className="px-1 text-[14px]">
            คลิกข้อความเพื่อแก้ ช่องสีเหลืองพิมพ์ค่าจริงแทน · แก้แล้ว {changed} จุด
          </span>
          <button type="button" onClick={() => window.location.replace(window.location.pathname)} className="rounded-[3px] border px-3 py-[6px] text-[14px]" style={{ borderColor: EL.creamSoft }}>
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={changed === 0 || saving}
            className="rounded-[3px] px-3 py-[6px] text-[14px] disabled:opacity-40"
            style={{ background: EL.toxicCyan, color: EL.ink }}
          >
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={start} className="rounded-[4px] px-4 py-2 text-[14px] shadow-lg" style={{ background: EL.ink, color: EL.cream }}>
          แก้ไขข้อความ (เฉพาะเครื่องนี้)
        </button>
      )}
    </div>
  );
}
