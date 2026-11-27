"use client";

import { useEffect, useState } from "react";

import {
  QUIZ_SCENES,
  SCENE_BACKDROPS,
  SCENE_COLS,
  SCENE_FAR_PAD,
  SCENE_FRAMES,
  SCENE_ROWS,
  pixelRuns,
  sceneFrame,
  type PixelArt,
} from "@/lib/hackathon/elemental/quiz-pixels";

import styles from "./quiz.module.css";

function Rects({ art }: { art: PixelArt }) {
  return (
    <>
      {pixelRuns(art).map(([x, y, length, color]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={length} height={1} fill={color} />
      ))}
    </>
  );
}

/**
 * On a computer, the far layer leans away from the mouse by up to 2 pixels,
 * a whole pixel at a time. Phones get the slow drift alone (quiz.module.css).
 */
function usePointerLean(): number {
  const [lean, setLean] = useState(0);
  useEffect(() => {
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLean(-Math.max(-2, Math.min(2, Math.round((e.clientX / window.innerWidth - 0.5) * 5)))));
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return lean;
}

/**
 * The little game screen above question `question`: its flat backdrop, the
 * far layer drifting behind (parallax), and the scene, playing its 8 frames
 * in turn for as long as the question is up. Sized by CSS to a whole number
 * of screen px a pixel: 4 on phones, 6 wider up, 3 on small or short screens
 * (under 800 px tall) so the answers stay in view. With motion off: the
 * still, and nothing drifts.
 */
export function QuestionScene({ question }: { question: number }) {
  const scene = QUIZ_SCENES[question];
  const lean = usePointerLean();
  return (
    <svg
      viewBox={`0 0 ${SCENE_COLS} ${SCENE_ROWS}`}
      aria-hidden="true"
      className="block h-auto w-[228px] min-[375px]:[@media(min-height:800px)]:w-[304px] sm:[@media(min-height:800px)]:w-[456px]"
    >
      <rect width={SCENE_COLS} height={SCENE_ROWS} fill={SCENE_BACKDROPS[scene.backdrop]} />
      <g className={styles.drift}>
        <g transform={`translate(${lean - SCENE_FAR_PAD} 0)`} shapeRendering="crispEdges">
          <Rects art={scene.far} />
        </g>
      </g>
      <g className={styles.still} shapeRendering="crispEdges">
        <Rects art={scene.base} />
      </g>
      {scene.frames.map((delta, n) => (
        <g
          key={n}
          shapeRendering="crispEdges"
          className={styles.fx}
          style={{
            animationDuration: `${SCENE_FRAMES * scene.frameMs}ms`,
            animationDelay: `-${((SCENE_FRAMES - n) % SCENE_FRAMES) * scene.frameMs}ms`,
            animationIterationCount: "infinite",
          }}
        >
          <Rects art={sceneFrame(scene.base, delta)} />
        </g>
      ))}
    </svg>
  );
}
