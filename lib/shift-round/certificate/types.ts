import { z } from "zod";

/**
 * Contract types for SHIFT round certificates (build spec 2.7, 3.1, 3.3).
 * Lane A owns the RPCs; these schemas parse what they return and treat any
 * other shape as a service failure (never as "not found" or "revoked").
 */

/**
 * Missions are per-round config (v2 spec 2.1), so a snapshot lists any keys,
 * any count. Titles come from the snapshot when it carries them, else from the
 * known-key copy (missions.ts).
 */
export type MissionKey = string;

/** A snapshot mission: a key (`"ideas"`) or an object from the round config / counts. */
export const snapshotMissionSchema = z.union([
  z.string().min(1).max(64),
  z
    .object({
      key: z.string().min(1).max(64),
      title_th: z.string().max(200).nullable().optional(),
      title_en: z.string().max(200).nullable().optional(),
      complete: z.boolean().optional(),
    })
    .passthrough(),
]);
export type SnapshotMission = z.infer<typeof snapshotMissionSchema>;

/** 80-bit Crockford base32, 16 chars (2.2 shift_round_certificates.public_id). */
export const PUBLIC_ID_RE = /^[0-9A-HJKMNP-TV-Z]{16}$/;

export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_ID_RE.test(value);
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const snapshotV1Schema = z.object({
  v: z.literal(1),
  issuer: z.string(),
  public_id: z.string(),
  round: z.object({
    number: z.number().int().positive(),
    title_th: z.string(),
    title_en: z.string(),
    starts_on: isoDate,
    closes_on: isoDate,
  }),
  track: z.enum(["high_school", "university"]),
  holder: z.object({
    handle: z.string(),
    legal_name: z.string().nullable(),
    display: z.enum(["handle", "legal"]),
  }),
  missions: z.array(snapshotMissionSchema).max(20),
  counts: z
    .object({
      people_talked_to: z.number().int().nonnegative().optional(),
      interviews: z.number().int().nonnegative().optional(),
      testers: z.number().int().nonnegative().optional(),
      changes: z.number().int().nonnegative().optional(),
    })
    .passthrough(),
  issued_at: z.string(),
});
export type CertificateSnapshotV1 = z.infer<typeof snapshotV1Schema>;

/**
 * What the public RPC returns as `snapshot`: the full v1 snapshot when valid;
 * for revoked certificates Lane A strips holder, counts and track (round facts
 * only, 6.1); null for a tombstone.
 */
export const publicSnapshotSchema = snapshotV1Schema.partial({ holder: true, counts: true, track: true });
export type PublicSnapshot = z.infer<typeof publicSnapshotSchema>;

export const SUMMARY_COUNT_KEYS = ["people_talked_to", "testers", "missions"] as const;
export type SummaryCountKey = (typeof SUMMARY_COUNT_KEYS)[number];

const summarySchema = z.object({
  title: z.string(),
  description: z.string(),
  demo_url: z.string().nullable().optional(),
  counts: z.record(z.string(), z.number()).nullable().optional(),
});
export type PublicSummary = z.infer<typeof summarySchema>;

export const certificatePublicDataSchema = z.object({
  status: z.enum(["valid", "revoked"]),
  tombstone: z.boolean(),
  snapshot: publicSnapshotSchema.nullable(),
  revoked_at: z.string().nullable().optional(),
  render_version: z.number().int().nonnegative(),
  verify_url: z.string().nullable().optional(),
  summary: summarySchema.nullable().optional(),
  // Returned by Lane A's RPC (not listed in spec 3.3): lets the tombstone show "round N".
  round_number: z.number().int().positive().nullable().optional(),
});
export type CertificatePublicData = z.infer<typeof certificatePublicDataSchema>;

export const rpcEnvelopeSchema = z.union([
  z.object({ ok: z.literal(true), data: z.unknown(), request_id: z.string().optional() }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string(),
      category: z.string().optional(),
      field: z.string().nullable().optional(),
      retry_after: z.number().nullable().optional(),
      details: z.unknown().optional(),
    }),
    request_id: z.string().optional(),
  }),
]);

/** Result of looking up a certificate for the public page and image route. */
export type CertificateLookup =
  | { kind: "valid"; publicId: string; data: CertificatePublicData; snapshot: CertificateSnapshotV1 }
  | { kind: "revoked"; publicId: string; data: CertificatePublicData; snapshot: PublicSnapshot }
  | { kind: "tombstone"; publicId: string; data: CertificatePublicData }
  | { kind: "not_found"; publicId: string }
  | { kind: "error"; publicId: string; reason: string };

export type ImageFormat = "story" | "square";
export const IMAGE_FORMATS: Record<ImageFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};
export function isImageFormat(value: unknown): value is ImageFormat {
  return value === "story" || value === "square";
}
