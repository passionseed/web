import "server-only";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";
import { readMyRoots, readRoots, withRoots, type RootsBySlot } from "@/bot/src/quests/island/roots";
import { readMyTree, readStyles, withStyles, type StylesBySlot } from "@/bot/src/quests/island/tree";
import type { CanvasLinkState } from "@/lib/shift-island/quest-canvas";

import { campfireOf } from "./campfire";
import { linkedCanvasAvailable } from "./canvas";
import { characterOf } from "./character";
import { consentOf } from "./consent";
import { questApi } from "./db";
import { suggestUrlOf } from "./links";
import { newsOf } from "./news";
import type {
  CampfireNames,
  IslandMapData,
  IslandMapPlot,
  IslandPageData,
  IslandView,
  MyTree,
  ProjectInvite,
  ProjectRoute,
  QuestBoard,
  ReadyViewer,
} from "./types";
import { schemaOf } from "@/bot/src/quests/schema";
import { PEER_SCHEMA } from "@/lib/shift-island/peer";
import { PHOTO_SCHEMA } from "@/lib/shift-island/photos";

/** One row of shift_quest_project_list. */
interface ProjectListRow {
  id: string;
  name: string;
  route: ProjectRoute;
  status: string;
  is_current: boolean;
  inviter: string | null;
}

const list = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

/** The log prefix of a failed roots read (logged once per cause). */
const ROOTS_LOG = "[shift-island]";

function normalizeIsland(raw: IslandView | null | undefined): IslandView {
  const project = raw?.project ?? null;
  return {
    project: project
      ? {
          ...project,
          milestones_done: list(project.milestones_done),
          show_name: project.show_name === true,
          name_visible: project.name_visible === true,
        }
      : null,
    milestones: list(raw?.milestones),
    taps_today: Number(raw?.taps_today) || 0,
    resting: raw?.resting === true,
    season: raw?.season ? { ...raw.season, unlocks: list(raw.season.unlocks), goal: raw.season.goal ?? null } : null,
  };
}

function normalizePlot(plot: Partial<IslandMapPlot> & Pick<IslandMapPlot, "slot" | "stage">): IslandMapPlot {
  return {
    slot: plot.slot,
    stage: plot.stage,
    visitor: plot.visitor === true,
    key: plot.key === true,
    helper: plot.helper === true,
    lantern: plot.lantern === true,
    name: plot.name ?? null,
    mine: plot.mine === true,
    plain: plot.plain === true,
  };
}

/** The map with every field checked and, from schema 10, each shown tree's roots merged by slot (none on a plain plot). */
function normalizeMap(
  raw: IslandMapData | null | undefined,
  roots: RootsBySlot = new Map(),
  myRoots: number | null = null,
  styles: StylesBySlot = new Map(),
  myTree: MyTree | null = null
): IslandMapData {
  return {
    plots: withStyles(withRoots(list(raw?.plots).map(normalizePlot), roots, myRoots), styles, myTree),
    goal: raw?.goal ?? null,
    season: raw?.season ?? null,
  };
}

function normalizeBoard(raw: QuestBoard | null | undefined): QuestBoard {
  return {
    project: raw?.project ? { ...raw.project, milestones_done: list(raw.project.milestones_done) } : null,
    main: list(raw?.main),
    side: list(raw?.side).map((s) => ({
      ...s,
      requires_milestones: list(s.requires_milestones),
      requires_slugs: list(s.requires_slugs),
      missing_milestones: list(s.missing_milestones),
      missing_slugs: list(s.missing_slugs),
    })),
    proposed: list(raw?.proposed),
    help_open: list(raw?.help_open),
  };
}

function toInvite(row: ProjectListRow): ProjectInvite {
  return { projectId: row.id, name: row.name, route: row.route, inviter: row.inviter ?? null };
}

/** shift_quest_canvas_get: null, or the link of the caller's current project. */
interface CanvasLinkRow {
  board_id: string;
  frame_id: string;
  canvas_project: string;
  linked_at: string;
}

const UNLINKED: CanvasLinkState = { linked: false };

/**
 * Whether the quest project is linked to an available SHIFT canvas. Only the time leaves
 * the server (never the board or frame id: the island opens the canvas through
 * CANVAS_ROUTE, which resolves the link on the server). Any failure reads as
 * unlinked and logs a code: the island never breaks because of the link.
 */
async function canvasLinkOf(api: QuestApi, actor: string, userId: string): Promise<CanvasLinkState> {
  try {
    const row = await api.call<CanvasLinkRow | null>("shift_quest_canvas_get", actor);
    if (!row || typeof row !== "object" || typeof row.linked_at !== "string") return UNLINKED;
    if (!(await linkedCanvasAvailable(userId, row))) return UNLINKED;
    return { linked: true, linkedAt: row.linked_at };
  } catch (error) {
    const code =
      error instanceof QuestError
        ? `sq:${error.code}`
        : error instanceof QuestDbError
          ? `SQLSTATE ${error.sqlstate}`
          : error instanceof Error
            ? error.name
            : "unknown";
    console.error(`[shift-island] canvas link read failed: ${code}`);
    return UNLINKED;
  }
}

/**
 * Everything /shift/island shows for a ready student: the island, the picture
 * data, and either the quest board and the canvas link (with a project) or
 * pending invites (without one), plus the voice campfire's count and the
 * suggestions link in both cases. Throws QuestError / QuestDbError from the
 * calls, except the canvas link, which falls back to unlinked, and the
 * campfire and the suggestions link, which fall back to null (no campfire
 * drawn, no link in the menu), the character sheet, consent and island
 * news, which fall back to null too (no stats or coin pill, nothing gated,
 * no news), and public roots (schema 10), which fall back to none. Own roots (schema 11)
 * override only the member plot, falling back to its outsider value.
 */
export async function getIslandPage(viewer: ReadyViewer): Promise<IslandPageData> {
  const api = questApi();
  const [islandRaw, mapRaw, suggestUrl, character, consent, news, roots, styles] = await Promise.all([
    api.call<IslandView>("shift_quest_island", viewer.actor),
    api.call<IslandMapData>("shift_quest_island_map", viewer.actor),
    suggestUrlOf(api, viewer.actor),
    // The player round's reads (schema 9) fail soft to null: the island works without them.
    soft(characterOf(api, viewer.actor)),
    soft(consentOf(api, { actor: viewer.actor, userId: viewer.userId })),
    soft(newsOf(api, viewer.actor)),
    // Schema 10: the shown trees' roots. Never throws: no roots on failure, logged once.
    readRoots(api, ROOTS_LOG),
    // Schema 13: the shown trees' colours. Never throws: default trees on failure, logged once.
    readStyles(api, ROOTS_LOG),
  ]);
  const island = normalizeIsland(islandRaw);
  // Schema 14: photo evidence and the problem line's เปลี่ยน; schema 15: the peer check. A failed read means no.
  const schema = await schemaOf(api).catch(() => 0);
  const photos = schema >= PHOTO_SCHEMA;
  const peer = schema >= PEER_SCHEMA;
  // Schema 13: the caller's own tree (colours, seed, owned items). Null without a project or on any failure.
  const tree = island.project ? await soft(readMyTree(api, viewer.actor, ROOTS_LOG)) : null;

  let board: QuestBoard | null = null;
  let invites: ProjectInvite[] = [];
  let canvasLink: CanvasLinkState = UNLINKED;
  let fire: CampfireNames | null = null;
  if (island.project) {
    const [boardRaw, link, campfireRead] = await Promise.all([
      api.call<QuestBoard>("shift_quest_board", viewer.actor),
      canvasLinkOf(api, viewer.actor, viewer.userId),
      campfireOf(api, viewer.actor, false),
    ]);
    board = normalizeBoard(boardRaw);
    canvasLink = link;
    fire = campfireRead;
  } else {
    const [projectsRaw, campfireRead] = await Promise.all([
      api.call<ProjectListRow[]>("shift_quest_project_list", viewer.actor),
      campfireOf(api, viewer.actor, false),
    ]);
    invites = list(projectsRaw).filter((p) => p.status === "invited").map(toInvite);
    fire = campfireRead;
  }

  return {
    me: viewer.me,
    unread: Number(viewer.session.unread) || 0,
    island,
    map: normalizeMap(mapRaw, roots, island.project && mapRaw?.plots?.some((p) => p.mine && !p.plain)
      ? await readMyRoots(api, viewer.actor, ROOTS_LOG) : null, styles, tree),
    tree,
    board,
    invites,
    canvasLink,
    // The count and the join link only: names load on tap (loadCampfire).
    campfire: fire ? { count: fire.count, joinUrl: fire.joinUrl } : null,
    suggestUrl,
    character,
    consent,
    news,
    photos,
    peer,
  };
}

/**
 * The soft readers never throw by contract; this keeps the page loading even
 * if one ever did (logged as a class name only, never a message).
 */
function soft<T>(read: Promise<T | null>): Promise<T | null> {
  return read.catch((error: unknown) => {
    console.error(`[shift-island] soft read threw: ${error instanceof Error ? error.name : "unknown"}`);
    return null;
  });
}

/** shift_quest_island_map for the picture route, with roots as on the page. Throws QuestError / QuestDbError (roots never throw). */
export async function getIslandMap(actor: string): Promise<IslandMapData> {
  const api = questApi();
  const [map, roots, styles] = await Promise.all([
    api.call<IslandMapData>("shift_quest_island_map", actor),
    readRoots(api, ROOTS_LOG),
    readStyles(api, ROOTS_LOG),
  ]);
  const hasMine = map?.plots?.some((p) => p.mine && !p.plain);
  return normalizeMap(map, roots, hasMine ? await readMyRoots(api, actor, ROOTS_LOG) : null, styles, hasMine ? await readMyTree(api, actor, ROOTS_LOG) : null);
}
