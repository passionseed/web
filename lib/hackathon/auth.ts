import crypto from "crypto";

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
export const SESSION_EXPIRY_DAYS = 7;
