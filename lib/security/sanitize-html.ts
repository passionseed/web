import sanitizeHtmlLib from "sanitize-html";
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

const ALLOWED_ATTR = {
  '*': [
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
  ]
};

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return sanitizeHtmlLib(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {})
          }
        };
      },
      img: (tagName, attribs) => {
        return {
          tagName: 'img',
          attribs: {
            ...attribs,
            ...(!attribs.loading ? { loading: 'lazy' } : {})
          }
        };
      }
    }
  });
}

export function markdownToSafeHtml(markdown: string): string {
  // marked.parse can be async by default in newer versions, force sync.
  const rendered = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rendered);
}
