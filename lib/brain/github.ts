/**
 * Commits page edits straight to passionseed/company-brain `main` as the
 * `web-sync` bot (company-brain AGENTS.md rule 8), through the GitHub REST
 * contents API. Needs BRAIN_GITHUB_TOKEN: a fine-grained token with
 * Contents read/write on company-brain only.
 */

const REPO = "passionseed/company-brain";
const BRANCH = "main";
const API = `https://api.github.com/repos/${REPO}/contents`;
const COMMITTER = { name: "web-sync", email: "web-sync@users.noreply.github.com" };

export function brainToken(): string | null {
  return process.env.BRAIN_GITHUB_TOKEN || null;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "passionseed-web-sync",
  };
}

function fileUrl(path: string) {
  return `${API}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

interface BrainFile {
  content: string;
  /** null when the page does not exist yet. */
  sha: string | null;
}

async function getFile(token: string, path: string): Promise<BrainFile> {
  const res = await fetch(`${fileUrl(path)}?ref=${BRANCH}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (res.status === 404) return { content: "", sha: null };
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  const body = (await res.json()) as { content?: string; sha: string };
  return {
    content: Buffer.from(body.content ?? "", "base64").toString("utf8"),
    sha: body.sha,
  };
}

class ShaConflict extends Error {}

async function putFile(
  token: string,
  path: string,
  content: string,
  sha: string | null,
  message: string,
): Promise<void> {
  const res = await fetch(fileUrl(path), {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: BRANCH,
      committer: COMMITTER,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409 || res.status === 422) {
    throw new ShaConflict(`GitHub PUT ${path} conflict: ${res.status}`);
  }
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: ${res.status}`);
}

/**
 * Reads a page, applies `transform`, and commits the result if it changed.
 * Retries once from a fresh read when the page moved underneath us.
 * Returns false when the transform made no change.
 */
export async function updateBrainPage(
  token: string,
  path: string,
  transform: (content: string) => string,
  message: string,
): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    const file = await getFile(token, path);
    const next = transform(file.content);
    if (next === file.content) return false;
    try {
      await putFile(token, path, next, file.sha, message);
      return true;
    } catch (error) {
      if (!(error instanceof ShaConflict) || attempt >= 1) throw error;
    }
  }
}
