"use client";

/**
 * The level map: every level of the run on a winding route over a pixel night
 * map. Cleared levels carry a star, the current one has the host standing on
 * it, and levels ahead look locked but stay tappable: nothing is truly locked,
 * students can jump anywhere.
 */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { GuideIndexPage, GuideState } from "@/lib/radar-guide/guide-types";
import { levelMap, type LevelNode } from "@/lib/radar-guide/story";
import { GuideNPC } from "./GuideNPC";
import { PixelIcon } from "./PixelSprite";
import { levelMapPoints, routePath } from "./story-logic";
import "./story.css";

export interface LevelMapProps {
  pages: readonly GuideIndexPage[];
  progress: GuideState;
  /** The level on screen; without it, the first level not cleared. */
  currentKey?: string | null;
  /** Tap on a level. Without it, levels render as links from `hrefFor`. */
  onJump?(key: string): void;
  hrefFor?(key: string): string;
  /** Map art, e.g. /radar/guides/<slug>/map.webp. A CSS night shows when absent or broken. */
  backgroundSrc?: string | null;
  reducedMotion?: boolean;
  className?: string;
}

const STATUS_TH: Record<LevelNode["status"], string> = {
  cleared: "ผ่านแล้ว",
  current: "ด่านปัจจุบัน",
  ahead: "ยังไม่ได้เล่น แตะเพื่อไปได้เลย",
};

export function LevelMap({ pages, progress, currentKey, onJump, hrefFor, backgroundSrc, reducedMotion = false, className }: LevelMapProps) {
  const [bgFailed, setBgFailed] = useState(false);
  const nodes = levelMap(progress, pages, currentKey ?? undefined);
  const points = levelMapPoints(nodes.length);
  const height = Math.max(240, nodes.length * 76 + 32);

  return (
    <nav className={`rgs-map ${className ?? ""}`} aria-label="แผนที่ด่าน" data-testid="level-map">
      <div className="rgs-map__board" style={{ height }}>
        <div className="rgs-map__bg" aria-hidden="true">
          {backgroundSrc && !bgFailed ? (
            <Image
              src={backgroundSrc}
              alt=""
              fill
              unoptimized
              sizes="480px"
              className="rgs-pixelated rgs-map__img"
              onError={() => setBgFailed(true)}
            />
          ) : null}
        </div>
        <svg className="rgs-map__route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={routePath(points)} />
        </svg>
        <ol className="rgs-map__list">
          {nodes.map((node, i) => {
            const p = points[i];
            const side = p.x > 50 ? "left" : "right";
            const label = `ด่าน ${node.order}: ${node.titleTh} (${STATUS_TH[node.status]})`;
            const inner = (
              <>
                <span className="rgs-map__num">{node.order}</span>
                {node.status === "cleared" ? <PixelIcon icon="star" size={16} className="rgs-map__mark" color="#ffd08a" color2="#ff8a4c" /> : null}
                {node.status === "ahead" ? <span className="rgs-map__lock" aria-hidden="true" /> : null}
              </>
            );
            return (
              <li
                key={node.key}
                className={`rgs-map__node rgs-map__node--${node.status} rgs-map__node--label-${side}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                data-status={node.status}
              >
                {onJump || !hrefFor ? (
                  <button
                    type="button"
                    className="rgs-map__btn"
                    onClick={() => onJump?.(node.key)}
                    aria-label={label}
                    aria-current={node.status === "current" ? "step" : undefined}
                    data-demo={`map-${node.key}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    className="rgs-map__btn"
                    href={hrefFor(node.key)}
                    aria-label={label}
                    aria-current={node.status === "current" ? "step" : undefined}
                    data-demo={`map-${node.key}`}
                  >
                    {inner}
                  </Link>
                )}
                <span className="rgs-map__label" aria-hidden="true">
                  {node.navLabelTh}
                  {node.hasCutscene ? <span className="rgs-map__film">▶</span> : null}
                </span>
                {node.status === "current" ? (
                  <GuideNPC cell={2} mood="idle" reducedMotion={reducedMotion} className="rgs-map__host" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
