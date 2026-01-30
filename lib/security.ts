import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML to prevent XSS attacks.
 * Uses isomorphic-dompurify which works on both client and server.
 *
 * @param html The potentially unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}
