/**
 * Uploads to the Backblaze B2 bucket behind cdn.passionseed.org (spec 3.6).
 * Uses the same B2_* env as lib/backblaze.ts, but PutObject directly so the
 * immutable Cache-Control header and the exact key are ours.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { requireEnv } from "./cli";
import { cdnUrl, IMMUTABLE_CACHE } from "./media";

const B2_ENV = ["B2_APPLICATION_KEY_ID", "B2_APPLICATION_KEY", "B2_BUCKET_NAME"] as const;

/** Fails early, before any encoding, when B2 is not configured. */
export function requireB2Env(): void {
  requireEnv(B2_ENV, "uploading to Backblaze B2");
}

function client(): { s3: S3Client; bucket: string } {
  const env = requireEnv(B2_ENV, "uploading to Backblaze B2");
  const endpoint = process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com";
  const region = endpoint.split(".")[1]?.startsWith("us-") || endpoint.split(".")[1]?.startsWith("eu-")
    ? endpoint.split(".")[1]
    : "us-west-000";
  return {
    s3: new S3Client({
      endpoint: `https://${endpoint}`,
      region,
      credentials: { accessKeyId: env.B2_APPLICATION_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY },
      forcePathStyle: true,
    }),
    bucket: env.B2_BUCKET_NAME,
  };
}

/**
 * PutObject with an immutable cache header. Keys carry a content hash, so an
 * existing object with the same key is the same bytes and is not re-sent.
 * Returns the public CDN URL.
 */
export async function putImmutable(key: string, body: Buffer, contentType: string): Promise<{ url: string; skipped: boolean }> {
  const { s3, bucket } = client();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { url: cdnUrl(key), skipped: true };
  } catch {
    // Not there yet: upload.
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE,
    })
  );
  return { url: cdnUrl(key), skipped: false };
}
