"use client";

import { useEffect, useRef, useState } from "react";

/** A school from the open-data list (lib/hackathon/elemental/schools.ts), name without "โรงเรียน". */
export type FoundSchool = { key: string; name: string; province: string };

/**
 * Search the school list as someone types: 2 characters or more, 250ms after
 * the last key. null before a search, [] when nothing matched or the search
 * failed. While `enabled` is false it keeps the last results and sends nothing.
 * Used by SchoolPicker (share and teacher pages) and the sign-up form's SchoolField.
 */
export function useSchoolSearch(query: string, enabled = true, limit?: number): FoundSchool[] | null {
  const [schools, setSchools] = useState<FoundSchool[] | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const q = query.trim();
    const n = ++seq.current;
    if (q.length < 2) {
      const clear = setTimeout(() => n === seq.current && setSchools(null), 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hackathon/elemental/share/schools?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { schools: FoundSchool[] };
        if (n === seq.current) setSchools(limit ? data.schools.slice(0, limit) : data.schools);
      } catch {
        if (n === seq.current) setSchools([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, enabled, limit]);

  return schools;
}
