import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed links for the Elemental problem-owner kit
 * (/hackathon/elemental/owner-kit).
 *
 * Anyone can read the guide, but the upload form only opens on a link we send
 * to one organisation: ?o=<org>&el=<element>&s=<signature>. The signature is
 * an HMAC of the org and element, so a stranger can't make a working link and
 * fill our bucket. Uploads land under elemental-owners/<org>/.
 *
 * The key is ELEMENTAL_OWNER_LINK_SECRET when set, else the B2 application key
 * the server already has, so the feature needs no new env var. Rotating that
 * key breaks the links already sent; make new ones with
 * `pnpm elemental:owner-kit link <org> [element]`.
 */

export const OWNER_ELEMENTS = ["earth", "water", "air", "fire", "aether"] as const;
export type OwnerElement = (typeof OWNER_ELEMENTS)[number];

const ORG_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/;

/** An org slug: lowercase letters, digits and dashes, 2 to 48 characters. */
export function isValidOrg(org: unknown): org is string {
  return typeof org === "string" && ORG_PATTERN.test(org);
}

export function parseOwnerElement(value: unknown): OwnerElement | null {
  return typeof value === "string" && (OWNER_ELEMENTS as readonly string[]).includes(value)
    ? (value as OwnerElement)
    : null;
}

function linkSecret(): string | null {
  return process.env.ELEMENTAL_OWNER_LINK_SECRET || process.env.B2_APPLICATION_KEY || null;
}

function digest(org: string, element: OwnerElement | null, secret: string): string {
  return createHmac("sha256", secret)
    .update(`elemental-owner:v1:${org}:${element ?? ""}`)
    .digest("base64url")
    .slice(0, 22);
}

export function signOwnerLink(org: string, element: OwnerElement | null, secret = linkSecret()): string {
  if (!secret) throw new Error("Missing ELEMENTAL_OWNER_LINK_SECRET or B2_APPLICATION_KEY");
  if (!isValidOrg(org)) throw new Error(`Invalid org slug: ${org}`);
  return digest(org, element, secret);
}

export function verifyOwnerLink(
  org: unknown,
  element: OwnerElement | null,
  signature: unknown,
  secret = linkSecret()
): org is string {
  if (!secret || !isValidOrg(org) || typeof signature !== "string") return false;
  const expected = Buffer.from(digest(org, element, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function ownerKitPath(org: string, element: OwnerElement | null, signature: string): string {
  const query = new URLSearchParams({ o: org, ...(element ? { el: element } : {}), s: signature });
  return `/hackathon/elemental/owner-kit?${query.toString()}`;
}
