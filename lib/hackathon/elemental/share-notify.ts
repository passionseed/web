import { after } from "next/server";

import { linkSource, type ShareKind } from "./share";
import { GOALS } from "./share-rules";
import { postHackathonWebhook } from "./notify-discord";

/**
 * Pings the team's Discord when a school's free seat needs a staff check:
 * a link qualified first at its school, or its owner named who gets the seat.
 * Codes and the school only: no names (most students are minors).
 * Only on the live site (VERCEL_ENV=production), so previews and local runs
 * never post. Best effort, after the response.
 */

export type ShareSeatNotice = {
  event: "qualified" | "named";
  kind: ShareKind;
  code: string;
  school: string;
  devices: number;
  paid: number;
  /** "named": the code that gets the seat. */
  recipientCode?: string;
};

const COLOR = 0xec6424;

function adminUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://passionseed.org").replace(/\/+$/, "");
  return `${base}/admin/hackathon/registrations`;
}

export function buildShareSeatPayload(n: ShareSeatNotice) {
  const who = n.kind === "teacher" ? "Teacher link" : "Student link";
  const title =
    n.event === "qualified"
      ? `${who} qualified first at ${n.school}`
      : `Free seat at ${n.school}: ${n.kind === "teacher" ? "the teacher" : "the student"} named code ${n.recipientCode?.toUpperCase()}`;
  return {
    embeds: [
      {
        title,
        color: COLOR,
        description: [
          `${linkSource(n.kind, n.code)} · ${n.devices}/${GOALS.devices} devices · ${n.paid}/${GOALS.paid} paid`,
          n.event === "qualified" ? "Check it, then Confirm or Reject." : "Ready to confirm.",
          adminUrl(),
        ].join("\n"),
      },
    ],
  };
}

export function shareNotifyLive(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

/** Queue the ping to run after the response. Never throws. */
export function notifyShareSeat(n: ShareSeatNotice): void {
  if (!shareNotifyLive()) return;
  const send = () => postHackathonWebhook(buildShareSeatPayload(n)).catch(() => undefined);
  try {
    after(send);
  } catch {
    void send();
  }
}
