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

// Configure hooks for custom transformations
// Note: hooks are global in DOMPurify
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Ensure target="_blank" has rel="noopener noreferrer"
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }

  // Ensure images have loading="lazy" if not present
  if (node.tagName === "IMG" && !node.hasAttribute("loading")) {
    node.setAttribute("loading", "lazy");
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTR,
  }) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // marked.parse can be async by default in newer versions, force sync.
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
