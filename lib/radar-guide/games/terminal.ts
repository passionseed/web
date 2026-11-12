/**
 * FakeTerminal: a pure client-side state machine over a whitelist of canned
 * commands. No eval, no network, no real filesystem, no pipe parser. Typed
 * input is normalised and compared to the whitelist; it is never sent or
 * stored (only mission numbers, the flag and the scope-try count are kept,
 * in `local`).
 *
 * FakeTerminalData conventions (U3):
 * - `commands[].match`: accepted spellings; quotes are ignored, so
 *   `grep -c "Failed" auth.log` and `grep -c Failed auth.log` are the same.
 * - `effect: "outOfScope"`: the output is the red stop card and `noteTh` is
 *   the tempting chip label. For other commands `noteTh` is a skill pop shown
 *   after the output.
 * - `requiresScope`: the chip stays hidden until a `scopeRead` command ran.
 * - `missions[].doneWhen`: conditions joined by " && ":
 *   `ran:<command>`, `tap:<text in an output line>`, `flag`, `decision`.
 *   A mission with a `question` also needs the right answer.
 */
import type { FakeTerminalData } from "../guide-types";

export type TermLineKind = "input" | "output" | "note" | "error" | "alert";

export interface TermLine {
  id: number;
  kind: TermLineKind;
  text: string;
  tappable?: boolean;
}

export interface TerminalState {
  lines: TermLine[];
  nextId: number;
  scopeRead: boolean;
  scopeTries: number;
  flag: boolean;
  /** Normalised commands run in this session (memory only). */
  ran: string[];
  /** `tap:` conditions met. */
  tapped: string[];
  /** Mission ids whose question was answered right. */
  answered: number[];
  missionsDone: number[];
  decision: string | null;
  decisionCorrect: boolean;
  poll: string | null;
  feedback: { tone: "good" | "bad" | "info"; text: string } | null;
}

export const MAX_TERMINAL_LINES = 80;
export const WRONG_LINE_TH = "ยังไม่ใช่บรรทัดนี้ ลองอีกที";
export const WRONG_ANSWER_TH = "ยังไม่ใช่ ลองดูผลลัพธ์อีกที";

export function initTerminal(): TerminalState {
  return {
    lines: [],
    nextId: 1,
    scopeRead: false,
    scopeTries: 0,
    flag: false,
    ran: [],
    tapped: [],
    answered: [],
    missionsDone: [],
    decision: null,
    decisionCorrect: false,
    poll: null,
    feedback: null,
  };
}

/** Trims, collapses inner spaces, drops quotes and lowercases the command name. */
export function normalizeCommand(input: string): string {
  const flat = input.replace(/["'“”‘’]/g, "").trim().replace(/\s+/g, " ");
  if (!flat) return "";
  const [head, ...rest] = flat.split(" ");
  return [head.toLowerCase(), ...rest].join(" ");
}

export type TerminalCommand = FakeTerminalData["commands"][number];

export function findCommand(data: FakeTerminalData, input: string): TerminalCommand | undefined {
  const norm = normalizeCommand(input);
  if (!norm) return undefined;
  return data.commands.find((c) => c.match.some((m) => normalizeCommand(m) === norm));
}

export function resolveOutput(data: FakeTerminalData, output: TerminalCommand["output"]): string[] {
  if (Array.isArray(output)) return [...(output as readonly string[])];
  const spec = output as Exclude<TerminalCommand["output"], readonly string[]>;
  let lines = [...(data.files[spec.file] ?? [])];
  if (spec.grep) lines = lines.filter((l) => l.includes(spec.grep!));
  if (spec.count) return [String(lines.length)];
  if (spec.head !== undefined) lines = lines.slice(0, spec.head);
  return lines;
}

export type Condition =
  | { type: "ran"; command: string }
  | { type: "tap"; text: string }
  | { type: "flag" }
  | { type: "decision" };

export function parseDoneWhen(doneWhen: string): Condition[] {
  return doneWhen
    .split("&&")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token): Condition => {
      if (token.startsWith("ran:")) return { type: "ran", command: normalizeCommand(token.slice(4)) };
      if (token.startsWith("tap:")) return { type: "tap", text: token.slice(4).trim() };
      if (token === "flag") return { type: "flag" };
      if (token === "decision") return { type: "decision" };
      // Unknown tokens are treated as a command so authoring mistakes show up as an unfinished mission.
      return { type: "ran", command: normalizeCommand(token) };
    });
}

type Mission = FakeTerminalData["missions"][number];

function conditionMet(state: TerminalState, c: Condition): boolean {
  switch (c.type) {
    case "ran":
      return state.ran.includes(c.command);
    case "tap":
      return state.tapped.includes(c.text);
    case "flag":
      return state.flag;
    case "decision":
      return state.decisionCorrect;
  }
}

export function conditionsMet(state: TerminalState, mission: Mission): boolean {
  return parseDoneWhen(mission.doneWhen).every((c) => conditionMet(state, c));
}

export function missionDone(state: TerminalState, mission: Mission): boolean {
  return conditionsMet(state, mission) && (!mission.question || state.answered.includes(mission.id));
}

function withMissions(state: TerminalState, data: FakeTerminalData): TerminalState {
  const done = data.missions.filter((m) => missionDone(state, m)).map((m) => m.id);
  return { ...state, missionsDone: done };
}

/** The first mission not done yet, in authored order. */
export function currentMission(state: TerminalState, data: FakeTerminalData): Mission | undefined {
  return data.missions.find((m) => !state.missionsDone.includes(m.id));
}

/** A mission whose conditions are met and whose question is still open. */
export function pendingQuestion(state: TerminalState, data: FakeTerminalData): Mission | undefined {
  return data.missions.find(
    (m) => m.question && !state.answered.includes(m.id) && conditionsMet(state, m)
  );
}

function push(state: TerminalState, kind: TermLineKind, texts: readonly string[], tappable = false): TerminalState {
  const lines = [...state.lines];
  let nextId = state.nextId;
  for (const text of texts) lines.push({ id: nextId++, kind, text, ...(tappable ? { tappable: true } : {}) });
  return { ...state, lines: lines.slice(-MAX_TERMINAL_LINES), nextId };
}

/** True when an unfinished mission asks to tap a line in this command's output. */
function outputTappable(state: TerminalState, data: FakeTerminalData, norm: string): boolean {
  return data.missions.some((m) => {
    if (missionDone(state, m)) return false;
    const cs = parseDoneWhen(m.doneWhen);
    return cs.some((c) => c.type === "tap") && cs.some((c) => c.type === "ran" && c.command === norm);
  });
}

export function runCommand(state: TerminalState, data: FakeTerminalData, input: string): TerminalState {
  const norm = normalizeCommand(input);
  if (!norm) return state;
  const cmd = findCommand(data, norm);
  let next = push({ ...state, feedback: null }, "input", [norm]);
  if (!cmd) return push(next, "error", [data.unknownTh]);

  const ran = next.ran.includes(norm) ? next.ran : [...next.ran, norm];
  if (cmd.effect === "clear") {
    return withMissions({ ...next, lines: [], ran }, data);
  }
  const out = resolveOutput(data, cmd.output);
  if (cmd.effect === "outOfScope") {
    next = push({ ...next, ran, scopeTries: next.scopeTries + 1 }, "alert", out);
    return withMissions(next, data);
  }
  next = { ...next, ran };
  if (cmd.effect === "scopeRead") next = { ...next, scopeRead: true };
  if (cmd.effect === "flag") next = { ...next, flag: true };
  next = withMissions(next, data);
  next = push(next, "output", out, outputTappable(next, data, norm));
  if (cmd.noteTh) next = push(next, "note", [cmd.noteTh]);
  return next;
}

export function tapOutputLine(state: TerminalState, data: FakeTerminalData, lineId: number): TerminalState {
  const line = state.lines.find((l) => l.id === lineId);
  if (!line?.tappable) return state;
  for (const m of data.missions) {
    if (missionDone(state, m)) continue;
    const tap = parseDoneWhen(m.doneWhen).find(
      (c): c is Extract<Condition, { type: "tap" }> => c.type === "tap"
    );
    if (!tap) continue;
    if (line.text.includes(tap.text)) {
      const next = withMissions({ ...state, tapped: [...state.tapped, tap.text] }, data);
      return { ...next, feedback: m.feedbackTh ? { tone: "good", text: m.feedbackTh } : null };
    }
  }
  return { ...state, feedback: { tone: "bad", text: WRONG_LINE_TH } };
}

export function answerMission(
  state: TerminalState,
  data: FakeTerminalData,
  missionId: number,
  option: string
): TerminalState {
  const m = data.missions.find((x) => x.id === missionId);
  if (!m?.question || state.answered.includes(missionId) || !conditionsMet(state, m)) return state;
  if (option !== m.question.answer) return { ...state, feedback: { tone: "bad", text: WRONG_ANSWER_TH } };
  const next = withMissions({ ...state, answered: [...state.answered, missionId] }, data);
  return { ...next, feedback: m.feedbackTh ? { tone: "good", text: m.feedbackTh } : null };
}

export function decide(state: TerminalState, data: FakeTerminalData, optionId: string): TerminalState {
  const option = data.decision.options.find((o) => o.id === optionId);
  if (!option) return state;
  const next = withMissions(
    { ...state, decision: optionId, decisionCorrect: state.decisionCorrect || option.correct },
    data
  );
  return { ...next, feedback: { tone: option.correct ? "good" : "bad", text: option.feedbackTh } };
}

export function answerPoll(state: TerminalState, data: FakeTerminalData, optionId: string): TerminalState {
  if (state.poll || !data.poll.options.some((o) => o.id === optionId)) return state;
  return { ...state, poll: optionId };
}

export function allMissionsDone(state: TerminalState, data: FakeTerminalData): boolean {
  return data.missions.every((m) => state.missionsDone.includes(m.id));
}

/** True when the current mission is the decision (show the three options). */
export function decisionOpen(state: TerminalState, data: FakeTerminalData): boolean {
  const m = currentMission(state, data);
  return Boolean(m && parseDoneWhen(m.doneWhen).some((c) => c.type === "decision"));
}

export interface TerminalChip {
  /** The command the chip runs (as authored, quotes kept). */
  command: string;
  /** Tempting label for an out-of-scope chip. */
  labelTh?: string;
  danger: boolean;
}

/**
 * Chips: `help`, the current mission's commands not run yet, and once the
 * scope is read, every `requiresScope` command (including one tempting
 * out-of-scope chip).
 */
export function terminalChips(state: TerminalState, data: FakeTerminalData): TerminalChip[] {
  const chips: TerminalChip[] = [];
  const add = (cmd: TerminalCommand | undefined) => {
    if (!cmd) return;
    const command = cmd.match[0];
    if (chips.some((c) => c.command === command)) return;
    const danger = cmd.effect === "outOfScope";
    chips.push({ command, danger, ...(danger && cmd.noteTh ? { labelTh: cmd.noteTh } : {}) });
  };
  const current = currentMission(state, data);
  if (current) {
    for (const c of parseDoneWhen(current.doneWhen)) {
      if (c.type === "ran" && !state.ran.includes(c.command)) add(findCommand(data, c.command));
    }
    // A mission that ends with the flag needs the flag command too.
    if (parseDoneWhen(current.doneWhen).some((c) => c.type === "flag") && !state.flag) {
      add(data.commands.find((c) => c.effect === "flag"));
    }
  }
  if (state.scopeRead) for (const cmd of data.commands) if (cmd.requiresScope) add(cmd);
  if (chips.length === 0 || !state.ran.includes("help")) add(findCommand(data, "help"));
  return chips;
}

/** Device-only progress for `local.terminal`: never commands, never typed text. */
export function terminalLocal(state: TerminalState): { missions: number[]; flag: boolean; scopeTries: number } {
  return { missions: [...state.missionsDone], flag: state.flag, scopeTries: state.scopeTries };
}

/** The state after "ข้ามเกม ดูเฉลย": every mission done, scope read, flag found. */
export function solvedTerminal(data: FakeTerminalData): TerminalState {
  const s = initTerminal();
  const correct = data.decision.options.find((o) => o.correct);
  return {
    ...s,
    scopeRead: true,
    flag: true,
    decision: correct?.id ?? null,
    decisionCorrect: true,
    missionsDone: data.missions.map((m) => m.id),
    answered: data.missions.filter((m) => m.question).map((m) => m.id),
  };
}
