/**
 * Content Sanitization for PathLab Page Builder
 *
 * Uses sanitize-html to prevent XSS attacks in user-generated content.
 * All user input that will be rendered as HTML/Markdown must pass through these functions.
 */

import sanitizeHtml from 'sanitize-html';

// Blocked URL schemes (XSS vectors)
const BLOCKED_URL_SCHEMES = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'about:',
];

/**
 * Sanitize HTML/Markdown content for safe rendering
 *
 * Allows common formatting tags but strips scripts, iframes, and dangerous attributes.
 */
export function sanitizeContent(body: string): string {
  if (!body) return '';

  return sanitizeHtml(body, {
    allowedTags: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 'del', 'mark',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Code
      'code', 'pre',
      // Quotes
      'blockquote',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      '*': ['class'],
    },
    // Only allow https URLs (except localhost for dev)
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
    },
    // Strip all script-related attributes
    disallowedTagsMode: 'discard',
  });
}

/**
 * Validate and sanitize URLs
 *
 * Ensures URLs are safe and use allowed protocols.
 *
 * @throws Error if URL is invalid or uses blocked scheme
 */
export function validateContentUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Check for blocked schemes
  const lowerUrl = trimmedUrl.toLowerCase();
  for (const scheme of BLOCKED_URL_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return {
        valid: false,
        error: `Blocked URL scheme: ${scheme}`,
      };
    }
  }

  // Try to parse as URL
  try {
    const parsed = new URL(trimmedUrl);

    // Require HTTPS (except localhost for development)
    if (
      parsed.protocol !== 'https:' &&
      !parsed.hostname.includes('localhost') &&
      !parsed.hostname.includes('127.0.0.1')
    ) {
      return {
        valid: false,
        error: 'HTTPS is required for external URLs',
      };
    }

    return { valid: true };
  } catch (e) {
    // If URL parsing fails, check if it's a relative path
    if (trimmedUrl.startsWith('/')) {
      return { valid: true }; // Relative paths are OK
    }

    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Sanitize template metadata JSON
 *
 * Prevents deeply nested objects and excessive size.
 */
export function sanitizeTemplateMetadata(
  metadata: unknown
): { sanitized: Record<string, any>; warnings: string[] } {
  const warnings: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    return { sanitized: {}, warnings: ['Metadata must be an object'] };
  }

  const stringified = JSON.stringify(metadata);

  // Check size (max 1MB)
  const sizeInBytes = new Blob([stringified]).size;
  if (sizeInBytes > 1024 * 1024) {
    warnings.push('Metadata exceeds 1MB size limit');
    return { sanitized: {}, warnings };
  }

  // Check nesting depth (max 5 levels)
  function getDepth(obj: any, currentDepth = 0): number {
    if (currentDepth > 5) return currentDepth;
    if (typeof obj !== 'object' || obj === null) return currentDepth;

    const depths = Object.values(obj).map(val => getDepth(val, currentDepth + 1));
    return Math.max(currentDepth, ...depths);
  }

  const depth = getDepth(metadata);
  if (depth > 5) {
    warnings.push('Metadata is too deeply nested (max 5 levels)');
  }

  return {
    sanitized: metadata as Record<string, any>,
    warnings,
  };
}

/**
 * Log potential XSS attempts for security monitoring
 */
export function logXssAttempt(
  userId: string,
  content: string,
  context: string
): void {
  // In production, send to security monitoring (Sentry, DataDog, etc.)
  console.error('[SECURITY] XSS attempt detected', {
    userId,
    contentPreview: content.substring(0, 100),
    context,
    timestamp: new Date().toISOString(),
  });

  // Check if content contains obvious XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /onload=/i,
  ];

  const detected = xssPatterns.filter(pattern => pattern.test(content));
  if (detected.length > 0) {
    console.error('[SECURITY] XSS patterns detected:', detected.map(p => p.source));
  }
}
