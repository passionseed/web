"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { setTalentVerified } from "@/app/admin/talent/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TalentVerifyToggleProps {
  id: string;
  verified: boolean;
  /** Nickname for the toasts. */
  name: string;
}

/**
 * Publishes or hides a signup on the public /talent page. Flips at once, then
 * reverts with an error toast if the save fails.
 */
export function TalentVerifyToggle({ id, verified, name }: TalentVerifyToggleProps) {
  const [live, setLive] = useState(verified);
  const [pending, startTransition] = useTransition();

  // The server value wins once the page revalidates.
  useEffect(() => setLive(verified), [verified]);

  const toggle = () => {
    const next = !live;
    setLive(next);
    startTransition(async () => {
      let ok = false;
      try {
        ok = (await setTalentVerified(id, next)).ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        setLive(!next);
        toast.error(
          next
            ? `Could not publish ${name}. Nothing changed, try again.`
            : `Could not hide ${name}. Nothing changed, try again.`,
        );
        return;
      }
      toast.success(next ? `${name} is live on /talent` : `${name} is hidden from /talent`);
      refreshAdminCounts();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={live ? "default" : "outline"}>{live ? "Live" : "Hidden"}</Badge>
      <Button
        size="sm"
        variant={live ? "outline" : "default"}
        className="h-11 lg:[@media(pointer:fine)]:h-9"
        disabled={pending}
        onClick={toggle}
        aria-label={live ? `Unpublish ${name}` : `Publish ${name}`}
      >
        {pending ? "Saving…" : live ? "Unpublish" : "Publish"}
      </Button>
    </div>
  );
}
