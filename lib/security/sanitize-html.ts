import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

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
  "aria-label", // Global
  "href",
  "target",
  "rel", // a
  "src",
  "alt",
  "width",
  "height",
  "loading", // img
];

// Configure hooks once to ensure security attributes are added
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Ensure target="_blank" links have rel="noopener noreferrer"
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }

  // Ensure images have loading="lazy" for performance
  if (node.tagName === "IMG" && !node.hasAttribute("loading")) {
    node.setAttribute("loading", "lazy");
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  // Use DOMPurify to sanitize the HTML
  // We explicitly cast to string as per memory instructions regarding TrustedHTML types
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;

  return sanitized;
}

export function markdownToSafeHtml(markdown: string): string {
  // marked.parse can be async in newer versions, force sync execution
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
