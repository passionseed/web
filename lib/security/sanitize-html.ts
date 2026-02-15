import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = [
  "class",
  "title",
  "aria-label",
  "href",
  "target",
  "rel", // for 'a'
  "src",
  "alt",
  "width",
  "height",
  "loading", // for 'img'
];

// Configure DOMPurify hooks
// These run on every sanitization call.
// We add them once at module scope.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Ensure we are dealing with an element
  if ("tagName" in node) {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG" && !node.getAttribute("loading")) {
      node.setAttribute("loading", "lazy");
    }
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // Note: isomorphic-dompurify automatically detects environment (Node/JSDOM or Browser).
  // We explicitly cast to string to satisfy TypeScript as sanitize() return type can vary.
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // marked.parse can be async by default in newer versions, force sync.
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}

/**
 * Validates if a URL is safe to use in href or src attributes.
 * Allows http, https, mailto, tel, and relative URLs.
 * Rejects javascript:, data:, vbscript:, and other potentially dangerous schemes.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();

  try {
    // If it's a relative URL, new URL(url) throws, so we provide a base.
    // This serves only to parse the URL structure.
    // eslint-disable-next-line no-new
    new URL(trimmed, "http://dummy.com");

    // Check if the URL string starts with a protocol scheme
    // A simple regex for scheme: ^[a-zA-Z][a-zA-Z0-9+.-]*: matches standard schemes
    const schemeMatch = trimmed.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
    if (schemeMatch) {
      const scheme = schemeMatch[0].toLowerCase();
      // Only allow specific safe schemes
      return ["http:", "https:", "mailto:", "tel:"].includes(scheme);
    }

    // If no scheme is present, it's a relative URL or protocol-relative URL (//example.com), which is generally safe
    return true;
  } catch (e) {
    // URL parsing failed, treat as unsafe
    return false;
  }
}
