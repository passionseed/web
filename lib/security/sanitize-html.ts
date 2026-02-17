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

export { isSafeUrl } from "./url-validation";
