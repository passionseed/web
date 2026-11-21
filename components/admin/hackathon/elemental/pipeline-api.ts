import type { PipelineCreateInput, PipelineItem, PipelineUpdateInput } from "@/lib/hackathon/elemental/pipeline";

/** Browser calls to the admin pipeline API. Each throws with a readable message on failure. */

const BASE = "/api/admin/hackathon/pipeline";

async function send<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) {
    throw new Error(body?.error ?? (res.status === 503 ? "Pipeline table not set up yet" : "Could not save. Try again."));
  }
  return body;
}

export async function apiCreate(input: Partial<PipelineCreateInput>): Promise<PipelineItem> {
  return (await send<{ item: PipelineItem }>(BASE, { method: "POST", body: JSON.stringify(input) })).item;
}

export async function apiUpdate(id: string, patch: PipelineUpdateInput): Promise<PipelineItem> {
  return (await send<{ item: PipelineItem }>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) })).item;
}

export async function apiDelete(id: string): Promise<void> {
  await send<{ ok: true }>(`${BASE}/${id}`, { method: "DELETE" });
}

/** Adds the new rows; rows already on the board come back as `skipped`. */
export async function apiImport(rows: PipelineCreateInput[]): Promise<{ items: PipelineItem[]; skipped: number }> {
  return send<{ items: PipelineItem[]; skipped: number }>(`${BASE}/import`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}
