import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
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
    "span", // Added for Prism.js highlighting
    "div", // Often used in markdown rendering
  ],
  ALLOWED_ATTR: [
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
  ],
  // Prevent XSS via URI attributes
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

// Add hook to ensure secure attributes for external links
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if ("getAttribute" in node) {
    const target = node.getAttribute("target");
    if (target === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, SANITIZE_OPTIONS) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // marked can be async, but for simple markdown without async extensions it is sync.
  // Using { async: false } ensures it returns string.
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
