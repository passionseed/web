"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { FLOW_TEXT, flowButtonClass } from "@/components/shift/join/shiftFlowInk";

/** Small client pieces shared by the SeedStack connect, dashboard and withdraw UI. */

export type SeedstackAction = () => Promise<{ ok: true; value: string | null } | { ok: false; error: string }>;

/** Runs a server action, keeps its string result, and surfaces errors. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(null);

  function run(action: SeedstackAction) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setValue(result.value);
      else setError(result.error);
    });
  }
  return { pending, error, value, run };
}

export function Button({
  onClick,
  type = "button",
  pending,
  disabled,
  primary,
  children,
}: {
  onClick?: () => void;
  type?: "button" | "submit";
  pending?: boolean;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
      aria-busy={pending}
      className={flowButtonClass}
      data-variant={primary ? undefined : "quiet"}
    >
      {pending && <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm font-semibold leading-relaxed" style={{ color: FLOW_TEXT.warn }} role="alert">
      {error}
    </p>
  );
}

export function Text({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-relaxed" style={{ color: FLOW_TEXT.body }}>
      {children}
    </p>
  );
}
