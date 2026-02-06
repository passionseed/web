import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML string to prevent XSS attacks while preserving
 * allowed tags and attributes (e.g., for Prism.js syntax highlighting).
 *
 * @param html - The raw HTML string to sanitize
 * @returns The sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['span'],
    ADD_ATTR: ['class'],
  });
};
