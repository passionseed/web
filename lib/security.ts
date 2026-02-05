import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks while allowing safe formatting.
 *
 * Configured to allow standard Markdown HTML and Prism.js syntax highlighting
 * (which uses <span class="...">).
 *
 * @param html The potentially unsafe HTML string.
 * @return The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Configure DOMPurify to allow specific tags and attributes needed for
  // Markdown rendering and syntax highlighting (Prism.js).
  const clean = DOMPurify.sanitize(html, {
    // Allow standard text formatting and structure
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span',
      'img', 'del', 'sup', 'sub'
    ],
    // Allow attributes necessary for styling and links
    ALLOWED_ATTR: [
      'href', 'name', 'target', 'src', 'alt', 'class', 'style', 'title', 'width', 'height', 'align'
    ],
    // Forbid potentially dangerous tags (redundant with ALLOWED_TAGS but good for clarity)
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],

    // Explicitly allow data- attributes if needed, but standardizing on just class/style for now.
    // ADD_ATTR: ['target'] // target is in ALLOWED_ATTR
  });

  return clean;
}
