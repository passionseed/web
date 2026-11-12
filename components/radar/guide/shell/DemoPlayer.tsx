"use client";

/**
 * Plays a level's demo script in demo mode (`?demo=1`, or the filming frame)
 * for `pnpm radar:reel --format demo`: taps, types into and scrolls to
 * `[data-demo="<target>"]` elements on timers, so Chrome virtual time makes it
 * deterministic. Renders nothing; does nothing outside demo mode. Sets
 * `data-demo-done="true"` on <html> when the last step has run.
 */
import { useEffect } from "react";
import type { DemoStep } from "@/lib/radar-guide/guide-types";
import { demoTargetSelector, scheduleDemo } from "@/lib/radar-guide/demo";
import { useGuideShellOptional } from "./shell-context";

/** Lead-in before the first step, so the scene and dialogue paint first. */
export const DEMO_LEAD_IN_MS = 600;

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Runs one step against the document. Exported for tests. */
export function runDemoStep(step: DemoStep, doc: Document = document): boolean {
  if (step.action === "wait") return true;
  const el = doc.querySelector<HTMLElement>(demoTargetSelector(step.target));
  if (!el) return false;
  if (step.action === "tap") el.click();
  else if (step.action === "scroll") el.scrollIntoView({ block: "center" });
  else if (step.action === "type") {
    const input =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el
        : el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (!input) return false;
    input.focus();
    setNativeValue(input, step.text);
  }
  return true;
}

export interface DemoPlayerProps {
  steps: readonly DemoStep[];
  /** Force on (tests). Default: the shell's demo mode. */
  enabled?: boolean;
}

export function DemoPlayer({ steps, enabled }: DemoPlayerProps) {
  const shell = useGuideShellOptional();
  const on = enabled ?? Boolean(shell?.ready && shell.demo);
  useEffect(() => {
    if (!on || !steps.length) return;
    const root = document.documentElement;
    delete root.dataset.demoDone;
    const shifted = steps.map((s) => ({ ...s, at: s.at + DEMO_LEAD_IN_MS }));
    const last = shifted.length - 1;
    return scheduleDemo(shifted, (step, i) => {
      runDemoStep(step);
      if (i === last) root.dataset.demoDone = "true";
    });
  }, [on, steps]);
  return null;
}
