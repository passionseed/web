"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Search, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import FractalGlassBackground from "@/components/hackathon/ClarityGlassBackground";

type MatchingEvent = {
  id: string;
  name: string;
  status: "draft" | "live" | "ranking_locked" | "matched";
};

type MatchingCandidate = {
  id: string;
  name: string;
  university: string;
  track: string;
  bio: string;
  problem_preferences: string[];
  team_role_preference: string | null;
};

type MatchingState = {
  metParticipantIds: string[];
  rankedParticipantIds: string[];
};

type ExistingTeam = {
  id: string;
  name: string;
  lobby_code: string;
  members: Array<{
    participant_id: string;
    hackathon_participants: { name: string; university: string; track: string };
  }>;
};

function rankingLabel(index: number) {
  return `#${index + 1}`;
}

export default function TeamMatchingPage() {
  const [event, setEvent] = useState<MatchingEvent | null>(null);
  const [existingTeam, setExistingTeam] = useState<ExistingTeam | null>(null);
  const [participants, setParticipants] = useState<MatchingCandidate[]>([]);
  const [metParticipantIds, setMetParticipantIds] = useState<string[]>([]);
  const [rankedParticipantIds, setRankedParticipantIds] = useState<string[]>([]);
  const [readOnly, setReadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingMet, setSavingMet] = useState(false);
  const [savingRankings, setSavingRankings] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [eventRes, participantsRes] = await Promise.all([
          fetch("/api/hackathon/team-matching/event"),
          fetch("/api/hackathon/team-matching/participants"),
        ]);

        const eventData = await eventRes.json();
        const participantsData = await participantsRes.json();

        if (eventRes.ok) {
          setEvent(eventData.event);
          setExistingTeam(eventData.team);
          setMetParticipantIds(eventData.state?.metParticipantIds ?? []);
          setRankedParticipantIds(eventData.state?.rankedParticipantIds ?? []);
          setReadOnly(Boolean(eventData.readOnly));
        }

        if (participantsRes.ok) {
          setParticipants(participantsData.participants ?? []);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const participantMap = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants]
  );

  const shortlist = rankedParticipantIds
    .map((participantId) => participantMap.get(participantId))
    .filter((participant): participant is MatchingCandidate => Boolean(participant));

  const unrankedMetParticipants = metParticipantIds
    .filter((participantId) => !rankedParticipantIds.includes(participantId))
    .map((participantId) => participantMap.get(participantId))
    .filter((participant): participant is MatchingCandidate => Boolean(participant));

  const visibleParticipants = participants.filter((participant) => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return true;

    return (
      participant.name.toLowerCase().includes(searchValue) ||
      participant.university.toLowerCase().includes(searchValue) ||
      participant.track.toLowerCase().includes(searchValue)
    );
  });

  function toggleMetParticipant(participantId: string) {
    setMessage("");
    setMetParticipantIds((current) => {
      if (current.includes(participantId)) {
        setRankedParticipantIds((ranked) => ranked.filter((id) => id !== participantId));
        return current.filter((id) => id !== participantId);
      }

      return [...current, participantId];
    });
  }

  function addToRanking(participantId: string) {
    if (rankedParticipantIds.includes(participantId)) return;
    setRankedParticipantIds((current) => [...current, participantId]);
  }

  function removeFromRanking(participantId: string) {
    setRankedParticipantIds((current) => current.filter((id) => id !== participantId));
  }

  function moveRanking(participantId: string, direction: -1 | 1) {
    setRankedParticipantIds((current) => {
      const index = current.indexOf(participantId);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function saveMetConnections() {
    if (!event) return;
    setSavingMet(true);
    setMessage("");

    try {
      const response = await fetch("/api/hackathon/team-matching/met", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          metParticipantIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Could not save shortlist");
        return;
      }

      setMetParticipantIds(data.state.metParticipantIds);
      setRankedParticipantIds((current) =>
        current.filter((participantId) => data.state.metParticipantIds.includes(participantId))
      );
      setMessage("Saved your people-you-met shortlist.");
    } finally {
      setSavingMet(false);
    }
  }

  async function saveRankings() {
    if (!event) return;
    setSavingRankings(true);
    setMessage("");

    try {
      const response = await fetch("/api/hackathon/team-matching/rankings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          rankedParticipantIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Could not save rankings");
        return;
      }

      setRankedParticipantIds(data.state.rankedParticipantIds);
      setMessage("Saved your ranked shortlist.");
    } finally {
      setSavingRankings(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center text-white">
        <FractalGlassBackground />
        <div className="relative z-10 text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
          <p className="mt-4 text-sm text-[#91C4E3]">Loading team matching...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-white font-[family-name:var(--font-mitr)]">
      <FractalGlassBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-[#4a6b82]/25 bg-[#0d1219]/85 p-6 shadow-[0_0_30px_rgba(74,107,130,0.15)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#91C4E3]">
                Hackathon Matching
              </p>
              <h1 className="mt-2 text-3xl font-medium text-white">
                {event?.name ?? "Matching event not live yet"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Add only the people you actually met, then rank your shortlist. When the
                event closes, the system will create the strongest possible 3-5 person teams.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                asChild
                variant="outline"
                className="border-[#4a6b82]/30 bg-[#1a2530]/40 text-slate-200 hover:bg-[#1a2530]/70"
              >
                <Link href="/hackathon/dashboard">Back to dashboard</Link>
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] text-white hover:from-[#6a9ac4] hover:to-[#5a8ab4]"
              >
                <Link href="/hackathon/team">Team page</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7aa4c4]">Status</p>
              <p className="mt-2 text-lg text-white">
                {event ? event.status.replace("_", " ") : "waiting for event"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7aa4c4]">People met</p>
              <p className="mt-2 text-lg text-white">{metParticipantIds.length}</p>
            </div>
            <div className="rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7aa4c4]">Ranked</p>
              <p className="mt-2 text-lg text-white">{rankedParticipantIds.length}</p>
            </div>
          </div>

          {existingTeam && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 p-4 text-sm text-emerald-100">
              You already have a team assignment: <span className="font-medium">{existingTeam.name}</span>.
              You can review it on the team page.
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-[#91C4E3]/20 bg-[#91C4E3]/10 p-4 text-sm text-[#d6ebff]">
              {message}
            </div>
          )}
        </div>

        {!event && (
          <div className="rounded-3xl border border-[#4a6b82]/25 bg-[#0d1219]/85 p-8 text-center text-slate-300">
            The matching event has not been opened yet.
          </div>
        )}

        {event && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
            <section className="rounded-3xl border border-[#4a6b82]/25 bg-[#0d1219]/85 p-6 shadow-[0_0_24px_rgba(74,107,130,0.12)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-[#91C4E3]">Search participants</p>
                  <h2 className="mt-1 text-2xl font-medium text-white">People you met</h2>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(eventValue) => setSearch(eventValue.target.value)}
                    placeholder="Search by name, university, or track"
                    className="w-full rounded-2xl border border-[#4a6b82]/25 bg-[#111824] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {visibleParticipants.map((participant) => {
                  const selected = metParticipantIds.includes(participant.id);
                  return (
                    <div
                      key={participant.id}
                      className="rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-medium text-white">{participant.name}</p>
                            {selected && (
                              <span className="rounded-full border border-[#91C4E3]/30 bg-[#91C4E3]/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-[#91C4E3]">
                                Added
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-300">
                            {participant.university} · {participant.track}
                          </p>
                          {participant.problem_preferences.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {participant.problem_preferences.map((problem) => (
                                <span
                                  key={`${participant.id}-${problem}`}
                                  className="rounded-full border border-[#4a6b82]/20 bg-[#1a2530]/80 px-2.5 py-1 text-xs text-slate-200"
                                >
                                  {problem}
                                </span>
                              ))}
                            </div>
                          )}
                          {participant.bio && (
                            <p className="mt-3 text-sm leading-6 text-slate-400">
                              {participant.bio}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          disabled={readOnly}
                          onClick={() => toggleMetParticipant(participant.id)}
                          className={
                            selected
                              ? "bg-[#233646] text-white hover:bg-[#2e4b61]"
                              : "bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] text-white hover:from-[#6a9ac4] hover:to-[#5a8ab4]"
                          }
                        >
                          <Users className="h-4 w-4" />
                          {selected ? "Remove" : "Add to met list"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  disabled={readOnly || savingMet}
                  onClick={saveMetConnections}
                  className="bg-gradient-to-r from-[#8b7a9a] to-[#7b6a8a] text-white hover:from-[#b5a4ca] hover:to-[#a594ba]"
                >
                  {savingMet ? "Saving..." : "Save met list"}
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#4a6b82]/25 bg-[#0d1219]/85 p-6 shadow-[0_0_24px_rgba(74,107,130,0.12)]">
              <div className="flex items-center gap-2 text-[#91C4E3]">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm">Rank your shortlist</p>
              </div>
              <h2 className="mt-2 text-2xl font-medium text-white">Final ranking</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Only ranked people feed the final algorithm. Mutual rankings are weighted the most.
              </p>

              {unrankedMetParticipants.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4">
                  <p className="text-sm font-medium text-white">Met but not ranked yet</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unrankedMetParticipants.map((participant) => (
                      <button
                        key={participant.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => addToRanking(participant.id)}
                        className="rounded-full border border-[#4a6b82]/25 bg-[#1a2530]/80 px-3 py-1.5 text-sm text-slate-200 transition hover:border-[#91C4E3]/40 hover:text-white"
                      >
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {shortlist.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#4a6b82]/25 bg-[#111824]/60 p-6 text-center text-sm text-slate-400">
                    Add people from your met list to create your ranked shortlist.
                  </div>
                )}
                {shortlist.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 rounded-2xl border border-[#4a6b82]/20 bg-[#111824]/80 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#91C4E3]/10 text-sm font-medium text-[#91C4E3]">
                      {rankingLabel(index)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-white">
                        {participant.name}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {participant.university} · {participant.track}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={readOnly || index === 0}
                        onClick={() => moveRanking(participant.id, -1)}
                        className="border-[#4a6b82]/25 bg-[#1a2530]/80 text-slate-200"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={readOnly || index === shortlist.length - 1}
                        onClick={() => moveRanking(participant.id, 1)}
                        className="border-[#4a6b82]/25 bg-[#1a2530]/80 text-slate-200"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={readOnly}
                        onClick={() => removeFromRanking(participant.id)}
                        className="border-[#4a6b82]/25 bg-[#1a2530]/80 text-slate-200"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  disabled={readOnly || savingRankings}
                  onClick={saveRankings}
                  className="bg-gradient-to-r from-[#5a7a94] to-[#4a6a84] text-white hover:from-[#6a9ac4] hover:to-[#5a8ab4]"
                >
                  {savingRankings ? "Saving..." : "Save ranking"}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
