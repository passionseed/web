## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2026-02-16 - Insufficient File Extension Blacklist
**Vulnerability:** The file upload validation relied on a limited blacklist of dangerous extensions (`.exe`, `.bat`, etc.) while allowing generic MIME types (like `text/plain`). This allowed attackers to upload malicious scripts (e.g., `.php`, `.sh`, `.html`) by disguising them as text files, potentially leading to RCE or XSS if served incorrectly.
**Learning:** Blacklists are inherently fragile because new file types or attack vectors can be missed. Trusting client-provided MIME types without strict extension validation is dangerous.
**Prevention:** Use a whitelist of allowed extensions that strictly map to allowed MIME types. If a blacklist must be used, it should be comprehensive and cover all executable and script formats for the target platform and potential client-side vectors.
