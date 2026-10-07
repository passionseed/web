/** OAuth join failures can still be recovered through an invite and bot role sync. */
export function isDiscordOAuthJoinError(error: string | null): boolean {
  const body = error?.match(/^Discord (?:400|401|403): ([\s\S]*)$/)?.[1];
  if (!body) return false;

  try {
    const { code } = JSON.parse(body) as { code?: unknown };
    return code === 50025 || code === 50026;
  } catch {
    return false;
  }
}
