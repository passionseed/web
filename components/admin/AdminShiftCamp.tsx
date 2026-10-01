"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  ShiftAction,
  ShiftCohort,
  ShiftSnapshot,
} from "@/lib/shift/camp-contract";

import {
  CohortSetup,
  Enrollment,
  PeerPlacement,
  SupportQueue,
} from "./ShiftCampSetup";
import {
  MentorCheckpoints,
  PresentationModeration,
  GroupConversations,
  PrivateCheckins,
  PilotObservations,
} from "./ShiftCampReview";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load camp");
  return data as T;
}
export function AdminShiftCamp() {
  const [cohorts, setCohorts] = useState<ShiftCohort[]>([]);
  const [s, setSnapshot] = useState<ShiftSnapshot | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadingGeneration = useRef(0);
  const actionInFlight = useRef(false);
  const cancelLoading = useCallback(() => {
    loadingGeneration.current++;
  }, []);
  const refresh = useCallback(async () => {
    const generation = ++loadingGeneration.current;
    setError("");
    try {
      const list = await request<ShiftCohort[]>("/api/admin/shift/camp");
      if (generation !== loadingGeneration.current) return;
      setCohorts(list);
      const id = selected || list[0]?.id;
      if (id) {
        const next = await request<ShiftSnapshot>(
          `/api/admin/shift/camp?cohort=${id}`,
        );
        if (generation !== loadingGeneration.current) return;
        setSnapshot(next);
        if (!selected) setSelected(id);
      }
    } catch (e) {
      if (generation === loadingGeneration.current)
        setError(e instanceof Error ? e.message : "Could not load camp");
    }
  }, [selected]);
  useEffect(() => {
    void refresh();
    return cancelLoading;
  }, [refresh, cancelLoading]);
  const act = async (
    action: ShiftAction,
    payload: Record<string, unknown>,
    cid: string | null = selected || null,
  ) => {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    loadingGeneration.current++;
    setBusy(true);
    setError("");
    try {
      const next = await request<ShiftSnapshot>("/api/admin/shift/camp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cohort_id: cid, payload }),
      });
      setSnapshot(next);
      if (action === "create_cohort") {
        setSelected(next.cohort.id);
        setCohorts(await request<ShiftCohort[]>("/api/admin/shift/camp"));
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Cohort"
          className="rounded-md border p-2"
          value={selected}
          disabled={busy}
          onChange={(e) => {
            setSnapshot(null);
            setSelected(e.target.value);
          }}
        >
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.starts_on}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </div>
      <CohortSetup busy={busy} act={act} />
      {s && (
        <div key={s.cohort.id} className="space-y-6">
          <Enrollment busy={busy} act={act} />
          <PeerPlacement s={s} busy={busy} act={act} />
          <SupportQueue s={s} busy={busy} act={act} />
          <MentorCheckpoints s={s} busy={busy} act={act} />
          <PresentationModeration s={s} busy={busy} act={act} />
          <GroupConversations s={s} busy={busy} act={act} />
          <PrivateCheckins s={s} />
          <PilotObservations s={s} />
        </div>
      )}
    </div>
  );
}
