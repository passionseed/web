import crypto from "crypto";

const DEFAULT_TEI_URL = "https://ai.passionseed.org";
const DEFAULT_MODEL = "BAAI/bge-m3";
const DEFAULT_BATCH_SIZE = 64;
const MAX_RETRIES = 3;

export const BGE_M3_DIMENSIONS = 1024;

export function getTeiUrl(): string {
  return process.env.TEI_URL ?? DEFAULT_TEI_URL;
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function fetchEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const url = `${getTeiUrl()}/v1/embeddings`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: texts, model: DEFAULT_MODEL }),
      });

      if (res.status >= 500) {
        lastError = new Error(`TEI ${res.status}: ${await res.text()}`);
      } else if (!res.ok) {
        throw new Error(`TEI ${res.status}: ${await res.text()}`);
      } else {
        const data = await res.json();
        return data.data.map((row: { embedding: number[] }) => row.embedding);
      }
    } catch (err) {
      lastError = err;
    }

    const backoffMs = 200 * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  throw lastError instanceof Error ? lastError : new Error("TEI request failed");
}

/**
 * Batch-embed a list of texts with BGE-M3 via the TEI server.
 * Empty strings return zero-vectors of the correct length to keep array alignment.
 */
export async function embedTexts(
  texts: string[],
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = new Array(texts.length);
  const nonEmptyIndices: number[] = [];
  const nonEmptyTexts: string[] = [];

  texts.forEach((text, idx) => {
    if (!text || !text.trim()) {
      out[idx] = new Array(BGE_M3_DIMENSIONS).fill(0);
    } else {
      nonEmptyIndices.push(idx);
      nonEmptyTexts.push(text);
    }
  });

  for (let i = 0; i < nonEmptyTexts.length; i += batchSize) {
    const batch = nonEmptyTexts.slice(i, i + batchSize);
    const embeddings = await fetchEmbeddingsBatch(batch);
    embeddings.forEach((vec, offset) => {
      out[nonEmptyIndices[i + offset]] = vec;
    });
  }

  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export function formatVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
