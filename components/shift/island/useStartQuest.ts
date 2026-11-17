"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import { chooseSideQuest, startMainQuest } from "@/app/shift/island/actions";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";

import { COMMON } from "./copy";

/**
 * Takes on an untouched main or side quest without sending anything, so it
 * becomes the student's active quest (and shows as held to teammates). Used
 * by the next-step card's เริ่มเลย and the quest page's เริ่มเควสต์นี้. No
 * toast on success: the page refreshes into the started quest, which says so
 * itself. A proposed quest is never "started" here.
 */
export function useStartQuest(): { pending: boolean; start: (ref: BoardRef) => Promise<boolean> } {
  const [pending, startTransition] = useTransition();
  const start = useCallback(
    (ref: BoardRef) =>
      new Promise<boolean>((resolve) => {
        if (ref.kind === "proposed") return resolve(false);
        startTransition(async () => {
          const result =
            ref.kind === "main" ? await startMainQuest({ milestone: ref.milestone }) : await chooseSideQuest({ templateId: ref.templateId });
          if (!result.ok) toast.error(result.error || COMMON.failed);
          resolve(result.ok);
        });
      }),
    [],
  );
  return { pending, start };
}
