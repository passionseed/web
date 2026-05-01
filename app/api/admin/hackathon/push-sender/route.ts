import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  return roles?.length ? user : null;
}

function initVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:hi@passionseed.org", publicKey, privateKey);
}

/** GET — list participants with push token status */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const serviceClient = getServiceClient();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim().toLowerCase();

  const { data: participants } = await serviceClient
    .from("hackathon_participants")
    .select(
      `id, name, email, track,
       hackathon_participant_push_tokens(id, platform, push_token, last_used_at),
       hackathon_team_members!hackathon_team_members_participant_id_fkey(
         hackathon_teams(name)
       )`
    )
    .order("name");

  const rows = (participants ?? []).map((p: any) => {
    const teamMember = Array.isArray(p.hackathon_team_members)
      ? p.hackathon_team_members[0]
      : p.hackathon_team_members;
    const tokens = Array.isArray(p.hackathon_participant_push_tokens)
      ? p.hackathon_participant_push_tokens
      : [];
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      track: p.track ?? "",
      team_name: teamMember?.hackathon_teams?.name ?? "",
      has_push: tokens.length > 0,
      platforms: tokens.map((t: any) => t.platform),
      tokens: tokens.map((t: any) => ({
        id: t.id,
        platform: t.platform,
        push_token: t.push_token,
        last_used_at: t.last_used_at,
      })),
    };
  });

  const filtered = search
    ? rows.filter((p) =>
        [p.name, p.email, p.team_name].join(" ").toLowerCase().includes(search)
      )
    : rows;

  return NextResponse.json({
    participants: filtered,
    counts: { total: rows.length, withPush: rows.filter((r) => r.has_push).length },
  });
}

/** POST — send push notification to selected participants */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    initVapid();
  } catch {
    return NextResponse.json({ error: "VAPID keys not configured on server" }, { status: 500 });
  }

  const { recipientIds, title, body, url } = (await req.json()) as {
    recipientIds: string[];
    title: string;
    body: string;
    url?: string;
  };

  if (!recipientIds?.length) return NextResponse.json({ error: "No recipients" }, { status: 400 });
  if (!title?.trim() || !body?.trim()) return NextResponse.json({ error: "Title and body required" }, { status: 400 });

  const serviceClient = getServiceClient();

  const { data: tokens } = await serviceClient
    .from("hackathon_participant_push_tokens")
    .select("id, participant_id, push_token, platform")
    .in("participant_id", recipientIds);

  if (!tokens?.length) return NextResponse.json({ sent: 0, failed: 0, noToken: recipientIds.length, details: [] });

  const payload = JSON.stringify({ title, body, url: url || "/" });
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  const expoTokens: { token: string; platform: string }[] = [];
  const details: { platform: string; status: "ok" | "failed"; error?: string; ticketId?: string }[] = [];

  for (const token of tokens) {
    // Expo push tokens (iOS/Android)
    if (token.push_token.startsWith("ExponentPushToken[") || token.push_token.startsWith("ExpoPushToken[")) {
      expoTokens.push({ token: token.push_token, platform: token.platform });
      continue;
    }

    // Web push subscriptions (JSON with endpoint)
    if (token.platform === "web") {
      try {
        const subscription = JSON.parse(token.push_token);
        await webpush.sendNotification(subscription, payload);
        sent++;
        details.push({ platform: "web", status: "ok" });
        await serviceClient
          .from("hackathon_participant_push_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", token.id);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(token.id);
        }
        failed++;
        details.push({ platform: "web", status: "failed", error: err?.body || err?.message || String(err) });
      }
      continue;
    }

    // Unknown format — try Expo as fallback
    expoTokens.push({ token: token.push_token, platform: token.platform });
  }

  // Send Expo push notifications
  if (expoTokens.length) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          expoTokens.map((t) => ({
            to: t.token,
            title,
            body,
            data: { url: url || "/" },
            sound: "default",
          }))
        ),
      });
      const result = await res.json();
      const tickets = result.data ?? [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const platform = expoTokens[i]?.platform ?? "unknown";
        if (ticket.status === "ok") {
          sent++;
          details.push({ platform, status: "ok", ticketId: ticket.id });
        } else {
          failed++;
          details.push({ platform, status: "failed", error: ticket.message || ticket.details?.error || "Expo rejected" });
        }
      }
    } catch (err: any) {
      failed += expoTokens.length;
      for (const t of expoTokens) {
        details.push({ platform: t.platform, status: "failed", error: err?.message || "Network error" });
      }
    }
  }

  // clean up expired subscriptions
  if (staleIds.length) {
    await serviceClient
      .from("hackathon_participant_push_tokens")
      .delete()
      .in("id", staleIds);
  }

  const noToken = recipientIds.length - new Set(tokens.map((t) => t.participant_id)).size;

  return NextResponse.json({ sent, failed, noToken, staleRemoved: staleIds.length, details });
}
