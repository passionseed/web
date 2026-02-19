import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const verifyHash = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(hashBuffer, verifyHash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const SESSION_COOKIE = "hackathon_token";
export const SESSION_EXPIRY_DAYS = 7;
