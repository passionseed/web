"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Search, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";

type Participant = {
  id: string;
  name: string;
};

type MatchingCandidate = {
  id: string;
  name: string;
  university: string;
  track: string;
  experience_level: number;
  problem_preferences: string[];
  team_role_preference: string | null;
};

type MatchingState = {
  event: {
    id: string;
    name: string;
    status: string;
    ranking_deadline: string | null;
  } | null;
  hasTeam: boolean;
  isEditable: boolean;
  candidates: MatchingCandidate[];
  metParticipantIds: string[];
  rankings: string[];
};

type Props = {
  participant: Participant;
};

function moveItem(ids: string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= ids.length) return ids;
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export default function HackathonMatchingPage({ participant }: Props) {
  const [state, setState] = useState<MatchingState | null>(null);
  const [search, setSearch] = useState("");
  const [metParticipantIds, setMetParticipantIds] = useState<string[]>([]);
  const [rankings, setRankings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMet, setSavingMet] = useState(false);
  const [savingRankings, setSavingRankings] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshState = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/hackathon/matching/event");
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "โหลดข้อมูลการจับคู่ไม่สำเร็จ");
      return;
    }

    setState(data.state);
    setMetParticipantIds(data.state.metParticipantIds);
    setRankings(data.state.rankings);
  };

  useEffect(() => {
    refreshState().catch(() => {
      setLoading(false);
      setError("โหลดข้อมูลการจับคู่ไม่สำเร็จ");
    });
  }, []);

  const candidateMap = useMemo(
    () => new Map((state?.candidates ?? []).map((candidate) => [candidate.id, candidate])),
    [state?.candidates]
  );

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (state?.candidates ?? []).filter((candidate) => {
      if (!query) return true;
      return (
        candidate.name.toLowerCase().includes(query) ||
        candidate.university.toLowerCase().includes(query) ||
        candidate.track.toLowerCase().includes(query) ||
        candidate.problem_preferences.some((problem) =>
          problem.toLowerCase().includes(query)
        )
      );
    });
  }, [search, state?.candidates]);

  const rankedCandidates = rankings
    .map((id) => candidateMap.get(id))
    .filter((candidate): candidate is MatchingCandidate => Boolean(candidate));

  const toggleMetParticipant = (candidateId: string) => {
    if (!state?.isEditable) return;

    setMessage("");
    setError("");

    setMetParticipantIds((currentIds) => {
      const nextIds = currentIds.includes(candidateId)
        ? currentIds.filter((id) => id !== candidateId)
        : [...currentIds, candidateId];

      setRankings((currentRankings) => {
        const preserved = currentRankings.filter((id) => nextIds.includes(id));
        const appended = nextIds.filter((id) => !preserved.includes(id));
        return [...preserved, ...appended];
      });

      return nextIds;
    });
  };

  const saveMetList = async () => {
    if (!state?.event) return;
    setSavingMet(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/hackathon/matching/met", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: state.event.id,
        metParticipantIds,
      }),
    });
    const data = await response.json();
    setSavingMet(false);

    if (!response.ok) {
      setError(data.error || "บันทึกรายชื่อคนที่เจอไม่สำเร็จ");
      return;
    }

    setMessage("บันทึกรายชื่อคนที่คุณได้คุยด้วยแล้ว");
  };

  const saveRanking = async () => {
    if (!state?.event) return;
    setSavingRankings(true);
    setMessage("");
    setError("");

    const metResponse = await fetch("/api/hackathon/matching/met", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: state.event.id,
        metParticipantIds,
      }),
    });
    const metData = await metResponse.json();

    if (!metResponse.ok) {
      setSavingRankings(false);
      setError(metData.error || "บันทึกรายชื่อคนที่เจอไม่สำเร็จ");
      return;
    }

    const response = await fetch("/api/hackathon/matching/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: state.event.id,
        rankedParticipantIds: rankings,
      }),
    });
    const data = await response.json();
    setSavingRankings(false);

    if (!response.ok) {
      setError(data.error || "บันทึกอันดับไม่สำเร็จ");
      return;
    }

    setMessage("บันทึกอันดับเรียบร้อยแล้ว");
  };

  if (loading) {
    return (
      <div className="min-h-screen relative text-white flex items-center justify-center font-[family-name:var(--font-mitr)]">
        <FractalGlassBackground />
        <div className="relative z-10 text-center space-y-3">
          <p className="text-[#7aa4c4] uppercase tracking-[0.25em] text-sm">Matching Event</p>
          <p className="text-xl text-white">กำลังโหลดข้อมูลการจับคู่ทีม...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-white font-[family-name:var(--font-mitr)] overflow-hidden">
      <FractalGlassBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[#7aa4c4] uppercase tracking-[0.25em] text-sm">Hackathon Matching</p>
            <h1 className="text-4xl font-medium text-white mt-2">
              {state?.event?.name ?? "กิจกรรมจับคู่ทีม"}
            </h1>
            <p className="text-gray-300 mt-3 max-w-2xl">
              {participant.name}, เพิ่มคนที่คุณได้คุยด้วยในงาน จากนั้นจัดอันดับเฉพาะ shortlist ของคุณ ระบบจะใช้ mutual ranking เป็นหลักในการจับทีม 3-5 คนให้อัตโนมัติ
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-[#4a6b82]/40 bg-[#0d1219]/70 text-white hover:bg-[#152130]">
              <Link href="/hackathon/dashboard">กลับแดชบอร์ด</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white">
              <Link href="/hackathon/team">ดูทีมของฉัน</Link>
            </Button>
          </div>
        </div>

        {!state?.event && (
          <div className="rounded-3xl border border-[#4a6b82]/30 bg-[#0d1219]/80 p-8 text-center shadow-[0_0_25px_rgba(74,107,130,0.15)]">
            <p className="text-2xl text-white">ยังไม่มีกิจกรรมจับคู่ทีมที่เปิดอยู่</p>
            <p className="text-gray-400 mt-3">
              เมื่อทีมงานเปิด event แล้ว คุณจะสามารถเลือกคนที่คุณได้เจอและจัดอันดับได้จากหน้านี้
            </p>
          </div>
        )}

        {state?.hasTeam && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-emerald-200 text-lg font-medium">คุณอยู่ในทีมแล้ว</p>
                <p className="text-emerald-100/80 mt-1">
                  ระบบจะไม่เปิดให้แก้ shortlist หรืออันดับสำหรับผู้ที่มีทีมแล้ว คุณสามารถกลับไปดูทีมของคุณได้เลย
                </p>
              </div>
            </div>
          </div>
        )}

        {state?.event && (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
              <section className="rounded-3xl border border-[#4a6b82]/30 bg-[#0d1219]/85 p-6 shadow-[0_0_30px_rgba(74,107,130,0.15)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-medium text-white">People You Met</h2>
                    <p className="text-gray-400 mt-1">
                      เพิ่มเฉพาะคนที่คุณได้คุยด้วยจริงในงาน
                    </p>
                  </div>
                  <div className="relative md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="ค้นหาชื่อ มหาวิทยาลัย track"
                      className="pl-9 border-[#4a6b82]/40 bg-[#121c29]/70 text-white"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {filteredCandidates.map((candidate) => {
                    const isSelected = metParticipantIds.includes(candidate.id);
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => toggleMetParticipant(candidate.id)}
                        disabled={!state.isEditable}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-[#8abade]/70 bg-[#152130]/95 shadow-[0_0_20px_rgba(106,154,196,0.18)]"
                            : "border-[#2a3948] bg-[#0f171f]/80 hover:border-[#4a6b82]/60"
                        } ${!state.isEditable ? "cursor-not-allowed opacity-70" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-medium text-white">{candidate.name}</p>
                            <p className="text-sm text-[#8abade] mt-1">
                              {candidate.university} · {candidate.track}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {candidate.problem_preferences.slice(0, 3).map((problem) => (
                                <span
                                  key={problem}
                                  className="rounded-full border border-[#4a6b82]/40 px-2.5 py-1 text-xs text-gray-300"
                                >
                                  {problem}
                                </span>
                              ))}
                              {candidate.team_role_preference && (
                                <span className="rounded-full border border-[#8b7a9a]/40 px-2.5 py-1 text-xs text-[#d1c4df]">
                                  {candidate.team_role_preference}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 rounded-full border border-[#4a6b82]/40 px-3 py-1 text-xs text-gray-300">
                            {isSelected ? "เพิ่มแล้ว" : "เพิ่ม"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={saveMetList}
                    disabled={!state.isEditable || savingMet || state.hasTeam}
                    className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] hover:from-[#6a9ac4] hover:to-[#5a8ab4] text-white"
                  >
                    {savingMet ? "กำลังบันทึก..." : "บันทึกรายชื่อคนที่เจอ"}
                  </Button>
                  <span className="text-sm text-gray-400">
                    เลือกแล้ว {metParticipantIds.length} คน
                  </span>
                </div>
              </section>

              <section className="rounded-3xl border border-[#4a6b82]/30 bg-[#0d1219]/85 p-6 shadow-[0_0_30px_rgba(74,107,130,0.15)]">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#8abade]" />
                  <div>
                    <h2 className="text-2xl font-medium text-white">Your Ranking</h2>
                    <p className="text-gray-400 mt-1">
                      จัดอันดับคนใน shortlist ของคุณ
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {rankedCandidates.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#4a6b82]/40 bg-[#0f171f]/60 p-5 text-sm text-gray-400">
                      เมื่อคุณเพิ่มคนที่ได้คุยด้วย รายชื่อจะมาปรากฏที่นี่เพื่อให้จัดอันดับ
                    </div>
                  )}

                  {rankedCandidates.map((candidate, index) => (
                    <div
                      key={candidate.id}
                      className="rounded-2xl border border-[#2a3948] bg-[#121c29]/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[#8abade]">อันดับ {index + 1}</p>
                          <p className="text-lg font-medium text-white truncate">{candidate.name}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {candidate.university} · {candidate.track}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!state.isEditable || index === 0 || state.hasTeam}
                            onClick={() =>
                              setRankings((current) => moveItem(current, index, -1))
                            }
                            className="border-[#4a6b82]/40 bg-[#0f171f]/70 text-white hover:bg-[#152130]"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={
                              !state.isEditable ||
                              index === rankedCandidates.length - 1 ||
                              state.hasTeam
                            }
                            onClick={() =>
                              setRankings((current) => moveItem(current, index, 1))
                            }
                            className="border-[#4a6b82]/40 bg-[#0f171f]/70 text-white hover:bg-[#152130]"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={saveRanking}
                    disabled={!state.isEditable || savingRankings || state.hasTeam}
                    className="bg-gradient-to-r from-[#8b7a9a] to-[#7b6a8a] hover:from-[#b5a4ca] hover:to-[#a594ba] text-white"
                  >
                    {savingRankings ? "กำลังบันทึก..." : "บันทึกอันดับ"}
                  </Button>
                  <span className="text-sm text-gray-400">
                    {state.isEditable
                      ? "แก้ไขอันดับได้จนกว่าทีมงานจะล็อก event"
                      : "event นี้ถูกล็อกแล้ว รอผลการจับทีม"}
                  </span>
                </div>
              </section>
            </div>

            {(message || error) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  error
                    ? "border-red-500/40 bg-red-950/20 text-red-200"
                    : "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                }`}
              >
                {error || message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
