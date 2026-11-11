"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { initialOf } from "../Avatar";
import { PLAYER } from "./copy";
import styles from "./player.module.css";

/** The avatar is drawn at 16x16 native pixels, like the island's own sprites. */
const NATIVE = 16;

interface PixelAvatarProps {
  name: string;
  /** The viewer's own Discord avatar, checked on the server (avatar.ts); null draws the initial. */
  url: string | null;
  /** CSS px, a multiple of 8. */
  size: number;
  /** Next to the name already (or a plot marker): hidden from screen readers. */
  decorative?: boolean;
  /** Fill the parent box instead of `size` (the plot marker sizes itself to the island's pin). */
  fill?: boolean;
  className?: string;
}

/**
 * The student's Discord picture as an island sprite: drawn into a 16x16
 * canvas and shown at `size` with nearest-neighbour scaling, in the island's
 * notched frame. The image loads without a referrer and without CORS; the
 * canvas is only drawn into, never read back, so a tainted canvas does not
 * matter. Until the picture has drawn (and whenever it cannot: no URL, a
 * failed load, no 2D canvas) the first letter of the name stands in.
 */
export function PixelAvatar({ name, url, size, decorative = false, fill = false, className }: PixelAvatarProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  /** The URL that has drawn; a new URL shows the initial until it draws too. */
  const [drawn, setDrawn] = useState<string | null>(null);
  const ready = url != null && drawn === url;

  useEffect(() => {
    if (!url) return;
    const element = canvas.current;
    const context = typeof element?.getContext === "function" ? element.getContext("2d") : null;
    // No 2D canvas (jsdom, a locked-down browser): the initial stays.
    if (!element || !context) return;
    let live = true;
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.onload = () => {
      if (!live) return;
      context.clearRect(0, 0, NATIVE, NATIVE);
      // Smoothing on for the downscale, so each of the 16x16 pixels is the average under it.
      context.imageSmoothingEnabled = true;
      context.drawImage(image, 0, 0, NATIVE, NATIVE);
      setDrawn(url);
    };
    image.onerror = () => {
      if (live) setDrawn(null);
    };
    image.src = url;
    return () => {
      live = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  const style: CSSProperties | undefined = fill
    ? { fontSize: Math.max(8, Math.round(size * 0.45)) }
    : { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.45)) };
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": PLAYER.avatar(name) };

  return (
    <span
      className={`${styles.pixelAvatar}${className ? ` ${className}` : ""}`}
      data-fill={fill ? "true" : undefined}
      data-ready={ready ? "true" : undefined}
      style={style}
      {...a11y}
    >
      {url ? <canvas ref={canvas} width={NATIVE} height={NATIVE} className={styles.pixelCanvas} aria-hidden="true" /> : null}
      {ready ? null : (
        <span className={styles.pixelInitial} aria-hidden="true">
          {initialOf(name)}
        </span>
      )}
    </span>
  );
}
