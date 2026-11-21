"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { LEARN_COPY } from "./copy";
import styles from "./learn.module.css";
import { learnCallbackUrl } from "./model";

/**
 * Sign in with Discord and come back to the page the viewer is on. The server
 * reads the Discord id from the Supabase user afterwards; this button never
 * sends one. `switchAccount` signs this browser out first (a viewer signed in
 * without Discord) and lets Discord ask which account.
 */
export function LessonDiscordButton({ switchAccount = false }: { switchAccount?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

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
    setError(false);
    try {
      const supabase = createClient();
      if (switchAccount) await supabase.auth.signOut({ scope: "local" });
      const next = `${window.location.pathname}${window.location.search}`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: learnCallbackUrl(window.location.origin, next),
          scopes: "identify email",
          ...(switchAccount ? { queryParams: { prompt: "consent" } } : {}),
        },
      });
      if (authError) throw authError;
    } catch (failure) {
      console.error("[elemental-learn] Discord sign-in failed:", failure instanceof Error ? failure.name : "unknown");
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className={styles.signIn}>
      <button type="button" onClick={signIn} disabled={pending} aria-busy={pending} className={styles.button}>
        {pending ? <Loader2 className={styles.spin} aria-hidden="true" /> : null}
        <span>{pending ? LEARN_COPY.signingIn : switchAccount ? LEARN_COPY.switchToDiscord : LEARN_COPY.signIn}</span>
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {LEARN_COPY.signInFailed}
        </p>
      ) : null}
    </div>
  );
}
