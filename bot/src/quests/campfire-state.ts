/**
 * The campfire's decisions, kept free of discord.js so they can be tested as
 * tables: who sits at the campfire now, and which voice update is worth a
 * database write. Only the SHIFT coworking voice channel ever counts; an
 * update about any other channel never reaches the database.
 */

/** One person in a voice channel, as the gateway's voice state cache sees them. */
export interface VoiceMember {
  id: string;
  channelId: string | null;
  bot: boolean;
  /** The name the server shows (nickname, else global name, else username), or null when unknown. */
  name: string | null;
}

/**
 * The people in `channelId` right now, bots left out, sorted by Discord ID so
 * the same room always gives the same lists. `names[i]` belongs to `ids[i]`.
 */
export function campersIn(members: readonly VoiceMember[], channelId: string): { ids: string[]; names: (string | null)[] } {
  const here = members
    .filter((m) => !m.bot && m.channelId === channelId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const seen = new Set<string>();
  const ids: string[] = [];
  const names: (string | null)[] = [];
  for (const m of here) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    ids.push(m.id);
    names.push(m.name);
  }
  return { ids, names };
}

export type VoiceChange = { kind: "none" } | { kind: "join"; name: string | null } | { kind: "leave" } | { kind: "rename"; name: string | null };

/**
 * What one voice state update means for the campfire.
 *
 * - No coworking channel set, or neither side of the update is it: none.
 * - Moved into it (from nowhere or another channel): join.
 * - Moved out of it (to nowhere or another channel): leave.
 * - Stayed in it (mute, deafen, stream, camera): rename when the server now
 *   shows a different name from the one stored (`nameKnown`; undefined when
 *   the bot has no row for them yet, which a rename then writes). A name the
 *   bot cannot read right now (null) is never written over a known one.
 */
export function voiceChange(
  oldChannel: string | null,
  newChannel: string | null,
  coworking: string | null,
  nameNow: string | null,
  nameKnown: string | null | undefined
): VoiceChange {
  if (!coworking) return { kind: "none" };
  const wasIn = oldChannel === coworking;
  const isIn = newChannel === coworking;
  if (!wasIn && !isIn) return { kind: "none" };
  if (isIn && !wasIn) return { kind: "join", name: nameNow };
  if (wasIn && !isIn) return { kind: "leave" };
  if (nameKnown === undefined) return { kind: "rename", name: nameNow };
  if (nameNow !== null && nameNow !== nameKnown) return { kind: "rename", name: nameNow };
  return { kind: "none" };
}
