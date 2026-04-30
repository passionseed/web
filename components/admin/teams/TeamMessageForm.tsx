"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X } from "lucide-react";

export function TeamMessageForm({ teamId, teamName, memberCount }: { teamId: string; teamName: string; memberCount: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/hackathon/teams/${teamId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}`);
        setTitle("");
        setBody("");
        setTimeout(() => { setResult(null); setOpen(false); }, 2000);
      } else {
        setResult(data.error ?? "Failed to send");
      }
    } catch {
      setResult("Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="border-slate-700 hover:bg-slate-800 text-xs h-7 px-2"
      >
        <Send className="h-3 w-3 mr-1" />
        Message Team
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
          <Send className="h-3 w-3" />
          Message to {teamName} ({memberCount} members)
        </span>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subject…"
        className="h-8 text-xs bg-slate-950/50 border-slate-700"
        onClick={(e) => e.stopPropagation()}
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body…"
        rows={3}
        className="text-xs bg-slate-950/50 border-slate-700"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim()}
          className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
          Send to Inbox
        </Button>
        {result && (
          <span className={`text-[11px] ${result.startsWith("Sent") ? "text-emerald-400" : "text-red-400"}`}>
            {result}
          </span>
        )}
      </div>
    </div>
  );
}
