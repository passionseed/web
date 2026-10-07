"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";
import { SHIFT_DISCORD_SCOPES, shiftDiscordCallbackUrl } from "@/lib/shift/discordAuth";
import { createClient } from "@/utils/supabase/client";

const buttonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-kodchasan text-lg font-bold transition-transform active:scale-[0.98] disabled:opacity-60";

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
        className={buttonClass}
        style={{ backgroundColor: "#5865F2", color: "#fff" }}
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        {label}
      </button>
      {error && (
        <p className="text-sm" style={{ color: INK.orange }}>
          {error}
        </p>
      )}
    </div>
  );
}

const SYNC_MESSAGES: Record<string, string> = {
  not_member: "ยังไม่เจอในเซิร์ฟ กดลิงก์เชิญด้านบนก่อน แล้วค่อยกดปุ่มนี้อีกที",
  not_configured: "ระบบ Discord ยังไม่พร้อม ทักพี่ใน LINE ได้เลย",
  error: "รับ role ไม่สำเร็จ ลองอีกครั้ง หรือทักพี่ใน LINE",
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
        className={buttonClass}
        style={{ backgroundColor: INK.yellow, color: INK.black }}
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        เข้าเซิร์ฟแล้ว กดรับ role
      </button>
      {message && (
        <p className="text-sm" style={{ color: INK.orange }}>
          {message}
        </p>
      )}
    </div>
  );
}

export const shiftJoinButtonClass = buttonClass;
