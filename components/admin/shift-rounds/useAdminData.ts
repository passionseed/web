"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { describeError } from "@/lib/shift-round/admin/format";
import type { AdminError, AdminResult } from "@/lib/shift-round/admin/types";

function thrownToError(error: unknown): AdminError {
  return {
    code: "retryable",
    category: "retryable",
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Loads data through a server action that returns an AdminResult. Keeps the
 * latest request only, so a slow earlier load cannot overwrite a newer one.
 */
export function useAdminQuery<T>(load: () => Promise<AdminResult<T>>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoad = useCallback(load, deps);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    setError(null);
    let result: AdminResult<T>;
    try {
      result = await stableLoad();
    } catch (e) {
      result = { ok: false, error: thrownToError(e) };
    }
    if (mine !== generation.current) return;
    if (result.ok) setData(result.data);
    else setError(result.error);
    setLoading(false);
  }, [stableLoad]);

  useEffect(() => {
    void reload();
    const latest = generation;
    return () => {
      latest.current++;
    };
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/**
 * Runs one write at a time. The last failure stays in `error` (rendered
 * inline by the caller) until the next run.
 */
export function useAdminMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async <T,>(fn: () => Promise<AdminResult<T>>): Promise<AdminResult<T> | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) setError(result.error);
      return result;
    } catch (e) {
      const err = thrownToError(e);
      setError(err);
      return { ok: false, error: err };
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  return { run, busy, error, clearError: () => setError(null), message: error ? describeError(error) : null };
}
