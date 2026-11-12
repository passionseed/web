"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Admins: take today's snapshot of every canvas now, instead of waiting for tonight. */
export function SnapshotNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function snapshot() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/shift/canvases/snapshot", { method: "POST" });
      const body = (await res.json().catch(() => null)) as { canvases?: number; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? `Could not take the snapshot (error ${res.status}).`);
      setResult(`Saved today's snapshot of ${body?.canvases ?? 0} canvases.`);
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Could not take the snapshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={() => void snapshot()} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="mr-2 h-4 w-4" aria-hidden="true" />}
        Snapshot now
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground" role="status">
          {result}
        </p>
      )}
    </div>
  );
}
