import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { StageSprite } from "@/components/shift/island/StageSprite";
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE, WEB_SPRITES } from "@/components/shift/island/sprites";
import { ISLAND_STAGES, SHIFT_ISLAND } from "@/lib/content/shift-island";
import {
  CAMPFIRE_ROUND,
  GUIDE_CAMPFIRE,
  GUIDE_COINS,
  GUIDE_GROWTH,
  GUIDE_HERO,
  GUIDE_ISLAND,
  GUIDE_PRIVACY,
  GUIDE_ROOTS,
  GUIDE_SECTIONS,
  GUIDE_START,
  ROOTS_RULE,
  type GuideSectionHead,
} from "@/lib/content/shift-island-guide";

import styles from "./guide.module.css";
import { Campfire, TreeWithRoots } from "./pictures";

/** Two-digit section number in the pixel font, as the island labels its plots. */
const num = (n: number) => String(n).padStart(2, "0");

function Lines({ lines }: { lines: readonly string[] }) {
  return (
    <ul className={styles.lines}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

/** One numbered card. `icon` is an island sprite grid (a 16 x 16 web icon, or the campfire's flame) beside the title. */
function Section({ head, icon, children }: { head: GuideSectionHead; icon: readonly string[]; children: ReactNode }) {
  const n = GUIDE_SECTIONS.findIndex((s) => s.id === head.id) + 1;
  const headingId = `${head.id}-heading`;
  return (
    <section id={head.id} aria-labelledby={headingId} className={`ei-card ei-card--static ${styles.section}`}>
      <div className={styles.sectionHead}>
        <span className={styles.num} aria-hidden="true">
          {num(n)}
        </span>
        <PixelIcon grid={[...icon]} palette={PALETTE} scale={2} className={styles.icon} />
        <h2 id={headingId} className={styles.sectionTitle}>
          {head.title}
          {head.badge ? <span className={styles.badge}>{head.badge}</span> : null}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function Hero() {
  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{GUIDE_HERO.eyebrow}</p>
      <h1 className={styles.heroHeading}>{GUIDE_HERO.heading}</h1>
      <p className={styles.lede}>{GUIDE_HERO.lede}</p>
      <div className={styles.treeRow} aria-hidden="true">
        {ISLAND_STAGES.slice(1).map((name, i) => (
          <StageSprite key={name} stage={i + 1} className={styles.treeRowSprite} />
        ))}
      </div>
    </header>
  );
}

export function Contents() {
  return (
    <nav aria-labelledby="guide-toc" className={styles.toc}>
      <h2 id="guide-toc" className={styles.tocLabel}>
        {GUIDE_HERO.toc}
      </h2>
      <ol className={styles.tocList}>
        {GUIDE_SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={styles.tocLink}>
              <span className={styles.tocNum} aria-hidden="true">
                {num(i + 1)}
              </span>
              {s.toc}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function IslandSection() {
  const { sample } = SHIFT_ISLAND;
  return (
    <Section head={GUIDE_ISLAND} icon={WEB_SPRITES.compass}>
      <Lines lines={GUIDE_ISLAND.lines} />
      <p className={styles.callout}>{GUIDE_ISLAND.callout}</p>
      <figure className={styles.figure}>
        <Image
          src={sample.src}
          width={sample.width}
          height={sample.height}
          alt={GUIDE_ISLAND.imageAlt}
          unoptimized
          sizes="(max-width: 680px) 100vw, 640px"
          className={styles.sample}
        />
        <figcaption className={styles.caption}>{GUIDE_ISLAND.caption}</figcaption>
      </figure>
    </Section>
  );
}

export function GrowthSection() {
  return (
    <Section head={GUIDE_GROWTH} icon={WEB_SPRITES.star}>
      <Lines lines={GUIDE_GROWTH.lines} />
      <ol className={styles.stages} aria-label={GUIDE_GROWTH.stagesLabel}>
        {ISLAND_STAGES.slice(1).map((name, i) => (
          <li key={name} className={styles.stage}>
            <StageSprite stage={i + 1} className={styles.stageSprite} />
            <span className={styles.stageNum}>{GUIDE_GROWTH.stageLabel(i + 1)}</span>
            <span className={styles.stageName}>{name}</span>
          </li>
        ))}
      </ol>
      <p className={styles.rule}>{GUIDE_GROWTH.rule}</p>
      <p className={styles.note}>
        <PixelIcon grid={WEB_SPRITES.moon} palette={PALETTE} scale={1} className={styles.noteIcon} />
        <span>{GUIDE_GROWTH.rest}</span>
      </p>
    </Section>
  );
}

export function RootsSection() {
  const levels = Array.from({ length: ROOTS_RULE.levels }, (_, i) => i + 1);
  return (
    <Section head={GUIDE_ROOTS} icon={WEB_SPRITES.note}>
      <p className={styles.callout}>{GUIDE_ROOTS.callout}</p>
      <Lines lines={GUIDE_ROOTS.lines} />
      <h3 className={styles.subTitle}>{GUIDE_ROOTS.levelsTitle}</h3>
      <ol className={styles.roots} aria-label={GUIDE_ROOTS.pictureLabel}>
        {levels.map((level) => (
          <li key={level} className={styles.root}>
            <TreeWithRoots level={level} className={styles.rootPicture} />
            <span className={styles.stageNum}>{GUIDE_ROOTS.level(level)}</span>
          </li>
        ))}
      </ol>
      <p className={styles.rule}>{GUIDE_ROOTS.rule}</p>
    </Section>
  );
}

/** The hour as the bot runs it: focus, rest, focus, rest. Widths follow the minutes. */
function Rhythm() {
  const { focusMinutes: focus, restMinutes: rest } = CAMPFIRE_ROUND;
  const blocks = [
    { kind: "focus", minutes: focus, at: ":00" },
    { kind: "rest", minutes: rest, at: `:${focus}` },
    { kind: "focus", minutes: focus, at: ":30" },
    { kind: "rest", minutes: rest, at: `:${30 + focus}` },
  ] as const;
  return (
    <figure className={styles.rhythm}>
      <figcaption className={styles.subTitle}>{GUIDE_CAMPFIRE.rhythmLabel}</figcaption>
      <div className={styles.rhythmBar} aria-hidden="true">
        {blocks.map((b) => (
          <span
            key={b.at}
            className={b.kind === "focus" ? styles.rhythmFocus : styles.rhythmRest}
            style={{ flexGrow: b.minutes }}
          >
            <span className={styles.rhythmAt}>{b.at}</span>
          </span>
        ))}
      </div>
      <ul className={styles.legend}>
        <li className={styles.legendFocus}>{GUIDE_CAMPFIRE.focus}</li>
        <li className={styles.legendRest}>{GUIDE_CAMPFIRE.rest}</li>
      </ul>
    </figure>
  );
}

export function CampfireSection() {
  return (
    <Section head={GUIDE_CAMPFIRE} icon={MOTION_SPRITES.campfire_flame_0}>
      <div className={styles.fireRow}>
        <Campfire className={styles.fire} />
        <Lines lines={GUIDE_CAMPFIRE.lines} />
      </div>
      <Rhythm />
      <ol className={styles.steps}>
        {GUIDE_CAMPFIRE.steps.map((step) => (
          <li key={step.label} className={styles.step}>
            <span className={step.button ? styles.chip : styles.chipQuiet}>{step.label}</span>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <div className={styles.aside}>
        <h3 className={styles.subTitle}>{GUIDE_CAMPFIRE.diffuseTitle}</h3>
        <Lines lines={GUIDE_CAMPFIRE.diffuse} />
      </div>
      <div className={styles.aside}>
        <h3 className={styles.subTitle}>{GUIDE_CAMPFIRE.privacyTitle}</h3>
        <Lines lines={GUIDE_CAMPFIRE.privacy} />
      </div>
    </Section>
  );
}

export function CoinsSection() {
  return (
    <Section head={GUIDE_COINS} icon={WEB_SPRITES.coin}>
      <Lines lines={GUIDE_COINS.lines} />
      <ul className={styles.steps}>
        {GUIDE_COINS.commands.map((c) => (
          <li key={c.command} className={styles.step}>
            <code className={styles.command}>{c.command}</code>
            <span>{c.body}</span>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>{GUIDE_COINS.note}</p>
    </Section>
  );
}

export function StartSection({ discordUrl }: { discordUrl: string | null }) {
  return (
    <Section head={GUIDE_START} icon={WEB_SPRITES.seed}>
      <ol className={styles.steps}>
        {GUIDE_START.steps.map((step) => (
          <li key={step.label} className={styles.step}>
            <span className={styles.chip}>{step.label}</span>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <p className={styles.or}>{GUIDE_START.or}</p>
      <div className={styles.actions}>
        <Link href="/shift/island" className={`ei-button-dawn ${styles.primary}`}>
          <span>{GUIDE_START.island}</span>
        </Link>
        {discordUrl ? (
          <a href={discordUrl} className={styles.quiet} target="_blank" rel="noopener noreferrer">
            {GUIDE_START.discord}
          </a>
        ) : null}
      </div>
    </Section>
  );
}

export function PrivacySection() {
  return (
    <Section head={GUIDE_PRIVACY} icon={WEB_SPRITES.eye}>
      <Lines lines={GUIDE_PRIVACY.lines} />
    </Section>
  );
}
