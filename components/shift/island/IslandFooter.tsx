"use client";

import { useId, useOptimistic, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { setShowName } from "@/app/shift/island/actions";
import { Switch } from "@/components/ui/switch";
import type { IslandProject, ViewerCard } from "@/lib/supabase/shift-quests/types";

import { COMMON, FOOTER } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";

interface IslandFooterProps {
  project: Pick<IslandProject, "id" | "show_name" | "name_visible">;
  me: ViewerCard;
  /** Shown beside the signed-in line (the HUD menu passes the avatar). */
  avatar?: ReactNode;
}

/** The show-name switch (team consent), the growth rule, and who is signed in. */
export function IslandFooter({ project, me, avatar }: IslandFooterProps) {
  const switchId = useId();
  const [show, setOptimisticShow] = useOptimistic(project.show_name, (_current, next: boolean) => next);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimisticShow(next);
      const result = await setShowName({ projectId: project.id, show: next });
      if (!result.ok) toast.error(result.error || COMMON.failed);
      else if (next && !result.data.nameVisible) toast.success(FOOTER.showNameWaiting);
    });
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerRow}>
        <label htmlFor={switchId} className={styles.footerLabel}>
          {FOOTER.showName}
        </label>
        <Switch
          id={switchId}
          checked={show}
          disabled={pending}
          onCheckedChange={toggle}
          className={styles.switch}
          aria-describedby={`${switchId}-fine`}
        />
      </div>
      <p id={`${switchId}-fine`} className={styles.hint}>
        {show && !project.name_visible ? FOOTER.showNameWaiting : FOOTER.showNameFine}
      </p>
      <p className={styles.growth}>{FOOTER.growth}</p>
      <div className={styles.footerRow}>
        <p className={`${styles.hint} ${styles.footerWho}`}>
          {avatar}
          <span>{FOOTER.signedInAs(me.name)}</span>
        </p>
        <IslandDiscordButton label={FOOTER.switchAccount} switchAccount variant="quiet" />
      </div>
    </footer>
  );
}
