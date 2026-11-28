/**
 * Where paid Elemental participants go next: the event's LINE group and
 * Discord server. The invite links live in env vars, not in this public repo,
 * and are shown only on a paid person's own page. Both are group spaces,
 * never 1:1 channels (AGENTS.md safeguarding).
 */

const ALLOWED_HOSTS: Record<"line" | "discord", string[]> = {
  line: ["line.me"],
  discord: ["discord.gg", "discord.com"],
};

function safeUrl(raw: string | undefined, kind: "line" | "discord"): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || !ALLOWED_HOSTS[kind].includes(url.hostname)) return null;
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function elementalCommunityLinks(env: NodeJS.ProcessEnv = process.env): {
  line: string | null;
  discord: string | null;
} {
  return {
    line: safeUrl(env.ELEMENTAL_LINE_GROUP_URL, "line"),
    discord: safeUrl(env.ELEMENTAL_DISCORD_URL, "discord"),
  };
}

/**
 * The find-a-team LINE OpenChat (Big, 2026-11-26). Unlike the links above it
 * shows before paying, to people who still need teammates, so they can find a
 * team from their own school or another one. It is a group space too, and is
 * kept out of the public repo the same way.
 */
export function elementalTeamUpUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return safeUrl(env.ELEMENTAL_TEAMUP_OPENCHAT_URL, "line");
}

/**
 * Whether a sign-up still needs teammates to reach the smallest team: it came
 * alone, or it started or joined a team that is still too small.
 */
export function needsTeammates(
  reg: { memberCount: number; team: { roster: unknown[] } | null },
  teamMin: number,
): boolean {
  return (reg.team ? reg.team.roster.length : reg.memberCount) < teamMin;
}
