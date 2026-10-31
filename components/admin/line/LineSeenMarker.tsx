"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markLineSeen } from "@/app/admin/line/actions";

/**
 * Marks the open chat as seen when someone opens it, and later messages once
 * someone clicks, types, or comes back to the window. The 15-second background
 * refresh alone never marks anything seen, so messages that arrive while the
 * tab sits unattended stay unread.
 */
export function LineSeenMarker({
  contactId,
  unreadCount,
}: {
  contactId: string;
  unreadCount: number;
}) {
  const router = useRouter();
  const openedId = useRef<string | null>(null);
  const saving = useRef(false);

  const markSeen = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await markLineSeen(contactId);
      if (result.ok) router.refresh();
    } catch {
      // Not fatal: the chat just stays unread until the next try.
    } finally {
      saving.current = false;
    }
  }, [contactId, router]);

  // Opening a chat is a read.
  useEffect(() => {
    if (openedId.current === contactId) return;
    openedId.current = contactId;
    if (unreadCount > 0) void markSeen();
  }, [contactId, unreadCount, markSeen]);

  // Messages that arrive while it is open wait for a sign someone is there.
  useEffect(() => {
    if (unreadCount === 0) return;
    const onPresence = () => void markSeen();
    window.addEventListener("pointerdown", onPresence, { once: true });
    window.addEventListener("keydown", onPresence, { once: true });
    window.addEventListener("focus", onPresence, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onPresence);
      window.removeEventListener("keydown", onPresence);
      window.removeEventListener("focus", onPresence);
    };
  }, [unreadCount, markSeen]);

  return null;
}
