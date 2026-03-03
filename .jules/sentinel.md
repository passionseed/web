## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-02-28 - IDOR in Document Upload
**Vulnerability:** `app/api/upload/documents/route.ts` checked if a node existed, but did not check if the user had permission to upload to that node (IDOR), and leaked backend error messages on failure (Information Disclosure).
**Learning:** Upload endpoints must use centralized authorization guards. Inconsistent application of guards across similar routes (e.g., `images/` vs `documents/`) is a common source of vulnerabilities.
**Prevention:** Always use `requireUploadAccess` to check permissions and `safeServerError` to mask sensitive backend errors in API routes.
