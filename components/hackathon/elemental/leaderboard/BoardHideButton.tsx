"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Staff: take a team off the public board, or put it back. */
export function BoardHideButton({ kind, id, hidden }: { kind: "team" | "solo"; id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    setBusy(true);
    setError(false);
    const ok = await fetch("/api/hackathon/elemental/leaderboard/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, hidden: !hidden }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    setBusy(false);
    if (!ok) return setError(true);
    router.refresh();
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-destructive">Failed</span>}
      <Button size="sm" variant={hidden ? "outline" : "secondary"} onClick={toggle} disabled={busy}>
        {hidden ? "Show" : "Hide"}
      </Button>
    </span>
  );
}
