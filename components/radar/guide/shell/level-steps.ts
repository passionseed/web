/**
 * A level (guide page) as a sequence of steps the sticky "ต่อ ▶" button
 * reveals one at a time: dialogue, an in-world item, a game, a cutscene...
 * Pure: shared by the server view (what to render) and the client stepper
 * (what "ต่อ" does next).
 */
import type {
  CopyRole,
  DemoStep,
  DialogueLine,
  DialogueSpeaker,
  GuideBlock,
  GuidePage,
} from "@/lib/radar-guide/guide-types";
import { splitDialogue, type HostMood } from "@/lib/radar-guide/story";

export type StepKind = GuideBlock["kind"] | "profile";

/** What the client needs to know about a step (serializable). */
export interface StepMeta {
  id: string;
  kind: StepKind;
  /** Label for the "ต่อ" press that reveals this step (a beat's unlockLabelTh). */
  labelTh?: string;
  /** Always visible, never waits for "ต่อ" (safety lines). Skipped when advancing. */
  pinned?: boolean;
}

export interface LevelStep extends StepMeta {
  /** The block to render; null for the shell-added profile step. */
  block: GuideBlock | null;
}

/** The profile card step id, appended to the final level. */
export const PROFILE_STEP_ID = "__profile";

function visible(block: GuideBlock): boolean {
  return !("phase" in block && block.phase === 2);
}

function flatten(blocks: readonly GuideBlock[], out: LevelStep[], labelTh?: string): void {
  let label = labelTh;
  for (const block of blocks) {
    if (!visible(block)) continue;
    if (block.kind === "beat") {
      flatten(block.blocks, out, block.unlockLabelTh);
      continue;
    }
    out.push({
      id: block.id,
      kind: block.kind,
      block,
      ...(label ? { labelTh: label } : {}),
      ...(block.kind === "safety" ? { pinned: true } : {}),
    });
    label = undefined;
  }
}

/**
 * Flattens a page into steps: beats open up (their first block carries the
 * beat's unlock label), phase-2 blocks are left out, safety blocks are pinned,
 * and the final level ends with the profile card.
 */
export function buildLevelSteps(page: Pick<GuidePage, "blocks">, opts: { final?: boolean } = {}): LevelStep[] {
  const steps: LevelStep[] = [];
  flatten(page.blocks, steps);
  if (opts.final) steps.push({ id: PROFILE_STEP_ID, kind: "profile", block: null });
  return steps;
}

export function stepMeta(steps: readonly LevelStep[]): StepMeta[] {
  return steps.map(({ id, kind, labelTh, pinned }) => ({
    id,
    kind,
    ...(labelTh ? { labelTh } : {}),
    ...(pinned ? { pinned } : {}),
  }));
}

/** The next step "ต่อ" reveals after `cursor` (pinned steps are already visible), or -1 at the end. */
export function nextStepIndex(steps: readonly Pick<StepMeta, "pinned">[], cursor: number): number {
  for (let i = Math.max(0, cursor + 1); i < steps.length; i++) {
    if (!steps[i].pinned) return i;
  }
  return -1;
}

/** The first step to show on arrival: 0, or past leading pinned steps to the first real one. */
export function initialCursor(steps: readonly Pick<StepMeta, "pinned">[]): number {
  const i = steps.findIndex((s) => !s.pinned);
  return i < 0 ? Math.max(0, steps.length - 1) : i;
}

/** Whether step `i` is on screen for this cursor. */
export function stepShown(steps: readonly Pick<StepMeta, "pinned">[], i: number, cursor: number): boolean {
  return i <= cursor || Boolean(steps[i]?.pinned);
}

/** Text on the sticky button: the next step's label, "ด่านต่อไป", or the level map on the last level. */
export function advanceLabel(
  steps: readonly Pick<StepMeta, "pinned" | "labelTh" | "kind">[],
  cursor: number,
  hasNextLevel: boolean
): string {
  const next = nextStepIndex(steps, cursor);
  if (next >= 0) {
    if (steps[next].kind === "profile") return "ดูโปรไฟล์ของฉัน";
    return steps[next].labelTh ?? "ต่อ";
  }
  return hasNextLevel ? "ด่านต่อไป" : "แผนที่ด่าน";
}

// ---------------------------------------------------------------- dialogue
export interface DialogueGroup {
  speaker: DialogueSpeaker;
  mood?: HostMood;
  /** One entry per dialogue box (long lines are split at spaces). */
  lines: string[];
}

/** Consecutive lines from the same speaker share one DialogueBox. */
export function dialogueGroups(lines: readonly DialogueLine[]): DialogueGroup[] {
  const groups: DialogueGroup[] = [];
  for (const line of lines) {
    const boxes = splitDialogue(line.text.th);
    if (!boxes.length) continue;
    const last = groups[groups.length - 1];
    if (last && last.speaker === line.speaker && (line.mood === undefined || line.mood === last.mood)) {
      last.lines.push(...boxes);
    } else {
      groups.push({ speaker: line.speaker, ...(line.mood ? { mood: line.mood } : {}), lines: boxes });
    }
  }
  return groups;
}

const SYSTEM_ROLES: readonly CopyRole[] = ["honesty", "update", "caption"];

/** Copy blocks are spoken, never printed as paragraphs: host lines, or system notes for honesty/update/caption. */
export function copySpeaker(role: CopyRole): DialogueSpeaker {
  return SYSTEM_ROLES.includes(role) ? "system" : "host";
}

// ---------------------------------------------------------------- demo
function collectScripts(blocks: readonly GuideBlock[], out: (readonly DemoStep[])[]): void {
  for (const block of blocks) {
    if (block.kind === "beat") collectScripts(block.blocks, out);
    else if ((block.kind === "game" || block.kind === "bespoke") && block.demoScript?.length && visible(block)) {
      out.push(block.demoScript);
    }
  }
}

/** Gap between two blocks' demo scripts when a page has several. */
export const DEMO_SCRIPT_GAP_MS = 800;

/** Every demo script on the page, played one after another (later scripts are offset). */
export function pageDemoScript(page: Pick<GuidePage, "blocks">): DemoStep[] {
  const scripts: (readonly DemoStep[])[] = [];
  collectScripts(page.blocks, scripts);
  const out: DemoStep[] = [];
  let offset = 0;
  for (const script of scripts) {
    let end = offset;
    for (const step of script) {
      const at = step.at + offset;
      out.push({ ...step, at });
      end = Math.max(end, at);
    }
    offset = end + DEMO_SCRIPT_GAP_MS;
  }
  return out;
}
