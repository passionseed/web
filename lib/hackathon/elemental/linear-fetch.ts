import { unstable_cache } from "next/cache";

import type { LinearIssue } from "./linear-progress";

/**
 * Server-only read of the hackathon team's Linear issues (team key HAC).
 * Uses LINEAR_API_KEY; the page shows a calm notice when it is missing or
 * Linear fails, so this never throws.
 */

const LINEAR_URL = "https://api.linear.app/graphql";
export const LINEAR_TEAM_KEY = "HAC";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const QUERY = `
  query HackathonIssues($teamKey: String!, $after: String) {
    issues(
      first: ${PAGE_SIZE}
      after: $after
      includeArchived: false
      filter: { team: { key: { eq: $teamKey } }, state: { type: { neq: "canceled" } } }
    ) {
      nodes {
        identifier
        title
        url
        dueDate
        priority
        completedAt
        state { name type }
        assignee { id displayName }
        parent { identifier }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type IssuesPage = {
  data?: {
    issues?: {
      nodes: LinearIssue[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: { message: string }[];
};

export type LinearResult =
  | { ok: true; issues: LinearIssue[] }
  | { ok: false; reason: "no_key" | "failed" };

async function fetchAllIssues(apiKey: string, teamKey: string): Promise<LinearIssue[]> {
  const issues: LinearIssue[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(LINEAR_URL, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { teamKey, after } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Linear answered ${res.status}`);
    const json = (await res.json()) as IssuesPage;
    if (json.errors?.length || !json.data?.issues) {
      throw new Error(`Linear error: ${json.errors?.map((e) => e.message).join("; ") ?? "no data"}`);
    }
    issues.push(...json.data.issues.nodes);
    if (!json.data.issues.pageInfo.hasNextPage) return issues;
    after = json.data.issues.pageInfo.endCursor;
  }
  return issues;
}

// Cached for a minute across requests. A failure throws, so it is not cached.
const cachedIssues = unstable_cache(
  async (teamKey: string) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) throw new Error("LINEAR_API_KEY missing");
    return fetchAllIssues(apiKey, teamKey);
  },
  ["hackathon-elemental-linear-issues"],
  { revalidate: 60, tags: ["hackathon-elemental-linear"] },
);

export async function loadHackathonIssues(teamKey: string = LINEAR_TEAM_KEY): Promise<LinearResult> {
  if (!process.env.LINEAR_API_KEY) return { ok: false, reason: "no_key" };
  try {
    return { ok: true, issues: await cachedIssues(teamKey) };
  } catch (error) {
    console.error("[admin/hackathon/elemental] Linear fetch failed", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
}
