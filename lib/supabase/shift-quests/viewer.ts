import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { QuestDbError, QuestError, type QuestApi, type Session } from "@/bot/src/quests/api";
import { fetchShiftGuildMember } from "@/lib/shift/discordGuild";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { createClient } from "@/utils/supabase/server";

import { ensureSchema, questApi } from "./db";
import { isEligible, isStaff } from "./eligibility";
import { accountLabel, discordActor, type DiscordActor } from "./identity";
import type { IslandViewer, ViewerCard } from "./types";

type Unavailable = Extract<IslandViewer, { state: "unavailable" }>;

async function signedInUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || isAnonymousUser(data.user)) return null;
    return data.user;
  } catch {
    // An auth outage renders the signed-out card, never a crash.
    return null;
  }
}

function unavailableReason(error: unknown): Unavailable["reason"] {
  const message = error instanceof Error ? error.message : "";
  if (message === "shift_quest_db_not_configured") return "not_configured";
  if (message === "shift_quest_schema_outdated") return "schema_outdated";
  return "db_error";
}

function logLabel(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `${error.fn} SQLSTATE ${error.sqlstate}`;
  return error instanceof Error ? error.name : "unknown";
}

/** Guards against a database that answers with a partial session. */
function normalizeSession(raw: Session | null | undefined): Session | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    onboarded: raw.onboarded === true,
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    unread: Number(raw.unread) || 0,
    settings: {
      ...raw.settings,
      student_role_ids: Array.isArray(raw.settings?.student_role_ids) ? raw.settings.student_role_ids : [],
    },
  };
}

async function eligibleViewer(discord: DiscordActor, session: Session, userId: string): Promise<IslandViewer> {
  const me: ViewerCard = { name: discord.name, avatarUrl: discord.avatarUrl, staff: isStaff(session.roles) };
  const ready = (card: ViewerCard): IslandViewer =>
    session.onboarded
      ? { state: "ready", me: card, actor: discord.actor, userId, session }
      : { state: "not_started", me: card, actor: discord.actor, userId };

  const studentRoleIds = session.settings.student_role_ids;
  // A closed pilot keeps students out without asking Discord; staff still go on.
  if (!me.staff && studentRoleIds.length === 0) return { state: "not_eligible", me, reason: "pilot_closed" };

  // Everyone, staff included, must still be in the SHIFT server: the bot only
  // answers inside the guild, so someone kicked or banned from Discord loses
  // the website too (a quest DB staff role left behind does not count).
  const member = await fetchShiftGuildMember(discord.actor);
  if (!member.ok) {
    if (member.reason === "not_member") return { state: "not_eligible", me, reason: "not_in_guild" };
    // Fail closed: no answer from Discord is no access.
    console.error(`[shift-island] Discord member lookup failed: ${member.reason}`);
    return { state: "not_eligible", me, reason: "discord_unavailable" };
  }

  const card: ViewerCard = { ...me, name: member.nick ?? me.name };
  // Staff are exempt from the student-role and pilot checks only, as in the bot.
  if (me.staff) return ready(card);
  if (!isEligible({ sessionRoles: session.roles, studentRoleIds, memberRoleIds: member.roles })) {
    return { state: "not_eligible", me: card, reason: "no_role" };
  }
  return ready(card);
}

async function resolve(): Promise<IslandViewer> {
  const user = await signedInUser();
  if (!user) return { state: "signed_out" };

  const discord = discordActor(user);
  if (!discord) return { state: "no_discord", accountLabel: accountLabel(user) };

  let api: QuestApi;
  try {
    api = questApi();
    await ensureSchema();
  } catch (error) {
    const reason = unavailableReason(error);
    if (reason === "db_error") console.error(`[shift-island] quest database check failed: ${logLabel(error)}`);
    return { state: "unavailable", reason };
  }

  let session: Session | null;
  try {
    // A NULL display name: reading the page writes nothing.
    session = normalizeSession(await api.call<Session>("shift_quest_session", discord.actor, null));
  } catch (error) {
    console.error(`[shift-island] session lookup failed: ${logLabel(error)}`);
    return { state: "unavailable", reason: "db_error" };
  }
  if (!session) return { state: "unavailable", reason: "db_error" };

  // The Supabase user id from getUser(): whiteboard reads (lib/supabase/shift-quests/canvas.ts) key on it.
  return eligibleViewer(discord, session, user.id);
}

/**
 * Who is looking at /shift/island, resolved once per request (React cache).
 * The page, every server action and the picture route each call it: the
 * client never sends who it is. Never throws; every failure maps to a state.
 * Only the "not_started" and "ready" states carry the actor (the Discord id)
 * and the Supabase user id, which must stay on the server.
 */
export const resolveIslandViewer = cache(async (): Promise<IslandViewer> => {
  try {
    return await resolve();
  } catch (error) {
    console.error(`[shift-island] viewer failed: ${logLabel(error)}`);
    return { state: "unavailable", reason: "db_error" };
  }
});
