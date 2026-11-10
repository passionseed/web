"use client";

import { Check, Loader2, NotebookPen, Send, Sparkles, Square } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markdownToSafeHtml } from "@/lib/security/sanitize-html";
import { type CanvasScope, type ChatMessage, MAX_MESSAGE_CHARS, SUMMARY_PROMPT } from "@/lib/shift/canvas-chat";

import "./canvas-markdown.css";

/** Where saving an answer to the Tracker stands, per answer. */
type SaveState = { status: "saving" } | { status: "saved"; names: string[] } | { status: "failed"; message: string };

/**
 * Ask Claude about one SHIFT canvas or all of them. The conversation lives in
 * this page only: nothing is saved unless someone saves an answer about one
 * canvas to the SHIFT Tracker, and reloading starts over.
 */
export function CanvasChat({ scope, subject }: { scope: CanvasScope; subject: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [saves, setSaves] = useState<Record<number, SaveState>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const summary = "all" in scope ? SUMMARY_PROMPT.all : SUMMARY_PROMPT.canvas;

  async function saveToTracker(index: number, answer: string) {
    if ("all" in scope) return;
    setSaves((s) => ({ ...s, [index]: { status: "saving" } }));
    try {
      const res = await fetch("/api/shift/canvases/tracker-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: scope.boardId, frameId: scope.frameId, answer }),
      });
      const body = (await res.json().catch(() => null)) as { saved?: string[]; error?: string } | null;
      if (!res.ok || !body?.saved) throw new Error(body?.error ?? `Could not save (error ${res.status}).`);
      setSaves((s) => ({ ...s, [index]: { status: "saved", names: body.saved! } }));
    } catch (e) {
      setSaves((s) => ({ ...s, [index]: { status: "failed", message: e instanceof Error ? e.message : "Could not save." } }));
    }
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const before = messages;
    const asked: ChatMessage[] = [...before, { role: "user", content: text }];
    setMessages([...asked, { role: "assistant", content: "" }]);
    setDraft("");
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;

    let answer = "";
    try {
      const res = await fetch("/api/shift/canvases/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, messages: asked }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Claude could not answer (error ${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...asked, { role: "assistant", content: answer }]);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    } finally {
      abort.current = null;
      setBusy(false);
      if (answer.trim()) {
        setMessages([...asked, { role: "assistant", content: answer }]);
      } else {
        // Nothing came back: undo the turn and give the question back to retry.
        setMessages(before);
        setDraft(text);
      }
    }
  }

  return (
    <section aria-label={`Ask Claude about ${subject}`} className="flex min-h-[24rem] flex-col rounded-lg border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Ask Claude about {subject}</h2>
          <p className="text-xs text-muted-foreground">
            Claude reads the canvases from the database. It can be wrong, so check what matters against the canvas.
          </p>
        </div>
        {messages.length > 0 && !busy && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMessages([]);
              setSaves({});
            }}
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-start justify-center gap-3">
            <Button onClick={() => void ask(summary)} disabled={busy}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {"all" in scope ? "Overview of every canvas" : "Summarize this canvas"}
            </Button>
            <p className="text-xs text-muted-foreground">Or ask anything below, in Thai or English.</p>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
                {m.content}
              </p>
            ) : m.content ? (
              <div key={i} className="space-y-2">
                <div
                  className="canvas-markdown text-sm"
                  // Claude's Markdown, sanitised: it can quote students' text.
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(m.content) }}
                />
                {!("all" in scope) && !(busy && i === messages.length - 1) && (
                  <TrackerSave state={saves[i]} onSave={() => void saveToTracker(i, m.content)} />
                )}
              </div>
            ) : (
              <p key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reading the canvas…
              </p>
            ),
          )
        )}
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void ask(draft);
            }
          }}
          maxLength={MAX_MESSAGE_CHARS}
          rows={2}
          placeholder={"all" in scope ? "Who hasn't interviewed anyone yet?" : "What evidence backs their problem?"}
          aria-label="Question for Claude"
          className="min-h-[2.75rem] resize-none"
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={() => abort.current?.abort()} aria-label="Stop answering">
            <Square className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim()} aria-label="Send">
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </form>
    </section>
  );
}

/** Saves an answer as a SHIFT Tracker note for the students on the canvas. */
function TrackerSave({ state, onSave }: { state: SaveState | undefined; onSave: () => void }) {
  if (state?.status === "saved") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Saved to the Tracker for {state.names.join(", ")}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={onSave} disabled={state?.status === "saving"}>
        {state?.status === "saving" ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <NotebookPen className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        )}
        Save to Tracker
      </Button>
      {state?.status === "failed" && (
        <span role="alert" className="text-xs text-destructive">
          {state.message}
        </span>
      )}
    </div>
  );
}
