/**
 * The motion reel's timeline ("อาชีพนี้ใน 30 วินาที", spec 7.2). Pure: scene
 * order and length come from the payload, and the same numbers drive the
 * scenes' CSS delays and the cue sheet the soundtrack is scored from
 * (scripts/shift-reel-audio.py), so picture and sound cannot drift apart.
 */
import type { ReelCues } from "../../shift/poster/testimonial/reelEngine";
import type { RadarReelPayload } from "./payload";

/** Dusk City's soft synth loop runs at about 84 bpm. */
export const RADAR_REEL_BPM = 84;
export const RADAR_REEL_BEAT = 60 / RADAR_REEL_BPM;

export type RadarReelSceneId = "hook" | "reality" | "money" | "ai" | "day" | "study" | "start" | "compare" | "end";

export interface RadarReelScene {
  id: RadarReelSceneId;
  /** Seconds. */
  start: number;
  end: number;
  beats: number;
}

export interface RadarReelTimeline {
  seconds: number;
  beat: number;
  scenes: RadarReelScene[];
  cues: ReelCues;
}

/** Target length per mode, in seconds. */
export const RADAR_REEL_TARGET: Record<RadarReelPayload["mode"], [number, number]> = {
  career: [25, 35],
  page: [12, 30],
  compare: [18, 30],
};

/** When things land inside a scene, in beats from the scene start. */
export const MARKS = {
  hook: { line: 0.4, stat: 1.6, label: 2.6 },
  reality: { fantasy: 0.4, strike: 2.6, reality: 3.2 },
  money: { title: 0.3, firstRow: 1.4, rowGap: 1.5 },
  ai: { label: 0.3, score: 1.4, estimate: 2.6, firstPoint: 3.4, pointGap: 1 },
  list: { title: 0.3, firstItem: 1.2, itemGap: 1 },
  start: { title: 0.3, step: 1.2, chips: 2.4, makes: 3.4 },
  compare: { names: 0.4, firstRow: 1.8, rowGap: 2.2 },
  end: { headline: 0.4, keyword: 1.2, sub: 2.6, friend: 3.6 },
} as const;

const COMPARE_ROWS = 3;

/** Beats each scene needs for its content (before stretching to the target). */
export function sceneBeats(id: RadarReelSceneId, payload: RadarReelPayload): number {
  switch (id) {
    case "hook":
      return payload.hook.stat ? 5 : 4;
    case "reality":
      return 6;
    case "money":
      return Math.ceil(MARKS.money.firstRow + MARKS.money.rowGap * (payload.money?.rows.length ?? 1) + 1.5);
    case "ai":
      return Math.ceil(MARKS.ai.firstPoint + MARKS.ai.pointGap * (payload.ai?.points.length ?? 0) + 1.2);
    case "day":
      return Math.ceil(MARKS.list.firstItem + MARKS.list.itemGap * (payload.day?.items.length ?? 1) + 1.5);
    case "study":
      return Math.ceil(MARKS.list.firstItem + MARKS.list.itemGap * (payload.study?.items.length ?? 1) + 1.5);
    case "start":
      return 5;
    case "compare":
      return Math.ceil(MARKS.compare.firstRow + MARKS.compare.rowGap * COMPARE_ROWS + 1);
    case "end":
      return 6;
  }
}

/** Scenes in play order; a scene without data is left out. */
export function radarReelSceneIds(payload: RadarReelPayload): RadarReelSceneId[] {
  if (payload.mode === "compare") return payload.compare ? ["hook", "compare", "end"] : ["hook", "end"];
  const ids: RadarReelSceneId[] = ["hook"];
  if (payload.reality) ids.push("reality");
  if (payload.money) ids.push("money");
  if (payload.ai) ids.push("ai");
  if (payload.day) ids.push("day");
  if (payload.study) ids.push("study");
  if (payload.start) ids.push("start");
  ids.push("end");
  return ids;
}

/** Content scenes get extra beats first when a reel is too short; the hook and end card stay tight. */
const STRETCH_ORDER: RadarReelSceneId[] = ["money", "compare", "ai", "start", "reality", "day", "study", "hook", "end"];
const MIN_SCENE_BEATS = 3;

function fitToTarget(ids: RadarReelSceneId[], beats: number[], target: [number, number]): number[] {
  const out = beats.slice();
  const total = () => out.reduce((a, b) => a + b, 0) * RADAR_REEL_BEAT;
  const order = STRETCH_ORDER.filter((id) => ids.includes(id)).map((id) => ids.indexOf(id));
  let k = 0;
  while (total() < target[0] && order.length) {
    out[order[k % order.length]] += 1;
    k += 1;
  }
  while (total() > target[1]) {
    const longest = out.indexOf(Math.max(...out));
    if (out[longest] <= MIN_SCENE_BEATS) break;
    out[longest] -= 1;
  }
  return out;
}

export const at = (scene: RadarReelScene, beats: number) => scene.start + beats * RADAR_REEL_BEAT;

export function buildRadarReelTimeline(payload: RadarReelPayload): RadarReelTimeline {
  const ids = radarReelSceneIds(payload);
  const beats = fitToTarget(ids, ids.map((id) => sceneBeats(id, payload)), RADAR_REEL_TARGET[payload.mode]);
  let cursor = 0;
  const scenes: RadarReelScene[] = ids.map((id, i) => {
    const start = cursor * RADAR_REEL_BEAT;
    cursor += beats[i];
    return { id, start: round(start), end: round(cursor * RADAR_REEL_BEAT), beats: beats[i] };
  });
  const seconds = round(cursor * RADAR_REEL_BEAT);
  return { seconds, beat: RADAR_REEL_BEAT, scenes, cues: buildCues(payload, scenes, seconds) };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function sceneById(timeline: RadarReelTimeline, id: RadarReelSceneId): RadarReelScene | null {
  return timeline.scenes.find((s) => s.id === id) ?? null;
}

function buildCues(payload: RadarReelPayload, scenes: RadarReelScene[], seconds: number): ReelCues {
  const slams: number[] = [];
  const pops: number[] = [];
  let count: [number, number] | null = null;
  let coin = seconds - RADAR_REEL_BEAT;

  for (const s of scenes) {
    switch (s.id) {
      case "hook":
        slams.push(at(s, MARKS.hook.line));
        if (payload.hook.stat) {
          slams.push(at(s, MARKS.hook.stat));
          pops.push(at(s, MARKS.hook.label));
        }
        break;
      case "reality":
        pops.push(at(s, MARKS.reality.fantasy), at(s, MARKS.reality.strike));
        slams.push(at(s, MARKS.reality.reality));
        break;
      case "money":
        pops.push(at(s, MARKS.money.title));
        (payload.money?.rows ?? []).forEach((_, i) => slams.push(at(s, MARKS.money.firstRow + i * MARKS.money.rowGap)));
        break;
      case "ai":
        pops.push(at(s, MARKS.ai.label), at(s, MARKS.ai.estimate));
        if (payload.ai?.score !== null && payload.ai?.score !== undefined) {
          slams.push(at(s, MARKS.ai.score));
          count = [at(s, MARKS.ai.score - 0.8), at(s, MARKS.ai.score)];
        }
        (payload.ai?.points ?? []).forEach((_, i) => pops.push(at(s, MARKS.ai.firstPoint + i * MARKS.ai.pointGap)));
        break;
      case "day":
      case "study": {
        const items = (s.id === "day" ? payload.day : payload.study)?.items ?? [];
        pops.push(at(s, MARKS.list.title));
        items.forEach((_, i) => pops.push(at(s, MARKS.list.firstItem + i * MARKS.list.itemGap)));
        break;
      }
      case "start":
        pops.push(at(s, MARKS.start.title), at(s, MARKS.start.chips), at(s, MARKS.start.makes));
        slams.push(at(s, MARKS.start.step));
        break;
      case "compare":
        pops.push(at(s, MARKS.compare.names));
        for (let i = 0; i < COMPARE_ROWS; i++) slams.push(at(s, MARKS.compare.firstRow + i * MARKS.compare.rowGap));
        break;
      case "end":
        pops.push(at(s, MARKS.end.headline), at(s, MARKS.end.sub));
        if (payload.end.sendToFriend) pops.push(at(s, MARKS.end.friend));
        coin = at(s, MARKS.end.keyword);
        slams.push(coin);
        break;
    }
  }

  const end = scenes[scenes.length - 1];
  const sorted = (xs: number[]) => xs.filter((t) => t >= 0 && t < seconds).map(round).sort((a, b) => a - b);
  return {
    seconds,
    beat: RADAR_REEL_BEAT,
    cuts: scenes.map((s) => s.start),
    slams: sorted(slams),
    pops: sorted(pops),
    count,
    coin: round(coin),
    moods: [
      [0, "build"],
      [scenes[1]?.start ?? 0, "light"],
      [(scenes.find((s) => s.id === "money" || s.id === "compare") ?? scenes[1] ?? scenes[0]).start, "full"],
      [end.start, "offer"],
    ],
  };
}
