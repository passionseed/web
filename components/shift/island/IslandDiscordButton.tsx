"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { GATE } from "./copy";
import styles from "./island.module.css";

const NEXT = "/shift/island";

/** The OAuth return URL on this origin (0.0.0.0 and [::] become localhost, where the PKCE cookie lives). */
export function islandCallbackUrl(origin: string): string {
  const url = new URL("/auth/callback", origin);
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") url.hostname = "localhost";
  url.searchParams.set("next", NEXT);
  return url.toString();
}

interface IslandDiscordButtonProps {
  label: string;
  /** Switch account: sign this browser out first and let Discord ask which account. */
  switchAccount?: boolean;
  variant?: "primary" | "quiet";
  /** Replaces the primary button's classes: the invite's ticket wears its own (islandInvite.module.css). */
  className?: string;
}

/**
 * Sign in with Discord and come back to /shift/island. The server reads the
 * Discord id from the Supabase user afterwards; this button never sends one.
 */
export function IslandDiscordButton({
  label,
  switchAccount = false,
  variant = "primary",
  className,
}: IslandDiscordButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back from Discord's page can restore this one from the back-forward cache with the spinner on.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      if (switchAccount) await supabase.auth.signOut({ scope: "local" });
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: islandCallbackUrl(window.location.origin),
          scopes: "identify email",
          ...(switchAccount ? { queryParams: { prompt: "consent" } } : {}),
        },
      });
      if (authError) throw authError;
    } catch (failure) {
      console.error("[shift-island] Discord sign-in failed:", failure instanceof Error ? failure.message : "unknown");
      setError(GATE.signInFailed);
      setPending(false);
    }
  }

  return (
    <div className={styles.discord}>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        aria-busy={pending}
        className={variant === "primary" ? (className ?? `ei-button-dawn ${styles.primary}`) : styles.quietButton}
      >
        {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
        <span>{label}</span>
      </button>
      {error ? (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
