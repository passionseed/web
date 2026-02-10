import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

// Configure DOMPurify
const config = {
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
};

// Add hook for target="_blank" and img loading
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if ("target" in node && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }

  if (node.tagName === "IMG" && !node.getAttribute("loading")) {
    node.setAttribute("loading", "lazy");
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  // Cast to string as isomorphic-dompurify can return TrustedHTML in some envs
  return DOMPurify.sanitize(input, config) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // Ensure synchronous parsing
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
