import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";

import { ShiftJoinView, type ShiftJoinState } from "@/components/shift/join/ShiftJoinView";
import type { ShiftJoinPayment } from "@/components/shift/join/ShiftJoinView";
import { firstMeetLabel, getShiftCohortByName } from "@/lib/content/shift-cohort";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { shiftDiscordUrls } from "@/lib/shift/discordGuild";
import { isShiftDiscordAuthError } from "@/lib/shift/discordAuth";
import { findShiftApplicationByToken, isJoinable } from "@/lib/shift/join";
import { isShiftJoinToken, shiftJoinPath } from "@/lib/shift/joinLink";
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

/**
 * The fee still owed. The pre-filled slip message echoes the parent contact,
 * so it is only built for the signed-in applicant (`forApplicant`); anyone
 * else holding the link gets the same QR and price as the public round page.
 */
function paymentFor(app: ShiftApplicationRow, token: string, forApplicant: boolean): ShiftJoinPayment | null {
  const cohort = getShiftCohortByName(app.cohort);
  if (app.paid_at || !cohort || cohort.priceBaht <= 0) return null;
  if (!forApplicant) return { cohort };
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    cohort,
    applicant: {
      nickname: app.nickname,
      fullName: app.full_name,
      igHandle: app.ig_handle,
      parentContact: app.parent_contact ?? undefined,
      joinUrl: origin ? new URL(shiftJoinPath(token), origin).toString() : null,
    },
  };
}

function resolveState(
  app: ShiftApplicationRow,
  token: string,
  user: User | null,
  error?: string,
): ShiftJoinState {
  const who = { nickname: app.nickname, cohortName: app.cohort };
  const isStudent = Boolean(user && app.user_id === user.id);

  if (!isStudent || isShiftDiscordAuthError(error)) {
    return {
      kind: "connect",
      ...who,
      paid: Boolean(app.paid_at),
      error: connectError(error),
      payment: paymentFor(app, token, isStudent),
    };
  }

  const { server, invite } = shiftDiscordUrls();
  const payment = paymentFor(app, token, true);
  if (app.discord_joined_at && !app.discord_error) {
    const cohort = getShiftCohortByName(app.cohort);
    return {
      kind: "in_server",
      ...who,
      serverUrl: server,
      meetLabel: cohort ? firstMeetLabel(cohort) : null,
      payment,
    };
  }
  return { kind: "needs_invite", ...who, inviteUrl: invite, payment };
}

async function stateFor(
  app: ShiftApplicationRow | null,
  token: string,
  error?: string,
): Promise<ShiftJoinState> {
  // Links work from the moment someone applies; declining closes them.
  if (!isJoinable(app)) return { kind: "invalid" };
  return resolveState(app, token, await currentUser(), error);
}

export default async function ShiftJoinPage({ params, searchParams }: PageProps) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);

  const app = isShiftJoinToken(token) ? await findShiftApplicationByToken(token) : null;
  const state = await stateFor(app, token, error);

  return <ShiftJoinView token={token} state={state} />;
}
