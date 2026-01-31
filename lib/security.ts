import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * Uses isomorphic-dompurify to clean the input.
 *
 * @param html The potentially unsafe HTML string.
 * @returns The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  // Use default configuration which is secure by default.
  // It strips scripts, iframes (unless configured), and dangerous attributes.
  return DOMPurify.sanitize(html);
}
