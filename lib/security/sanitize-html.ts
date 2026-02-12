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
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "loading",
];

// Add hooks to enforce security and performance best practices
// Remove existing hooks to prevent duplication during HMR or tests
DOMPurify.removeHook("afterSanitizeAttributes");

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Ensure target="_blank" has rel="noopener noreferrer"
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
  // Ensure images have loading="lazy"
  if (node.tagName === "IMG" && !node.getAttribute("loading")) {
    node.setAttribute("loading", "lazy");
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // Ensure synchronous parsing for React compatibility
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
