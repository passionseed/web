## 2026-01-30 - Missing Sanitization and Security Lib
**Vulnerability:** Stored XSS via `marked` library in `dangerouslySetInnerHTML`.
**Learning:** `lib/security.ts` was referenced in memory but did not exist in the codebase. Standard `marked` library does not sanitize output.
**Prevention:** Created `lib/security.ts` with `isomorphic-dompurify`. Future implementations must import `sanitizeHtml` from this library when using `dangerouslySetInnerHTML`.
