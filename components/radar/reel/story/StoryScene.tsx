/**
 * The story's backdrop: the scene full-bleed (a film photo, or pixel art crisp
 * at 4x), the phone feed scrolling, the photo's foreground drawn over the cast
 * (the dinner table), film grain over everything, and the pixel wipe between
 * scenes. All drawn from the frame number.
 */
import { scenePhoto, storySceneSrc } from "@/lib/radar-stories/scenes";
import type { Scene } from "@/lib/radar-stories/types";

import { STORY_FRAME } from "./cast";

/** The phone feed scrolls this many CSS px per frame (4 device px: crisp). */
export const FEED_SCROLL_PX = 1.6;
const WIPE_BLOCK = 48;

export function SceneArt({ scene, frame }: { scene: Scene; frame: number }) {
  const src = storySceneSrc(scene);
  if (src && scenePhoto(scene)) return <PhotoLayer src={src} scene={scene} />;
  const career = scene.startsWith("career:");
  const feed = scene === "phone-feed";
  const scroll = feed ? -((frame * FEED_SCROLL_PX) % STORY_FRAME.height) : 0;
  return (
    <div
      className="sr-pixelated absolute inset-0"
      data-scene={scene}
      style={{
        backgroundColor: "var(--sr-night)",
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: career ? "cover" : `${STORY_FRAME.width}px ${STORY_FRAME.height}px`,
        backgroundPosition: career ? "center" : `0 ${scroll}px`,
        backgroundRepeat: feed ? "repeat-y" : "no-repeat",
      }}
    />
  );
}

function PhotoLayer({ src, scene, fromY = 0 }: { src: string; scene: Scene; fromY?: number }) {
  return (
    <div
      className="absolute inset-0"
      data-scene={scene}
      data-photo={fromY ? "front" : "back"}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        clipPath: fromY ? `inset(${fromY}px 0 0 0)` : undefined,
      }}
    />
  );
}

/** The part of a photo scene that stands in front of the cast (scenes.ts occludeY), or nothing. */
export function SceneForeground({ scene }: { scene: Scene }) {
  const photo = scenePhoto(scene);
  const src = storySceneSrc(scene);
  if (!photo?.occludeY || !src) return null;
  return <PhotoLayer src={src} scene={scene} fromY={photo.occludeY} />;
}

/** The grain tile's offset at frame `f`: a different whole-device-pixel spot every frame. Pure. */
export function grainOffset(f: number): { x: number; y: number } {
  let h = (f + 1) * 2654435761;
  h = (h ^ (h >>> 13)) >>> 0;
  return { x: (h % 256) * 0.4, y: ((h >>> 8) % 256) * 0.4 };
}

/**
 * Frames each grain spot is held for: 15 grain changes a second still reads
 * as live film, and halves the noise the encoder has to keep (a new spot
 * every frame pushed the reels to 57 Mbps).
 */
export const GRAIN_HOLD = 2;

/** Film grain over the whole frame (public/radar/stories/grain.png), alive from frame to frame. */
export function FilmGrain({ frame }: { frame: number }) {
  const o = grainOffset(Math.floor(frame / GRAIN_HOLD));
  return <div className="sr-grain" aria-hidden="true" style={{ backgroundPosition: `${o.x}px ${o.y}px` }} />;
}

/** Darkens the scene under huge text so it always reads. */
export function Dim({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return <div className="absolute inset-0" style={{ backgroundColor: "var(--sr-night)", opacity: amount }} />;
}

/**
 * Blocks sweep in diagonally from the top left, then clear from the top left
 * too. `progress` is the share covered: 0 clear, 1 covered.
 */
export function PixelWipe({ progress, closing }: { progress: number; closing: boolean }) {
  if (progress <= 0) return null;
  const cols = Math.ceil(STORY_FRAME.width / WIPE_BLOCK);
  const rows = Math.ceil(STORY_FRAME.height / WIPE_BLOCK);
  const max = cols + rows - 2;
  const blocks: { x: number; y: number }[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const d = (i + j) / max;
      // `<=` so the last (bottom right) block is in when the wipe is fully closed.
      if (closing ? d <= progress : d >= 1 - progress) blocks.push({ x: i * WIPE_BLOCK, y: j * WIPE_BLOCK });
    }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {blocks.map((b) => (
        <span
          key={`${b.x}-${b.y}`}
          className="absolute block"
          style={{ left: b.x, top: b.y, width: WIPE_BLOCK, height: WIPE_BLOCK, backgroundColor: "var(--sr-ink)" }}
        />
      ))}
    </div>
  );
}
