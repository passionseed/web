import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows common formatting tags but removes dangerous scripts and attributes.
 *
 * @param html The HTML string to sanitize
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel',
      'class', 'style', 'width', 'height',
      'align', 'valign',
    ],
    // ADD_TAGS: ['iframe'], // Disabled for security. If needed, enable cautiously.

    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

// Add a hook to ensure target="_blank" links are safe
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
