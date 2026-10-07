import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";

import { ShiftJoinView, type ShiftJoinState } from "@/components/shift/join/ShiftJoinView";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";
import { isShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import { findShiftApplicationByToken } from "@/lib/shift/join";
import { isShiftJoinToken } from "@/lib/shift/joinLink";
import { createClient } from "@/utils/supabase/server";
import type { ShiftApplicationRow } from "@/types/shift";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เข้า Discord SHIFT | PassionSeed",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}

async function currentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user && !isAnonymousUser(data.user) ? data.user : null;
}

function connectError(raw: string | undefined) {
  return raw === "no_discord" || raw === "taken" || isShiftDiscordAuthError(raw) ? raw : null;
}

function resolveState(app: ShiftApplicationRow, user: User | null, error?: string): ShiftJoinState {
  const who = { nickname: app.nickname, cohortName: app.cohort };
  const isStudent = Boolean(user && app.user_id === user.id);

  if (!isStudent || isShiftDiscordAuthError(error)) {
    return {
      kind: "connect",
      ...who,
      error: connectError(error),
    };
  }

  const { server, invite } = shiftDiscordUrls();
  if (app.discord_joined_at && !app.discord_error) {
    return { kind: "in_server", ...who, serverUrl: server };
  }
  return { kind: "needs_invite", ...who, inviteUrl: invite };
}

async function stateFor(app: ShiftApplicationRow | null, error?: string): Promise<ShiftJoinState> {
  if (!app) return { kind: "invalid" };
  // Unpaid links are valid, just not active yet: the applicant gets theirs
  // in the payment message before the slip is checked.
  if (!app.paid_at) return { kind: "pending", nickname: app.nickname, cohortName: app.cohort };
  return resolveState(app, await currentUser(), error);
}

export default async function ShiftJoinPage({ params, searchParams }: PageProps) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);

  const app = isShiftJoinToken(token) ? await findShiftApplicationByToken(token) : null;
  const state = await stateFor(app, error);

  return <ShiftJoinView token={token} state={state} />;
}
