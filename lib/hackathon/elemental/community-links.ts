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
