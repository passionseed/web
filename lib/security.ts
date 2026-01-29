import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses isomorphic-dompurify which works in both Node.js and browser environments.
 *
 * @param html - The potentially unsafe HTML string.
 * @returns The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
