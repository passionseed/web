## 2026-02-05 - Stored XSS via Unsanitized Markdown
**Vulnerability:** Multiple components rendered user-controlled Markdown/HTML (via `marked` and `Prism.js`) directly into `dangerouslySetInnerHTML` without sanitization.
**Learning:** `marked` output is raw HTML and includes `<script>` tags if present in input. `isomorphic-dompurify` is robust but requires `jsdom` for Next.js SSR. `Prism.js` relies on `class` attributes which must be explicitly allowed in sanitizer config.
**Prevention:** All `dangerouslySetInnerHTML` usages must wrap content with `sanitizeHtml` (centralized in `lib/security.ts`). Use `marked.parse(..., { async: false })` to guarantee synchronous execution for React rendering.
