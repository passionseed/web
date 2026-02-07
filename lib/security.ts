import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Configured to allow specific tags and attributes for rich text and syntax highlighting.
 *
 * @param html The potentially unsafe HTML string.
 * @returns The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';

  return DOMPurify.sanitize(html, {
    // Allow 'class' for syntax highlighting (e.g. Prism.js) and styling
    // Allow 'target' and 'rel' for external links
    ADD_ATTR: ['class', 'target', 'rel'],
  });
}
