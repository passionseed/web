const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/gi,
  /system\s*:/gi,
  /\[SYSTEM\]/gi,
  /\[ADMIN\]/gi,
  /\[INST\]/gi,
  /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
];

export function sanitizeExpertInput(input: string): string {
  if (!input) return "";

  let sanitized = input.replace(/<[^>]+>/g, "");

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  sanitized = sanitized.slice(0, 2000);
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^javascript:/i.test(trimmed)) return undefined;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return undefined;
  return trimmed;
}
