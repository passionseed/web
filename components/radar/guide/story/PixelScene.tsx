"use client";

/**
 * A level's pixel scene header: the scene art (160x100, drawn crisp with
 * image-rendering: pixelated), the level number and the level title on a
 * solid plate. If the image fails, a CSS pixel night (sky bands, stars,
 * lit-window skyline) takes its place, so the level never looks broken.
 *
 * The art is decorative: the title carries the meaning. No text is baked into
 * any scene image.
 */
import Image from "next/image";
import { useState, type ReactNode } from "react";
import "./story.css";

export interface PixelSceneProps {
  /** Scene art; default per level is levelSceneSrc(slug, key) from lib/radar-guide/story. */
  src?: string | null;
  /** 1-based level number, shown as "LV 3". */
  level?: number;
  total?: number;
  titleTh?: string;
  /** One short quest line under the title (the page question), never a paragraph. */
  questTh?: string;
  /** "header" (16:10 with title plate) or "backdrop" (fills its parent, no plate). */
  variant?: "header" | "backdrop";
  /** Heading level for the title (the level page's h1 by default). */
  as?: "h1" | "h2";
  children?: ReactNode;
  className?: string;
}

export function PixelScene({
  src,
  level,
  total,
  titleTh,
  questTh,
  variant = "header",
  as: Heading = "h1",
  children,
  className,
}: PixelSceneProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <div className={`rgs-scene rgs-scene--${variant} ${className ?? ""}`} data-testid="pixel-scene">
      <div className="rgs-scene__art" aria-hidden="true">
        {showImage ? (
          <Image
            src={src as string}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 480px) 100vw, 480px"
            priority={variant === "header"}
            draggable={false}
            className="rgs-pixelated rgs-scene__img"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="rgs-scene__fallback" data-testid="pixel-scene-fallback">
            <span className="rgs-scene__stars" />
            <span className="rgs-scene__skyline" />
          </div>
        )}
      </div>
      {children ? <div className="rgs-scene__overlay">{children}</div> : null}
      {variant === "header" && (titleTh || level) ? (
        <div className="rgs-scene__plate">
          {level ? (
            <span className="rgs-scene__lv" aria-label={total ? `ด่าน ${level} จาก ${total}` : `ด่าน ${level}`}>
              LV {level}
              {total ? <span className="rgs-scene__lvtotal">/{total}</span> : null}
            </span>
          ) : null}
          {titleTh ? <Heading className="rgs-scene__title">{titleTh}</Heading> : null}
          {questTh ? <p className="rgs-scene__quest">{questTh}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
