"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FLOW_TEXT, flowButtonClass } from "@/components/shift/join/shiftFlowInk";
import { createClient } from "@/utils/supabase/client";

/**
 * Signs in with the Discord account linked on /shift/join and comes back to
 * `next`. Supabase reuses the account that already owns the identity.
 */
export function SeedstackDiscordButton({ next, label = "เข้าสู่ระบบด้วย Discord" }: { next: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: redirectTo.toString(), scopes: "identify email" },
    });
    if (authError) {
      console.error("[seedstack] Discord sign-in failed:", authError.message);
      setError("เข้าสู่ระบบด้วย Discord ไม่สำเร็จ ลองใหม่อีกครั้ง");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        aria-busy={pending}
        className={flowButtonClass}
        data-variant="discord"
      >
        {pending && <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />}
        {label}
      </button>
      {error && (
        <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
