# Sentinel's Journal

## 2025-05-23 - Custom Regex Sanitizer
**Vulnerability:** Found a custom regex-based HTML sanitizer in `lib/security/sanitize-html.ts` that failed to handle nested tags and unquoted attributes correctly, potentially allowing XSS bypasses.
**Learning:** Regex-based HTML parsing is fundamentally insecure due to the complexity of the HTML specification and browser parsing quirks. Custom implementations often miss edge cases like null bytes, nested comments, or obscure event handlers.
**Prevention:** Always use `isomorphic-dompurify` (or `dompurify`) for sanitizing user-generated HTML. Avoid writing custom sanitizers.
