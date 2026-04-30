"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ResetMentorTicketButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!confirm(`Reset mentor ticket for team "${teamName}"? This will delete all their mentor bookings.`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hackathon/mentor-bookings/reset-quota-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (res.ok) setDone(true);
      else alert("Failed to reset ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs border-amber-700/50 text-amber-400 hover:bg-amber-900/20"
      onClick={handleReset}
      disabled={loading || done}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
      {done ? "✓ Ticket Reset" : "Reset Mentor Ticket"}
    </Button>
  );
}
