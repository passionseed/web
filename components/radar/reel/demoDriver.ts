/**
 * Camera work for demo reels. The level's own DemoPlayer (components/radar/guide/shell)
 * performs every step: it taps and types into `[data-demo="<target>"]` on its
 * timers. The filming frame (PageFrame) only follows it like a camera
 * operator: it scrolls the next target into view just before the step, draws
 * a fingertip where the tap lands, and notes targets that are missing so
 * radar:reel can report them. Nothing here clicks, so a step never runs twice.
 * Browser only; timers only, so Chrome virtual time keeps every frame deterministic.
 */
import type { DemoStep } from "../../../lib/radar-guide/guide-types";
import { demoTargetSelector } from "../../../lib/radar-guide/demo";

/** How long before a tap or type the camera brings the target into view. */
export const DEMO_REVEAL_MS = 320;
/** The camera scroll is this many timer ticks (no smooth-scroll API: it must follow virtual time). */
const SCROLL_TICKS = 8;

export interface DemoStepOutcome {
  /** Where the step lands, in viewport (client) coordinates, for the fingertip. */
  point: { x: number; y: number } | null;
  miss?: string;
}

export interface DemoCameraCue {
  /** ms from the moment the level shows (same clock as DemoReelPlan.steps). */
  at: number;
  kind: "reveal" | "touch";
  step: DemoStep;
  index: number;
}

/**
 * When the camera acts for each step: a reveal DEMO_REVEAL_MS before every tap
 * or type (never before 0), and a touch at the step itself. Scroll and wait
 * steps need no camera: DemoPlayer scrolls on its own. Sorted by time. Pure.
 */
export function demoCameraCues(steps: readonly DemoStep[]): DemoCameraCue[] {
  const cues: DemoCameraCue[] = [];
  steps.forEach((step, index) => {
    if (step.action !== "tap" && step.action !== "type") return;
    cues.push({ at: Math.max(0, step.at - DEMO_REVEAL_MS), kind: "reveal", step, index });
    cues.push({ at: step.at, kind: "touch", step, index });
  });
  return cues.sort((a, b) => a.at - b.at || (a.kind === b.kind ? 0 : a.kind === "reveal" ? -1 : 1));
}

function targetOf(step: DemoStep, root: ParentNode): HTMLElement | null {
  if (step.action === "wait") return null;
  return root.querySelector<HTMLElement>(demoTargetSelector(step.target));
}

/** Whether the element sits inside the band of the viewport Instagram leaves visible. */
function comfortablyInView(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = window.innerHeight;
  return r.top >= h * 0.12 && r.bottom <= h * 0.65;
}

/**
 * Scrolls the window so `el` sits about a third of the way down, in
 * SCROLL_TICKS timer steps over `ms`. Returns a cancel function.
 */
function glideTo(el: Element, ms: number): () => void {
  const r = el.getBoundingClientRect();
  const from = window.scrollY;
  const to = Math.max(0, from + r.top + r.height / 2 - window.innerHeight * 0.38);
  if (Math.abs(to - from) < 2) return () => {};
  const timers: number[] = [];
  for (let i = 1; i <= SCROLL_TICKS; i++) {
    const t = i / SCROLL_TICKS;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    timers.push(window.setTimeout(() => window.scrollTo(0, from + (to - from) * eased), (ms * i) / SCROLL_TICKS));
  }
  return () => timers.forEach((t) => window.clearTimeout(t));
}

/** Brings the step's target into view ahead of the tap. Returns a cancel function. */
export function revealDemoTarget(step: DemoStep, root: ParentNode, ms = DEMO_REVEAL_MS * 0.75): () => void {
  const el = targetOf(step, root);
  if (!el || comfortablyInView(el)) return () => {};
  return glideTo(el, ms);
}

/** Where the step lands, or why it cannot (the target is not on the page). */
export function locateDemoStep(step: DemoStep, root: ParentNode): DemoStepOutcome {
  if (step.action === "wait") return { point: null };
  const el = targetOf(step, root);
  if (!el) return { point: null, miss: `${step.action} ${step.target} at ${step.at}ms: no [data-demo="${step.target}"] on the page` };
  if (step.action === "scroll") return { point: null };
  const rect = el.getBoundingClientRect();
  return { point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
}
