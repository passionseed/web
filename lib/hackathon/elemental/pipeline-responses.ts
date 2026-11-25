import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Shared answers for the pipeline API routes. */

export function pipelineNotSetUp() {
  return NextResponse.json({ error: "Pipeline table not set up yet" }, { status: 503 });
}

export function invalidInput(error: ZodError) {
  return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
}

/** A rule the request breaks, said in words the team can act on. */
export function ruleBroken(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
