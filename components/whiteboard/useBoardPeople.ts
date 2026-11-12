"use client";

import { useEffect, useState } from "react";

import type { BoardPerson } from "@/lib/supabase/whiteboards";

/** After the board opens, so its first paint and sync never wait on this. */
const AFTER_OPEN_MS = 1200;

/**
 * People on the board as SHIFT knows them (`ids`: who this browser sees on it, read once
 * when the request goes out) (Discord name and picture), loaded
 * a moment after the board opens. Empty until then, and for anyone without
 * Discord the profile name stays.
 */
export function useBoardPeople(boardId: string, ids: () => string[]): Record<string, BoardPerson> {
  const [people, setPeople] = useState<Record<string, BoardPerson>>({});
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/whiteboards/${boardId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...new Set(ids())] }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { people?: Record<string, BoardPerson> } | null) => {
          if (data?.people) setPeople(data.people);
        })
        .catch(() => {
          // Profile names stay; nothing to tell the person.
        });
    }, AFTER_OPEN_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `ids` is read once, when the request goes out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);
  return people;
}
