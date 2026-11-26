"use client";

import { useEffect, useState } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL_DISCORD_SCOPES, elementalDiscordCallbackUrl } from "@/lib/hackathon/elemental/discordLink";
import { createClient } from "@/utils/supabase/client";

/**
 * Signs in with Discord and comes back to this sign-up page through
 * /auth/callback, which links the account and adds them to the server.
 * Discord sign-in reuses the PassionSeed account that already owns the
 * identity, and Supabase links matching verified emails on its own.
 */
export function ConnectDiscord({
  token,
  className,
  style,
  demo,
}: {
  token: string;
  className: string;
  style: React.CSSProperties;
  demo?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // Coming back with the browser's back button restores a pressed button.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function connect() {
    if (demo) return;
    setPending(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: elementalDiscordCallbackUrl(token, window.location.origin),
        scopes: ELEMENTAL_DISCORD_SCOPES,
        queryParams: { prompt: "consent" },
      },
    });
    if (error) {
      console.error("[elemental-discord] Discord sign-in failed:", error.message);
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={connect} disabled={pending} aria-busy={pending} className={className} style={style}>
        {pending ? "กำลังเปิด Discord…" : "เข้า Discord ด้วยบัญชีของเรา"}
      </button>
      {failed && (
        <p className="text-sm" style={{ color: EL.flame }} role="alert">
          เปิด Discord ไม่สำเร็จ ลองอีกครั้ง หรือทักไลน์ทีมงาน
        </p>
      )}
    </div>
  );
}
