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

// Hook is registered lazily inside sanitizeHtml to avoid issues
// with module-scope JSDOM initialization in Next.js serverless production.
let hookRegistered = false;

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // Register the hook once, lazily, to avoid module-scope JSDOM issues in serverless.
  if (!hookRegistered) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if ("tagName" in node) {
        if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
          node.setAttribute("rel", "noopener noreferrer");
        }
        if (node.tagName === "IMG" && !node.getAttribute("loading")) {
          node.setAttribute("loading", "lazy");
        }
      }
    });
    hookRegistered = true;
  }

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
