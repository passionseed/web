"use client";

import { useEffect, useState } from "react";

import type { BoardPerson } from "@/lib/supabase/whiteboards";

/** After the board opens, so its first paint and sync never wait on this. */
const AFTER_OPEN_MS = 1200;

/**
 * Everyone on the board as SHIFT knows them (Discord name and picture), loaded
 * a moment after the board opens. Empty until then, and for anyone without
 * Discord the profile name stays.
 */
export function useBoardPeople(boardId: string): Record<string, BoardPerson> {
  const [people, setPeople] = useState<Record<string, BoardPerson>>({});
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/whiteboards/${boardId}/people`, { signal: controller.signal })
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
  }, [boardId]);
  return people;
}
