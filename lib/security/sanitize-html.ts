import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

const sanitizeOptions = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
    "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "hr", "table", "thead", "tbody", "tr", "th", "td",
    "div", "span"
  ],
  ALLOWED_ATTR: [
    "class", "title", "aria-label", "href", "target", "rel",
    "src", "alt", "width", "height", "loading"
  ],
  ADD_ATTR: ['target'],
};

// Add hook for target="_blank" security
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if ("target" in node && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, sanitizeOptions) as string;
}

export function markdownToSafeHtml(markdown: string): string {
  // Use synchronous parsing to ensure compatibility with React rendering
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
