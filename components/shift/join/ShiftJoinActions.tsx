"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, DoorOpen, Loader2 } from "lucide-react";
import { DiscordIcon } from "./DiscordIcon";

import { FLOW_TEXT, flowButtonClass } from "@/components/shift/join/shiftFlowInk";
import { SHIFT_DISCORD_SCOPES, shiftDiscordCallbackUrl } from "@/lib/shift/discordAuth";
import { createClient } from "@/utils/supabase/client";

/**
 * Discord sign-in reuses the account that already owns the identity. Supabase
 * also links matching verified emails automatically, avoiding linkIdentity's
 * conflict when a visitor is currently signed into a different account.
 */
export function ConnectDiscordButton({
  token,
  label = "เข้าสู่ระบบด้วย Discord",
}: {
  token: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back from Discord's login can restore this page from the back-forward
  // cache with the spinner still on; re-enable the button.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function connect() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const options = {
      redirectTo: shiftDiscordCallbackUrl(token, window.location.origin),
      scopes: SHIFT_DISCORD_SCOPES,
      queryParams: { prompt: "consent" },
    };
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "discord", options });
    if (authError) {
      console.error("[shift-join] Discord auth failed:", authError.message);
      setError("เชื่อม Discord ไม่สำเร็จ ลองใหม่อีกครั้ง หรือทักพี่ใน LINE");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={connect}
        disabled={pending}
        aria-busy={pending}
        className={flowButtonClass}
        data-variant="discord"
      >
        {pending ? <Loader2 className="h-5 w-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <DiscordIcon className="h-6 w-6 shrink-0" />}
        {pending ? "กำลังเปิด Discord…" : label}
        {!pending && <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />}
      </button>
      {error && (
        <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const SYNC_MESSAGES: Record<string, string> = {
  not_member: "ยังไม่ได้เข้ากลุ่ม SHIFT กดปุ่มที่ 1 แล้วรับคำเชิญก่อน จากนั้นกลับมากดปุ่มนี้อีกครั้ง",
  not_configured: "ระบบ Discord ยังไม่พร้อม ทักพี่ใน LINE ได้เลย",
  error: "เปิดห้องเรียนไม่สำเร็จ ลองอีกครั้ง หรือทักพี่ใน LINE",
};

/** For students who came in through the invite: grants roles now that the
 *  bot can see them in the server. */
export function SyncRolesButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/shift/join/${token}/sync`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { state?: string };
      if (res.ok) {
        router.refresh();
        return;
      }
      setMessage(SYNC_MESSAGES[body.state ?? "error"] ?? SYNC_MESSAGES.error);
    } catch {
      setMessage(SYNC_MESSAGES.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        aria-busy={pending}
        className={flowButtonClass}
      >
        {pending ? <Loader2 className="h-5 w-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <DoorOpen className="h-5 w-5 shrink-0" aria-hidden="true" />}
        {pending ? "กำลังเปิดห้องเรียน…" : "2. เปิดห้องเรียนของรุ่น"}
      </button>
      {message && (
        <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

/** Kept for callers outside the flow kit; same class as flowButtonClass. */
export const shiftJoinButtonClass = flowButtonClass;
