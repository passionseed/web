"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { BlockInput, CalendarBlock } from "@/lib/calendar/core";

async function call<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
  return res.json();
}

export type CalendarApi = {
  blocks: CalendarBlock[] | null;
  reload: () => Promise<void>;
  create: (input: BlockInput) => Promise<boolean>;
  update: (id: string, input: BlockInput) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  join: (id: string, joined: boolean) => Promise<void>;
};

/**
 * Blocks between two Bangkok dates, with the actions on them. `onChanged`
 * runs after every change so other views (the board's peers) can refresh.
 */
export function useCalendar(from: string, to: string, onChanged?: () => void): CalendarApi {
  const [blocks, setBlocks] = useState<CalendarBlock[] | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await call<{ blocks: CalendarBlock[] }>(`/api/calendar?from=${from}&to=${to}`);
      setBlocks(data.blocks);
    } catch (error) {
      setBlocks((b) => b ?? []);
      toast.error(error instanceof Error ? error.message : "Could not load the calendar");
    }
  }, [from, to]);

  useEffect(() => void reload(), [reload]);

  const run = useCallback(
    async (work: () => Promise<unknown>, done?: string) => {
      try {
        await work();
        if (done) toast.success(done);
        await reload();
        onChanged?.();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
        return false;
      }
    },
    [reload, onChanged],
  );

  return {
    blocks,
    reload,
    create: (input) => run(() => call("/api/calendar", { method: "POST", body: JSON.stringify(input) }), "เพิ่มลงปฏิทินแล้ว"),
    update: (id, input) => run(() => call(`/api/calendar/${id}`, { method: "PATCH", body: JSON.stringify(input) }), "บันทึกแล้ว"),
    remove: (id) => run(() => call(`/api/calendar/${id}`, { method: "DELETE" }), "ลบแล้ว"),
    join: async (id, joined) => {
      // Show it at once; reload corrects it if the request fails.
      setBlocks((list) => list?.map((b) => (b.id === id ? { ...b, joined } : b)) ?? list);
      await run(() => call(`/api/calendar/${id}/join`, { method: "POST", body: JSON.stringify({ joined }) }));
    },
  };
}
