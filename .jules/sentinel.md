## 2024-05-22 - Custom Regex Sanitization Vulnerability
**Vulnerability:** The codebase used a custom regex-based HTML sanitization function (`sanitizeHtml`) in `lib/security/sanitize-html.ts` which was bypassable via encoded characters (e.g., `java\tscript:` in href) and failed to handle complex nested tags correctly.
**Learning:** Regex is insufficient for parsing HTML due to its non-regular grammar and browser-specific quirks. Custom sanitization implementations almost always contain bypasses.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Avoid reinventing security primitives.
