"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanionCohorts, CompanionInvite, CompanionRosterEntry, CompanionToday } from "@/lib/shift/companion-contract";

const endpoint = "/api/shift/companion/staff";
async function request<T>(suffix = "", options?: RequestInit): Promise<T> {
  const response = await fetch(`${endpoint}${suffix}`, { ...options, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error ?? "Could not load Companion.");
  return data;
}

export function useCompanionStaff(initial: CompanionCohorts) {
  const [cohorts, setCohorts] = useState(initial.cohorts);
  const [selected, setSelected] = useState(initial.cohorts[0]?.id ?? "");
  const [view, setView] = useState<"roster" | "updates">("roster");
  const [roster, setRoster] = useState<CompanionRosterEntry[]>([]);
  const [today, setToday] = useState<CompanionToday | null>(null);
  const [invite, setInvite] = useState<CompanionInvite | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const cancelLoading = useCallback(() => { generation.current++; }, []);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const data = await request<CompanionToday | { roster: CompanionRosterEntry[] }>(`?cohort=${selected}&view=${view}`);
      if (generation.current !== current) return;
      if ("roster" in data) setRoster(data.roster);
      else setToday(data);
    } catch (e) {
      if (generation.current === current) setError(e instanceof Error ? e.message : "Could not load Companion.");
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [selected, view]);

  useEffect(() => {
    setRoster([]);
    setToday(null);
    setInvite(null);
    void refresh();
    return cancelLoading;
  }, [refresh, cancelLoading]);

  async function act(body: Record<string, string>) {
    if (inFlight.current) return false;
    inFlight.current = true;
    generation.current++;
    setLoading(false);
    setBusy(true);
    setError("");
    try {
      const result = await request<CompanionInvite | { cohort: CompanionCohorts["cohorts"][number] }>("", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if ("cohort" in result) {
        setCohorts((previous) => [result.cohort, ...previous]);
        setSelected(result.cohort.id);
      } else {
        setInvite(result);
        await refresh();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete this request.");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { cohorts, selected, setSelected, view, setView, roster, today, invite, setInvite, error, loading, busy, refresh, act };
}
