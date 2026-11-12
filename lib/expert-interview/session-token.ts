import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

// The interview is public (experts have no account), so /session hands out an
// HMAC-signed, httpOnly cookie bound to the sessionId. chat, upload-photo and
// submit only serve requests that carry it, which puts every Gemini call and
// upload behind the per-IP limit on /session.
const COOKIE_NAME = "ei_session";
const TTL_SECONDS = 6 * 60 * 60;

function signingKey(): Buffer {
  const secret = process.env.EXPERT_INTERVIEW_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("EXPERT_INTERVIEW_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set");
  return crypto.createHash("sha256").update(`expert-interview-session:${secret}`).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createSessionToken(sessionId: string, now = Date.now()): string {
  const payload = `${sessionId}.${Math.floor(now / 1000) + TTL_SECONDS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, sessionId: string, now = Date.now()): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const given = Buffer.from(token.slice(lastDot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;

  const expDot = payload.lastIndexOf(".");
  const tokenSessionId = payload.slice(0, expDot);
  const exp = Number(payload.slice(expDot + 1));
  return tokenSessionId === sessionId && Number.isFinite(exp) && exp * 1000 > now;
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set(COOKIE_NAME, createSessionToken(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/expert-interview",
    maxAge: TTL_SECONDS,
  });
}

export function hasValidSession(request: NextRequest, sessionId: string): boolean {
  return verifySessionToken(request.cookies.get(COOKIE_NAME)?.value, sessionId);
}
