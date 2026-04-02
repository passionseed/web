"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamResultsPanel } from "@/components/admin/team-matching/TeamResultsPanel";
import { matchTeams } from "@/components/admin/team-matching/matchTeams";
import type { Team } from "@/components/admin/team-matching/types";

type Participant = {
  id: string;
  name: string;
  preferences: string[];
};

export default function TeamFinderAdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ teamsCreated: number } | null>(null);
  const [error, setError] = useState("");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError("");
    setTeams(null);
    setConfirmed(false);
    setConfirmResult(null);
    const res = await fetch("/api/admin/hackathon/team-finder/participants");
    setLoading(false);
    if (!res.ok) { setError("โหลดข้อมูลไม่สำเร็จ"); return; }
    const data = await res.json();
    setParticipants(data.participants ?? []);
  }, []);

  const runMatching = () => {
    const simUsers = participants.map((p) => ({
      id: p.id,
      name: p.name,
      preferences: p.preferences,
    }));
    setTeams(matchTeams(simUsers));
    setConfirmed(false);
    setConfirmResult(null);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError("");
    const res = await fetch("/api/admin/hackathon/team-finder/create-teams", { method: "POST" });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "สร้างทีมไม่สำเร็จ");
      return;
    }
    const data = await res.json();
    setConfirmed(true);
    setConfirmResult({ teamsCreated: data.teamsCreated });
  };

  const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={fetchParticipants}
          disabled={loading}
          variant="outline"
          className="border-[#333] bg-[#1a1a1a] text-white hover:bg-[#222] gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {participants.length === 0 ? "โหลดข้อมูล" : "รีเฟรช"}
        </Button>
        {participants.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {participants.length} คนกำลังหาทีม
          </span>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {participants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {participants.map((p) => (
            <div
              key={p.id}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4"
            >
              <p className="text-sm font-semibold text-white mb-2">{p.name}</p>
              {p.preferences.length > 0 ? (
                <ol className="list-decimal list-inside space-y-0.5">
                  {p.preferences.map((prefId, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {nameById[prefId] ?? prefId}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground italic">ยังไม่ได้เลือก</p>
              )}
            </div>
          ))}
        </div>
      )}

      {participants.length >= 2 && (
        <div className="flex justify-center mb-2">
          <Button
            onClick={runMatching}
            className="bg-purple-700 hover:bg-purple-600 text-white px-10 py-2 text-base font-semibold"
          >
            จำลองการจับทีม
          </Button>
        </div>
      )}

      {teams && (
        <>
          <TeamResultsPanel teams={teams} />

          {!confirmed && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-green-700 hover:bg-green-600 text-white px-10 py-2 text-base font-semibold"
              >
                {confirming ? "กำลังสร้างทีม..." : "ยืนยันและสร้างทีม"}
              </Button>
            </div>
          )}

          {confirmed && confirmResult && (
            <div className="mt-6 text-center">
              <p className="text-green-400 font-medium">
                สร้างทีมสำเร็จ {confirmResult.teamsCreated} ทีม
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
