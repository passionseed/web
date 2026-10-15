/**
 * Certificate URL base. Configurable with SHIFT_CERT_BASE_URL (server) or
 * NEXT_PUBLIC_SHIFT_CERT_BASE_URL; default https://www.passionseed.org.
 * Verify URL = <base>/c/<public_id>.
 */
export const DEFAULT_CERT_BASE_URL = "https://www.passionseed.org";

export function certificateBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SHIFT_CERT_BASE_URL || env.NEXT_PUBLIC_SHIFT_CERT_BASE_URL || DEFAULT_CERT_BASE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return DEFAULT_CERT_BASE_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_CERT_BASE_URL;
  }
}

export function verifyUrl(publicId: string, base = certificateBaseUrl()): string {
  return `${base}/c/${publicId}`;
}

/** Short form printed on images: no scheme, e.g. "www.passionseed.org/c/7K2M…". */
export function verifyUrlText(publicId: string, base = certificateBaseUrl()): string {
  return verifyUrl(publicId, base).replace(/^https?:\/\//, "");
}

export function imageUrl(
  publicId: string,
  format: "story" | "square",
  renderVersion: number,
  base = certificateBaseUrl()
): string {
  return `${base}/c/${publicId}/image/${format}?v=${renderVersion}`;
}
