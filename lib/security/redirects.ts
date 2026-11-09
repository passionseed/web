/** Keep return destinations local, including after browser URL normalization. */
export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return fallback;
  }

  // Backslashes and control characters can turn apparently relative paths
  // into external URLs. Check the parsed origin as a second boundary.
  const base = "https://passionseed.org";
  try {
    const target = new URL(value, base);
    return target.origin === base ? value : fallback;
  } catch {
    return fallback;
  }
}
