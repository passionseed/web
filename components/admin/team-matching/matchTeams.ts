import type { SimUser, Team } from "./types";

// Split an array into chunks of max 5, but never leave a chunk smaller than 3.
// If the last chunk would be 1 or 2, steal from the previous chunk to make it 3.
function splitIntoTeams(ids: string[]): string[][] {
  if (ids.length === 0) return [];
  if (ids.length <= 5) return [ids];

  const chunks: string[][] = [];
  let i = 0;
  while (i < ids.length) {
    const remaining = ids.length - i;
    // If remaining fits in one chunk, take it all
    if (remaining <= 5) {
      chunks.push(ids.slice(i));
      break;
    }
    // If taking 5 would leave 1 or 2, take 3 now so next chunk also gets 3+
    if (remaining === 6) {
      chunks.push(ids.slice(i, i + 3));
      chunks.push(ids.slice(i + 3));
      break;
    }
    chunks.push(ids.slice(i, i + 5));
    i += 5;
  }
  return chunks;
}

function makeUnionFind(ids: string[]) {
  const parent: Record<string, string> = {};
  ids.forEach((id) => (parent[id] = id));

  function find(x: string): string {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: string, y: string) {
    parent[find(x)] = find(y);
  }

  return { find, union };
}

export function matchTeams(users: SimUser[]): Team[] {
  if (users.length === 0) return [];

  const prefSet = new Set(
    users.flatMap((u) => u.preferences.map((p) => `${u.id}:${p}`))
  );
  const isMutual = (a: string, b: string) =>
    prefSet.has(`${a}:${b}`) && prefSet.has(`${b}:${a}`);

  // Step 1+2: Build mutual pairs and cluster with Union-Find
  const uf = makeUnionFind(users.map((u) => u.id));

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (isMutual(users[i].id, users[j].id)) {
        uf.union(users[i].id, users[j].id);
      }
    }
  }

  // Group users by cluster root
  const clusters: Record<string, string[]> = {};
  users.forEach((u) => {
    const root = uf.find(u.id);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(u.id);
  });

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  // Step 3: Split oversized clusters (>5)
  const groups: string[][] = [];
  Object.values(clusters).forEach((cluster) => {
    if (cluster.length <= 5) {
      groups.push(cluster);
      return;
    }
    // Sort by mutual-connection degree, greedily fill chunks of 5
    const degree: Record<string, number> = {};
    cluster.forEach((id) => {
      degree[id] = cluster.filter((other) => isMutual(id, other)).length;
    });
    const sorted = [...cluster].sort((a, b) => degree[b] - degree[a]);
    splitIntoTeams(sorted).forEach((chunk) => groups.push(chunk));
  });

  // Separate solo groups (no mutual picks) from team groups (2+ members)
  const placed: string[] = [];
  const soloGroups: string[][] = [];
  const teamGroups: string[][] = [];

  groups.forEach((g) => {
    if (g.length === 1) soloGroups.push(g);
    else teamGroups.push(g);
  });

  // Step 4+5: Score each solo user against existing team groups, assign to best fit
  soloGroups.forEach(([userId]) => {
    const user = userById[userId];
    let bestGroup = -1;
    let bestScore = -1;

    teamGroups.forEach((group, idx) => {
      if (group.length >= 5) return;
      const score =
        group.filter((mid) => user.preferences.includes(mid)).length +
        group.filter((mid) => userById[mid].preferences.includes(userId)).length;
      if (
        score > bestScore ||
        (score === bestScore &&
          (bestGroup === -1 || group.length < teamGroups[bestGroup].length))
      ) {
        bestScore = score;
        bestGroup = idx;
      }
    });

    if (bestGroup >= 0) {
      teamGroups[bestGroup].push(userId);
      placed.push(userId);
    }
  });

  // Step 6: Handle remaining solos
  const remaining = soloGroups
    .map(([id]) => id)
    .filter((id) => !placed.includes(id));

  if (remaining.length >= 3) {
    // Form their own group(s), never exceeding 5, never leaving a group of 1-2
    splitIntoTeams(remaining).forEach((chunk) => teamGroups.push(chunk));
  } else if (remaining.length > 0) {
    // Merge into the group with most capacity
    const target = [...teamGroups].sort((a, b) => a.length - b.length)[0];
    if (target) {
      remaining.forEach((id) => target.push(id));
    } else {
      teamGroups.push(remaining);
    }
  }

  return teamGroups.map((group) => ({
    id: crypto.randomUUID(),
    members: group.map((id) => userById[id]),
  }));
}
