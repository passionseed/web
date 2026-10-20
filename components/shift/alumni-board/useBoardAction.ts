"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { BoardActionResult } from "@/app/shift/alumni/board/actions";

/**
 * Runs a board server action: shows its error as a toast and reports whether
 * it worked. The action revalidates the board, so the page refreshes itself.
 */
export function useBoardAction() {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<BoardActionResult>, onDone?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) onDone?.();
        else toast.error(result.error);
      } catch {
        toast.error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    });
  }

  return { pending, run };
}
