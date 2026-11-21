import type { CSSProperties } from "react";

import { ELEMENT_COLOURS } from "@/bot/assets/elemental/sprites";
import { ELEMENT_LABELS, type ElementKey } from "@/lib/elemental/core/elements";
import { ELEMENTAL_EVENT_EDITION, type ElementalPublicIsland } from "@/lib/supabase/elemental";

import { ISLAND_COPY } from "./copy";
import styles from "./island.module.css";
import { PICTURE_SIZE, elementLevels, pictureVersion, plotLabel } from "./model";
import { ScreenRefresh } from "./ScreenRefresh";

/**
 * The read-only island: the picture, five element level bars and the plot
 * legend (plot number, project, element). A server component; only the
 * screen-mode refresher runs in the browser.
 *
 * `island` null means the island cannot be read right now. An island with no
 * plots is the plaza alone. Nothing here names a person: plots carry a
 * project name, an element and counts only.
 */
export interface ElementalIslandViewProps {
  island: ElementalPublicIsland | null;
  /** ?screen=1: the shared-screen layout, refreshed every 60 s. */
  screen?: boolean;
  /** Path of the PNG route. */
  pngPath?: string;
}

type ElementStyle = CSSProperties & { "--el": string };

function elementStyle(element: ElementKey): ElementStyle {
  return { "--el": ELEMENT_COLOURS[element].cloth };
}

function pngUrl(pngPath: string, island: ElementalPublicIsland, layout: "landscape" | "portrait"): string {
  const params = new URLSearchParams({ layout, v: pictureVersion(island.plots, island.health) });
  if (island.edition !== ELEMENTAL_EVENT_EDITION) params.set("edition", island.edition);
  return `${pngPath}?${params.toString()}`;
}

function IslandPicture({ island, screen, pngPath }: { island: ElementalPublicIsland; screen: boolean; pngPath: string }) {
  const landscape = pngUrl(pngPath, island, "landscape");
  const portrait = pngUrl(pngPath, island, "portrait");
  const alt = island.plots.length > 0 ? ISLAND_COPY.pictureAlt(island.plots.length) : ISLAND_COPY.plazaAlt;
  const size = screen ? PICTURE_SIZE.landscape : PICTURE_SIZE.portrait;
  return (
    <figure className={styles.figure}>
      <picture className={styles.picture} data-testid="island-picture">
        {screen ? null : <source media="(min-width: 768px)" srcSet={landscape} width={PICTURE_SIZE.landscape.width} height={PICTURE_SIZE.landscape.height} />}
        {/* A plain img: a pixel PNG drawn per request, upscaled nearest-neighbour, never resized. */}
        <img src={screen ? landscape : portrait} alt={alt} width={size.width} height={size.height} decoding="async" />
      </picture>
      {screen ? null : (
        <a className={styles.openLink} href={landscape} target="_blank" rel="noopener">
          {ISLAND_COPY.openPicture}
        </a>
      )}
    </figure>
  );
}

function LevelBars({ island }: { island: ElementalPublicIsland }) {
  return (
    <section aria-labelledby="island-levels">
      <h2 id="island-levels" className={styles.sectionTitle}>
        {ISLAND_COPY.levelsHeading}
      </h2>
      <ul className={styles.levels}>
        {elementLevels(island.plots).map((row) => (
          <li key={row.element} className={styles.level} style={elementStyle(row.element)} data-element={row.element}>
            <span className={styles.levelName}>
              {ELEMENT_LABELS[row.element].th} <span lang="en">{ELEMENT_LABELS[row.element].en}</span>
            </span>
            <span className={styles.levelLine}>{ISLAND_COPY.levelLine(row.level, row.teams)}</span>
            <div
              className={styles.bar}
              role="meter"
              aria-label={ELEMENT_LABELS[row.element].th}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(row.fill * 100)}
            >
              <div className={styles.barFill} style={{ width: `${(row.fill * 100).toFixed(1)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Legend({ island }: { island: ElementalPublicIsland }) {
  return (
    <section aria-labelledby="island-legend">
      <h2 id="island-legend" className={styles.sectionTitle}>
        {ISLAND_COPY.legendHeading}
      </h2>
      {island.plots.length === 0 ? (
        <p className={styles.empty}>{ISLAND_COPY.legendEmpty}</p>
      ) : (
        <>
          <div className={styles.legendHead} aria-hidden="true">
            <span>{ISLAND_COPY.legendPlot}</span>
            <span>{ISLAND_COPY.legendProject}</span>
            <span>{ISLAND_COPY.legendElement}</span>
          </div>
          <ol className={styles.legend} data-testid="island-legend">
            {island.plots.map((p) => (
              <li key={p.slot} className={styles.legendRow} style={elementStyle(p.element)} data-slot={p.slot}>
                <span className={styles.plotNo}>{plotLabel(p.slot)}</span>
                <span className={styles.project}>{p.projectName}</span>
                <span className={styles.element}>
                  <span className={styles.swatch} aria-hidden="true" />
                  {ELEMENT_LABELS[p.element].th}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export function ElementalIslandView({ island, screen = false, pngPath = "/hackathon/island/png" }: ElementalIslandViewProps) {
  return (
    <main className={`${styles.page}${screen ? ` ${styles.screen}` : ""}`}>
      {screen ? <ScreenRefresh seconds={60} /> : null}
      <div className={styles.inner}>
        {screen ? null : (
          <header className={styles.header}>
            <h1>{ISLAND_COPY.title}</h1>
            <p>{ISLAND_COPY.lede}</p>
          </header>
        )}
        {island ? (
          <>
            <IslandPicture island={island} screen={screen} pngPath={pngPath} />
            <div className={styles.columns}>
              <LevelBars island={island} />
              <Legend island={island} />
            </div>
            {screen ? <span className={styles.screenNote}>{ISLAND_COPY.screenNote}</span> : null}
          </>
        ) : (
          <p className={styles.unavailable} role="status">
            {ISLAND_COPY.unavailable}
          </p>
        )}
      </div>
    </main>
  );
}
