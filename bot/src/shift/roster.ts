export interface RosterEntry {
  applicationId: string;
  cohort: string;
}

/** One row of public.shift_voice_roster(): only what the bot needs. */
export interface RosterRow {
  applicationId: string;
  cohort: string;
  discordUserId: string | null;
  paid: boolean;
  createdAt: string;
}

/**
 * One application per Discord account. Someone can hold a duplicate
 * application for the same round; the paid one is the real seat, then the
 * newest.
 */
export function pickRoster(rows: RosterRow[]): Map<string, RosterEntry> {
  const better = (a: RosterRow, b: RosterRow) => (a.paid !== b.paid ? a.paid : a.createdAt > b.createdAt);
  const best = new Map<string, RosterRow>();
  for (const row of rows) {
    if (!row.discordUserId) continue;
    const current = best.get(row.discordUserId);
    if (!current || better(row, current)) best.set(row.discordUserId, row);
  }
  return new Map(
    [...best].map(([discordId, row]) => [discordId, { applicationId: row.applicationId, cohort: row.cohort }])
  );
}
