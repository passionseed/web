"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { ExpertDetail } from "@/components/admin/ExpertDetail";
import { ExpertQueue } from "@/components/admin/ExpertQueue";
import { useShallowUrl, type UrlWriteMode } from "@/components/admin/queue-tools/useShallowUrl";
import { expertsQuery, parseExpertsView, type ExpertsView } from "@/lib/admin/queue-tools/experts";

/**
 * The expert queue and one submission, both driven by the URL
 * (?status, ?page, ?id), so the overview and the command palette can deep-link
 * and the browser Back button returns from a submission to the list.
 */
export function ExpertQueueClient() {
  const { searchParams, write } = useShallowUrl();
  const view = useMemo(() => parseExpertsView(searchParams), [searchParams]);
  /** True when the open submission was pushed from the list in this tab. */
  const openedFromList = useRef(false);

  useEffect(() => {
    if (!view.id) openedFromList.current = false;
  }, [view.id]);

  const go = useCallback(
    (patch: Partial<ExpertsView>, mode: UrlWriteMode = "replace") =>
      write(expertsQuery({ ...view, ...patch }), mode),
    [view, write],
  );

  const backToList = useCallback(() => {
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
    } else {
      // Opened from a link: there is no list entry behind it to go back to.
      go({ id: null });
    }
  }, [go]);

  if (view.id) {
    return (
      <ExpertDetail
        key={view.id}
        expertId={view.id}
        onBack={backToList}
        onActionComplete={backToList}
      />
    );
  }

  return (
    <ExpertQueue
      status={view.status}
      page={view.page}
      onStatusChange={(status) => go({ status, page: 1 })}
      onPageChange={(page) => go({ page })}
      onSelectExpert={(id) => {
        openedFromList.current = true;
        go({ id }, "push");
      }}
    />
  );
}
