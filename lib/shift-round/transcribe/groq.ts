import Groq from "groq-sdk";
import type { WhisperFn, WhisperResult } from "./handler";

/** Groq whisper-large-v3, verbose_json for segments (spec 6.3). Null without a key. */
export function groqWhisperFromEnv(): WhisperFn | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const groq = new Groq({ apiKey, maxRetries: 0, timeout: 24_000 });
  return async ({ file, language, signal }) => {
    const result = await groq.audio.transcriptions.create(
      { file, model: "whisper-large-v3", response_format: "verbose_json", language, temperature: 0 },
      { signal }
    );
    return result as unknown as WhisperResult;
  };
}
