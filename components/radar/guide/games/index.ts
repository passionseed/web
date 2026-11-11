/**
 * Game engines for code guides (U2). The shell's GameIsland loads one engine
 * per game block through ENGINE_LOADERS (each in its own chunk, wrapped in
 * next/dynamic with ssr: false by the island), and wraps it in
 * <EngineStoreProvider value={{ state, dispatch, pages }}> so engines can read
 * and save progress.
 *
 * Contract with U1 (docs/features/radar-guides-in-code.md 5.2):
 * - Engines call `onResult` once at completion; on skip they render the solved
 *   state and report { done: true, skipped: true } once.
 * - Engines fire their own `interactive_tap` (track.done, track.milestones).
 * - The shell renders "ข้ามเกม ดูเฉลย" (GameSkipLink from engine-shell) and
 *   the static answersTh fallback.
 *
 * No content imports here: engines get their block's JSON as props only.
 */
import type { ComponentType } from "react";
import type { EngineId, EngineProps } from "@/lib/radar-guide/guide-types";

export type EngineModule<E extends EngineId> = { default: ComponentType<EngineProps<E>> };

export const ENGINE_LOADERS: { [E in EngineId]: () => Promise<EngineModule<E>> } = {
  FindLine: () => import("./FindLine"),
  GuessReveal: () => import("./GuessReveal"),
  SortGame: () => import("./SortGame"),
  FlipCards: () => import("./FlipCards"),
  DateToggle: () => import("./DateToggle"),
  LadderRebuild: () => import("./LadderRebuild"),
  BinaryChoice: () => import("./BinaryChoice"),
  ProgrammeFilter: () => import("./ProgrammeFilter"),
  FakeTerminal: () => import("./FakeTerminal"),
  EvidenceMaker: () => import("./EvidenceMaker"),
  RecapCard: () => import("./RecapCard"),
};

export const ENGINE_IDS = Object.keys(ENGINE_LOADERS) as EngineId[];

/**
 * `data-demo` parts per engine. A demoScript target is `${blockId}.${part}`
 * (demoId in engine-shell). `<x>` is filled from the block data.
 */
export const ENGINE_DEMO_PARTS: { readonly [E in EngineId]: readonly string[] } = {
  FindLine: ["line-<n>"],
  GuessReveal: ["minus", "plus", "slider", "lock"],
  SortGame: ["item-<id>", "bin-<binId> (cards)", "item-<id>-bin-<binId> (queue, chat)", "next (chat)", "timer"],
  FlipCards: ["card-<id>"],
  DateToggle: ["chip-<id>"],
  LadderRebuild: ["ai", "replace", "chip-<id>", "confirm"],
  BinaryChoice: ["q-<id>-left", "q-<id>-right"],
  ProgrammeFilter: ["grade-<m4|m5|m6>", "round-<portfolio|all>", "track-<all|thai|intl>", "gpax", "save-<id>", "open-<id>", "more"],
  FakeTerminal: ["cmd-<command, spaces as _ and quotes dropped>", "input", "send", "hit-<n>", "answer-<option>", "decision-<id>", "poll-<id>"],
  EvidenceMaker: ["room", "check-<i>", "field-<id>", "copy"],
  RecapCard: ["fav-<pageKey>"],
};

/**
 * Milestone names each engine may fire (map them to targets in
 * GameTrack.milestones; unmapped names fire nothing).
 */
export const ENGINE_MILESTONES: { readonly [E in EngineId]: readonly string[] } = {
  FindLine: [],
  GuessReveal: [],
  SortGame: ["item:<itemId>"],
  FlipCards: ["flip"],
  DateToggle: ["chip"],
  LadderRebuild: ["ladder"],
  BinaryChoice: [],
  ProgrammeFilter: ["grade", "save"],
  FakeTerminal: ["mission", "flag", "scopeTry", "poll"],
  EvidenceMaker: ["checklist", "copied"],
  RecapCard: [],
};

/**
 * Choice keys the engines write (P = page key, B = block id). RecapCard
 * templates read them as `{name}` for the same page, or `{c:<key>}`.
 * - GuessReveal: `P:B` = guess
 * - SortGame: `P:<itemId>` = bin, `P:missed`, `P:x`, `P:y`
 * - LadderRebuild: `P:proof`; also `proof` and local.proofLabels
 * - BinaryChoice: `P:title`; also `fit`
 * - ProgrammeFilter: `grade`, `shortlist`, local.gpax
 * - FakeTerminal: `P:poll`, `P:scopeTries`, `P:missions`; local.terminal
 * - EvidenceMaker: `P:copied`; checklist `P:B`; local.drafts[B]
 * - RecapCard: `favourite`
 */
export { EngineStoreProvider, useEngineStore, type EngineStore } from "./engine-context";
export { GameSkipLink, SKIP_LABEL_TH, demoId } from "./engine-shell";
