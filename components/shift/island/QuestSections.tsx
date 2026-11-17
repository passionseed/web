"use client";

/**
 * The quest page's sections, top to bottom after the header: the team's
 * problem (first act), a skill quest's picture, steps and words, หลุมพราง,
 * examples, ตัวช่วย and who checks. Every hint
 * line carries a pixel icon (questArt.ts), so the page reads at a glance.
 * QuestDetailSheet composes them; each one returns null when it has nothing.
 */
import { useId, type ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import {
  DETAIL,
  HELPERS,
  PITFALL,
  QUEST,
  QUEST_ACTS,
  QUEST_GUIDE_COPY,
  STAKEHOLDER_MAP,
  TEAM_PROBLEM,
  WHO_CHECKS,
  type QuestPitfall,
  type QuestStep,
  type QuestTerm,
} from "./copy";
import styles from "./island.module.css";
import type { QuestView } from "./model";
import { exampleArt, HELPER_ICONS, PITFALL_ICONS } from "./questArt";
import { PALETTE, iconGrid, iconScale, sideIcon, type IconKey } from "./sprites";

/** A pixel icon at an integer scale that fits `size` px. */
export function HintIcon({ name, size = 20 }: { name: IconKey; size?: number }) {
  const grid = iconGrid(name);
  return <PixelIcon grid={grid} palette={PALETTE} scale={iconScale(grid, size)} className={styles.pixelIcon} />;
}

/** The first act's quests (meeting real people): they show the team's problem and the safety line. */
const FIRST_ACT: ReadonlySet<number> = new Set(QUEST_ACTS[0]?.milestones ?? []);

/** The main quest a view belongs to: its own milestone, or the one a side quest branches off. */
function anchorMilestone(board: QuestBoard, quest: QuestView): number | null {
  if (quest.ref.kind === "main") return quest.ref.milestone;
  if (quest.ref.kind === "side") {
    const templateId = quest.ref.templateId;
    return board.side.find((s) => s.template_id === templateId)?.branch_of ?? null;
  }
  return null;
}

export function inFirstAct(board: QuestBoard, quest: QuestView): boolean {
  const m = anchorMilestone(board, quest);
  return m != null && FIRST_ACT.has(m);
}

// ---------------------------------------------------------------- header

/**
 * The quest's picture on a sand tile, its chips, and for a main quest where it
 * sits in the seven stages: one cell per stage, grouped by act, the stages the
 * team passed in leaf, this one lit.
 */
export function QuestHeader({
  quest,
  board,
  badge,
  chip,
  keynote,
  help,
  stage = null,
}: {
  quest: QuestView;
  board: QuestBoard;
  badge: string;
  chip: string;
  keynote: boolean;
  help: string | null;
  /** Where the student's work stands (questStage): five dots instead of the status chip. Null: the chip. */
  stage?: number | null;
}) {
  const milestone = quest.ref.kind === "main" ? quest.ref.milestone : null;
  const act = milestone != null ? QUEST_ACTS.find((a) => a.milestones.includes(milestone)) : null;
  return (
    <div className={styles.questHeader}>
      <span className={styles.questTile} data-kind={quest.kind} aria-hidden="true">
        <HintIcon name={quest.icon} size={48} />
      </span>
      <div className={styles.questHeaderText}>
        <div className={styles.detailChips}>
          <span className={styles.questBadge} data-kind={quest.kind}>
            {badge}
          </span>
          {stage == null ? (
            <span className={styles.chip} data-status={quest.status} data-keynote={keynote ? "true" : undefined}>
              {chip}
            </span>
          ) : null}
          {help ? <span className={styles.helpText}>{help}</span> : null}
        </div>
        {stage != null ? <QuestStepper stage={stage} /> : null}
        {milestone != null && act ? <ActMeter board={board} current={milestone} act={act.title} /> : null}
      </div>
    </div>
  );
}

/** Five dots under the title: เริ่ม · ทำ · ส่ง · พี่เลี้ยงดู · ผ่าน, the ones behind lit, this one bright. */
export function QuestStepper({ stage }: { stage: number }) {
  const current = Math.min(Math.max(stage, 0), DETAIL.stepper.length - 1);
  return (
    <ol className={styles.stepper} aria-label={DETAIL.stepperLabel(DETAIL.stepper[current])}>
      {DETAIL.stepper.map((label, index) => (
        <li
          key={label}
          className={styles.stepperStep}
          data-state={index < current || stage >= DETAIL.stepper.length - 1 ? "done" : index === current ? "current" : undefined}
          aria-current={index === current ? "step" : undefined}
        >
          <span className={styles.stepperDot} aria-hidden="true" />
          <span className={styles.stepperLabel}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function ActMeter({ board, current, act }: { board: QuestBoard; current: number; act: string }) {
  const done = new Set(board.main.filter((m) => m.done).map((m) => m.milestone));
  return (
    <div className={styles.actMeter}>
      <span className={styles.actCells} aria-hidden="true">
        {QUEST_ACTS.map((a, index) => (
          <span key={a.title} className={styles.actGroup} data-act={index + 1}>
            {a.milestones.map((m) => (
              <span
                key={m}
                className={styles.actCell}
                data-done={done.has(m) ? "true" : undefined}
                data-current={m === current ? "true" : undefined}
              />
            ))}
          </span>
        ))}
      </span>
      <span className={styles.actName}>{act}</span>
    </div>
  );
}

// ---------------------------------------------------------------- team problem

/**
 * ปัญหาที่ทีมเลือก, on the first act: the line the team planted with its seed
 * (the project's ambition). Not planted yet: a way to plant it.
 */
export function TeamProblem({
  ambition,
  planted,
  onPlant,
  editor,
}: {
  ambition: string | null;
  planted: boolean;
  onPlant?: () => void;
  /** เปลี่ยน (schema 14): the ProblemEditor, under a planted line. */
  editor?: ReactNode;
}) {
  const headingId = useId();
  const line = ambition?.trim() ? ambition.trim() : null;
  if (!line && !onPlant) return null;
  return (
    <section className={styles.teamProblem} aria-labelledby={headingId}>
      <span className={styles.teamProblemIcon} aria-hidden="true">
        <HintIcon name="seed" size={28} />
      </span>
      <div className={styles.teamProblemBody}>
        <h3 id={headingId} className={styles.teamProblemHeading}>
          {TEAM_PROBLEM.heading}
        </h3>
        {line ? (
          <>
            <p className={styles.teamProblemLine}>{line}</p>
            <p className={styles.hint}>{TEAM_PROBLEM.note}</p>
            {editor}
          </>
        ) : (
          <p className={styles.hint}>{TEAM_PROBLEM.empty}</p>
        )}
        {!line && !planted && onPlant ? (
          <button type="button" className={`${styles.quietButton} ${styles.contextAction}`} onClick={onPlant}>
            <HintIcon name="seed" size={16} />
            <span>{TEAM_PROBLEM.plant}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how-to

/**
 * แผนที่คนรอบปัญหา as a picture: the problem in the middle, the four roles
 * around it (the English word over the Thai question, then who it is in the
 * example), and the one to talk to first ringed. Shown only on that quest.
 */
export function StakeholderMap({ slug }: { slug: string | null }) {
  const headingId = useId();
  if (slug !== STAKEHOLDER_MAP.slug) return null;
  // Two roles above the problem, two below.
  const above = STAKEHOLDER_MAP.roles.slice(0, 2);
  const below = STAKEHOLDER_MAP.roles.slice(2);
  return (
    <section className={styles.mapSection} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name="scroll" size={20} />
        <span>{STAKEHOLDER_MAP.heading}</span>
      </h3>
      <ul className={styles.map} aria-label={STAKEHOLDER_MAP.label}>
        {above.map((role) => (
          <MapRole key={role.key} role={role} />
        ))}
        <li className={styles.mapCenter}>
          <HintIcon name="seed" size={24} />
          <span>{STAKEHOLDER_MAP.center}</span>
        </li>
        {below.map((role) => (
          <MapRole key={role.key} role={role} />
        ))}
      </ul>
    </section>
  );
}

/** One role on the map: its picture, the English word, the Thai question, who it is in the example. */
function MapRole({ role }: { role: (typeof STAKEHOLDER_MAP.roles)[number] }) {
  return (
    <li className={styles.mapRole} data-first={role.first ? "true" : undefined}>
      <HintIcon name={role.icon} size={32} />
      <span className={styles.mapTerm} lang="en">
        {role.term}
      </span>
      <span className={styles.mapQuestion}>{role.role}</span>
      <span className={styles.mapWho}>{role.who}</span>
      {role.first ? <span className={styles.mapFirst}>{STAKEHOLDER_MAP.first}</span> : null}
    </li>
  );
}

/** ทำยังไง: a skill quest's steps, numbered, each with its own picture. */
export function Steps({ steps }: { steps: readonly QuestStep[] }) {
  const headingId = useId();
  if (steps.length === 0) return null;
  return (
    <section className={styles.steps} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name="signpost" size={20} />
        <span>{QUEST_GUIDE_COPY.steps}</span>
      </h3>
      <ol className={styles.stepList}>
        {steps.map((step, i) => (
          <li key={step.text} className={styles.step}>
            <span className={styles.stepArt} aria-hidden="true">
              <HintIcon name={step.icon} size={32} />
              <span className={styles.stepNumber}>{i + 1}</span>
            </span>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * คำศัพท์: the English words the quest uses, kept in English (the words
 * students will meet again), each one tap from its Thai meaning.
 */
export function Terms({ terms }: { terms: readonly QuestTerm[] }) {
  const headingId = useId();
  if (terms.length === 0) return null;
  return (
    <section className={styles.terms} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name="book" size={20} />
        <span>{QUEST_GUIDE_COPY.terms}</span>
        <span className={styles.termsNote}>{QUEST_GUIDE_COPY.termsNote}</span>
      </h3>
      <ul className={styles.termList}>
        {terms.map((t) => (
          <li key={t.term}>
            <details className={styles.term}>
              <summary className={styles.termSummary}>
                <span className={styles.termWord} lang="en">
                  {t.term}
                </span>
                <span className={styles.termThai}>{t.thai}</span>
              </summary>
              <p className={styles.termMeaning}>{t.meaning}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- pitfalls

/**
 * หลุมพราง: each pitfall as a card. Its own picture and name first, then two
 * rows that look different on purpose: the warning sign to check alone (an
 * eye, coral) and how to avoid it (a signpost, leaf).
 */
export function Pitfalls({ pitfalls }: { pitfalls: readonly QuestPitfall[] }) {
  const headingId = useId();
  if (pitfalls.length === 0) return null;
  return (
    <section className={styles.pitfalls} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name={PITFALL_ICONS.heading} size={20} />
        <span>{PITFALL.heading}</span>
      </h3>
      {pitfalls.map((pitfall) => (
        <article key={pitfall.name} className={styles.pitfall}>
          <div className={styles.pitfallTop}>
            <span className={styles.pitfallArt} aria-hidden="true">
              <HintIcon name={pitfall.icon} size={36} />
            </span>
            <h4 className={styles.pitfallName}>{pitfall.name}</h4>
          </div>
          <div className={styles.pitfallRow} data-tone="sign">
            <HintIcon name={PITFALL_ICONS.sign} size={20} />
            <p>
              <span className={styles.pitfallLabel}>{PITFALL.sign}</span>
              <span className={styles.pitfallText}>{pitfall.sign}</span>
            </p>
          </div>
          <div className={styles.pitfallRow} data-tone="avoid">
            <HintIcon name={PITFALL_ICONS.avoid} size={20} />
            <p>
              <span className={styles.pitfallLabel}>{PITFALL.avoid}</span>
              <span className={styles.pitfallText}>{pitfall.avoid}</span>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- examples

/** ตัวอย่างที่ผ่าน, open: each line with its route's icon (or a bulb), the route name as a small tag. */
export function Examples({ lines }: { lines: readonly string[] }) {
  const headingId = useId();
  const items = lines.map((line) => line.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <section className={styles.examples} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name="bulb" size={20} />
        <span>{QUEST.examples}</span>
      </h3>
      <ul className={styles.exampleList}>
        {items.map((line, i) => {
          const art = exampleArt(line);
          return (
            <li key={i} className={styles.example}>
              <HintIcon name={art.icon} size={20} />
              <span>
                {art.route ? <span className={styles.exampleRoute}>{art.route}</span> : null}
                {art.text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- helpers

/**
 * ตัวช่วย: the side quests that branch off this main quest, each one tap away,
 * and on the first act the safety line about meeting people.
 */
export function Helpers({
  board,
  quest,
  onOpenQuest,
}: {
  board: QuestBoard;
  quest: QuestView;
  onOpenQuest?: (ref: BoardRef) => void;
}) {
  const headingId = useId();
  const milestone = quest.ref.kind === "main" ? quest.ref.milestone : null;
  const branches =
    milestone != null && onOpenQuest ? board.side.filter((s) => s.branch_of === milestone) : [];
  const safety = inFirstAct(board, quest);
  if (branches.length === 0 && !safety) return null;
  return (
    <section className={styles.helpers} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionLabel}>
        <HintIcon name="sos" size={20} />
        <span>{HELPERS.heading}</span>
      </h3>
      {branches.length > 0 ? (
        <ul className={styles.helperList}>
          {branches.map((s) => (
            <li key={s.template_id}>
              <button
                type="button"
                className={styles.helperRow}
                onClick={() => onOpenQuest?.({ kind: "side", templateId: s.template_id })}
              >
                <span className={styles.helperIcon} aria-hidden="true">
                  <HintIcon name={sideIcon(s.icon)} size={24} />
                </span>
                <span className={styles.helperTitle}>{s.title}</span>
                {s.approved ? (
                  <span className={styles.helperState} data-state="done">
                    {HELPERS.done}
                  </span>
                ) : s.locked ? (
                  <span className={styles.helperState}>{HELPERS.locked}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {safety ? (
        <p className={styles.safetyLine}>
          <HintIcon name={HELPER_ICONS.safety} size={20} />
          <span>{HELPERS.safety}</span>
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- who checks

/**
 * WHO CHECKS (placeholder): today every quest is checked by a mentor. Kept as
 * its own small line because a peer check vs mentor check is still being
 * decided and will come as a separate change; that change replaces this
 * line's words, not the layout.
 */
export function WhoChecks({ peer = false }: { peer?: boolean }) {
  return (
    <p className={styles.whoChecks} data-slot="who-checks">
      <HintIcon name={peer ? "peers" : HELPER_ICONS.whoChecks} size={16} />
      <span className={styles.whoChecksLabel}>{WHO_CHECKS.label}</span>
      {/* Schema 15: peers give feedback, a mentor decides (and only a mentor grows the tree). */}
      <span>{peer ? WHO_CHECKS.peer : WHO_CHECKS.mentor}</span>
    </p>
  );
}
