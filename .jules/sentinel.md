## 2025-05-24 - HTML Sanitization for Markdown
**Vulnerability:** XSS vulnerability in Markdown rendering via `marked` and `dangerouslySetInnerHTML`.
**Learning:** `marked` does not sanitize HTML by default. When rendering user-generated content or even trusted content that might contain user input, XSS is possible if HTML tags are not stripped or sanitized.
**Prevention:** Always wrap `marked.parse()` output with `sanitizeHtml()` from `lib/security.ts` before passing it to `dangerouslySetInnerHTML`. The `sanitizeHtml` utility uses `isomorphic-dompurify` and is configured to allow safe attributes like `class` (for syntax highlighting) and `target`/`rel` (for links).
