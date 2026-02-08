import { marked } from "marked";

const ALLOWED_TAGS = new Set([
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
]);

const GLOBAL_ALLOWED_ATTRS = new Set(["class", "title", "aria-label"]);
const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeUrl(value: string): string {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/html")
  ) {
    return "";
  }

  return trimmed;
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const attrs: string[] = [];
  const attrRe = /([a-zA-Z0-9_:-]+)\s*=\s*(["'])(.*?)\2/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(rawAttrs)) !== null) {
    const attrName = match[1].toLowerCase();
    let attrValue = match[3];

    if (attrName.startsWith("on")) continue;
    if (attrName === "style") continue;

    const allowedForTag = TAG_ALLOWED_ATTRS[tag] ?? new Set<string>();
    if (!GLOBAL_ALLOWED_ATTRS.has(attrName) && !allowedForTag.has(attrName)) {
      continue;
    }

    if (attrName === "href" || attrName === "src") {
      attrValue = sanitizeUrl(attrValue);
      if (!attrValue) continue;
    }

    if (tag === "a" && attrName === "target") {
      if (attrValue !== "_blank" && attrValue !== "_self") continue;
    }

    attrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
  }

  if (tag === "a") {
    const hasTargetBlank = attrs.some((a) => a === 'target="_blank"');
    const hasRel = attrs.some((a) => a.startsWith("rel="));
    if (hasTargetBlank && !hasRel) {
      attrs.push('rel="noopener noreferrer"');
    }
  }

  if (tag === "img") {
    const hasLoading = attrs.some((a) => a.startsWith("loading="));
    if (!hasLoading) attrs.push('loading="lazy"');
  }

  return attrs.length > 0 ? " " + attrs.join(" ") : "";
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let sanitized = input;

  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");
  sanitized = sanitized.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  sanitized = sanitized.replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");
  sanitized = sanitized.replace(/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, "");
  sanitized = sanitized.replace(/<\s*object[\s\S]*?<\s*\/\s*object\s*>/gi, "");
  sanitized = sanitized.replace(/<\s*embed[\s\S]*?<\s*\/\s*embed\s*>/gi, "");
  sanitized = sanitized.replace(/<\s*svg[\s\S]*?<\s*\/\s*svg\s*>/gi, "");

  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (full, tagName, attrs) => {
    const isClosing = full.startsWith("</");
    const tag = String(tagName).toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    const attrString = sanitizeAttributes(tag, String(attrs || ""));
    const selfClosing = /\/$/.test(full.trim()) || tag === "br" || tag === "hr";
    return selfClosing ? `<${tag}${attrString} />` : `<${tag}${attrString}>`;
  });

  return sanitized;
}

export function markdownToSafeHtml(markdown: string): string {
  const rendered = marked.parse(markdown ?? "") as string;
  return sanitizeHtml(rendered);
}
