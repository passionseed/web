import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-embedding-2";
const GEMINI_DIMENSIONS = 1024;
const DEFAULT_BATCH_SIZE = 64; // Can be tuned if Gemini has different limits

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) {
    _ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
    });
  }
  return _ai;
}

async function fetchEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const ai = getAI();
  
  // As per docs, wrapping each text in a Content object generates separate embeddings
  const contents = texts.map((text) => ({
    parts: [{ text }],
  }));

  const response = await ai.models.embedContent({
    model: DEFAULT_MODEL,
    contents,
    config: {
      outputDimensionality: GEMINI_DIMENSIONS,
    },
  });

  if (!response.embeddings) {
    throw new Error("No embeddings returned from Gemini API");
  }

  return response.embeddings.map((e) => e.values);
}

/**
 * Batch-embed a list of texts with Gemini Embeddings API.
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
      out[idx] = new Array(GEMINI_DIMENSIONS).fill(0);
    } else {
      nonEmptyIndices.push(idx);
      
      // Gemini 2 recommends using task prefixes for retrieval tasks.
      // We will append a task prefix if needed, but since this is general embedding
      // used for search and clustering, we'll format it as a retrieval document or symmetric.
      // Given that we are clustering and searching, we can just use the text as is.
      // Wait, "For text-only tasks with gemini-embedding-2, we strongly recommend you add the task instruction in your prompt."
      // Example: 'task: search result | query: {content}'
      // But we will use classification or clustering format for the DB: 'task: clustering | query: {content}'
      // Actually, since these embeddings are used for both searching and clustering,
      // it might be safer to just pass the raw text if we don't have a strict query vs doc distinction.
      // Let's pass raw text for now or 'task: clustering | query: ' + text.
      // Let's just use raw text since it's a general purpose vector store for these texts.
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
