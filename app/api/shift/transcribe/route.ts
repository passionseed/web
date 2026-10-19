import { NextResponse } from "next/server";
import { groqWhisperFromEnv } from "@/lib/shift-round/transcribe/groq";
import { createUserClientFromEnv, handleTranscribe } from "@/lib/shift-round/transcribe/handler";

/**
 * POST /api/shift/transcribe (spec 5.6, 6.3). Public route prefix: the
 * handler authenticates the student's own bearer token itself.
 * Body: {path, lang}. Response: {text, segments:[{id,start_ms,end_ms,text}], language}.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const result = await handleTranscribe(
    { authorization: request.headers.get("authorization"), body },
    {
      createUserClient: createUserClientFromEnv,
      whisper: groqWhisperFromEnv(),
      // Codes and counts only: never audio, transcript text, paths or tokens.
      log: (event, fields) => console.info(event, fields),
    }
  );
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store", ...(result.headers ?? {}) },
  });
}
