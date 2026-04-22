import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");

  // Method 1: Salt as characters (original legacy method)
  // crypto.scryptSync treats string salt as UTF-8 bytes
  const verifyHash1 = crypto.scryptSync(password, salt, 64);
  if (crypto.timingSafeEqual(hashBuffer, verifyHash1)) return true;

  // Method 2: Salt as actual bytes (standard method)
  try {
    const saltBuffer = Buffer.from(salt, "hex");
    const verifyHash2 = crypto.scryptSync(password, saltBuffer, 64);
    if (crypto.timingSafeEqual(hashBuffer, verifyHash2)) return true;
  } catch (e) {
    // Ignore buffer conversion errors
  }

  return false;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const SESSION_COOKIE = "hackathon_token";
export const SESSION_EXPIRY_DAYS = 60;

export const ALLOWED_ORIGINS = [
  "https://passion-seed.expo.app",
  "https://app.passionseed.org",
  "https://www.passionseed.org",
  "http://localhost:3000",
];

export function getCorsHeaders(req: NextRequest, methods: string = "GET, POST, PATCH, OPTIONS") {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".passionseed.org")) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-upload-session-id, x-chunk-index, x-total-chunks, x-file-name, x-file-type, x-file-size, x-node-id, x-upload-type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export function extractHackathonToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
