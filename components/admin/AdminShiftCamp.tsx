"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "@/components/admin/shared/AdminStates";
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
  // A proxy or crash page may not be JSON; fall back to the status code.
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok)
    throw new Error(data?.error ?? `Could not load camp (HTTP ${response.status})`);
  return data as T;
}

/** In-page anchors for the stacked camp sections. */
const CAMP_SECTIONS = [
  { id: "camp-create", label: "Create cohort", needsCohort: false },
  { id: "camp-enroll", label: "Enroll", needsCohort: true },
  { id: "camp-groups", label: "Peer groups", needsCohort: true },
  { id: "camp-support", label: "Support queue", needsCohort: true },
  { id: "camp-checkpoints", label: "Checkpoints", needsCohort: true },
  { id: "camp-presentations", label: "Presentations", needsCohort: true },
  { id: "camp-conversations", label: "Group chats", needsCohort: true },
  { id: "camp-checkins", label: "Check-ins", needsCohort: true },
  { id: "camp-observations", label: "Observations", needsCohort: true },
] as const;

// Clears the sticky admin topbar (72px) plus the sticky section nav.
const SECTION_CLASS = "scroll-mt-40";
export function AdminShiftCamp() {
  const [cohorts, setCohorts] = useState<ShiftCohort[]>([]);
  const [s, setSnapshot] = useState<ShiftSnapshot | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"load" | "action">("load");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const loadingGeneration = useRef(0);
  const actionInFlight = useRef(false);
  const cancelLoading = useCallback(() => {
    loadingGeneration.current++;
  }, []);
  const refresh = useCallback(async () => {
    const generation = ++loadingGeneration.current;
    setError("");
    setLoading(true);
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
      if (generation === loadingGeneration.current) {
        setErrorKind("load");
        setError(e instanceof Error ? e.message : "Could not load camp");
      }
    } finally {
      if (generation === loadingGeneration.current) setLoading(false);
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
      setErrorKind("action");
      setError(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      actionInFlight.current = false;
      setBusy(false);
      // An action cancels any refresh in flight; do not leave the spinner up.
      setLoading(false);
    }
  };

  const firstLoadFailed = error && errorKind === "load" && cohorts.length === 0 && !s;
  const sections = CAMP_SECTIONS.filter((section) => s || !section.needsCohort);
  if (firstLoadFailed) {
    return (
      <AdminErrorState
        title="Could not load the camp"
        message={error}
        onRetry={() => void refresh()}
        retrying={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <AdminErrorState
          title={errorKind === "load" ? "Could not refresh the camp" : "That action did not go through"}
          message={error}
          onRetry={errorKind === "load" ? () => void refresh() : undefined}
          retrying={loading}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Cohort"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground disabled:opacity-50"
          value={selected}
          disabled={busy || cohorts.length === 0}
          onChange={(e) => {
            setSnapshot(null);
            setSelected(e.target.value);
          }}
        >
          {cohorts.length === 0 && <option value="">No cohorts yet</option>}
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.starts_on}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} aria-hidden="true" />
          Refresh
        </Button>
      </div>
      <nav
        aria-label="Camp sections"
        className="sticky top-[76px] z-10 -mx-1 flex flex-wrap gap-1 rounded-lg border bg-background/90 p-1 backdrop-blur"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>
      <section id="camp-create" className={SECTION_CLASS}>
        <CohortSetup busy={busy} act={act} />
      </section>
      {loading && !s ? (
        <AdminLoading rows={4} rowClassName="h-40" label="Loading cohort" />
      ) : s ? (
        <div key={s.cohort.id} className="space-y-6">
          <section id="camp-enroll" className={SECTION_CLASS}>
            <Enrollment busy={busy} act={act} />
          </section>
          <section id="camp-groups" className={SECTION_CLASS}>
            <PeerPlacement s={s} busy={busy} act={act} />
          </section>
          <section id="camp-support" className={SECTION_CLASS}>
            <SupportQueue s={s} busy={busy} act={act} />
          </section>
          <section id="camp-checkpoints" className={SECTION_CLASS}>
            <MentorCheckpoints s={s} busy={busy} act={act} />
          </section>
          <section id="camp-presentations" className={SECTION_CLASS}>
            <PresentationModeration s={s} busy={busy} act={act} />
          </section>
          <section id="camp-conversations" className={SECTION_CLASS}>
            <GroupConversations s={s} busy={busy} act={act} />
          </section>
          <section id="camp-checkins" className={SECTION_CLASS}>
            <PrivateCheckins s={s} />
          </section>
          <section id="camp-observations" className={SECTION_CLASS}>
            <PilotObservations s={s} />
          </section>
        </div>
      ) : (
        !error &&
        cohorts.length === 0 && (
          <AdminEmptyState
            title="No camp cohorts yet"
            description="Create a scheduled cohort above to start enrolling accounts."
          />
        )
      )}
    </div>
  );
}
