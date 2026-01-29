# Sentinel's Journal

## 2026-01-29 - [SSR-Compatible Sanitization]
**Vulnerability:** XSS via `dangerouslySetInnerHTML` with `marked` in Server Components.
**Learning:** Standard `dompurify` fails in Next.js Server Components because it relies on `window`. `isomorphic-dompurify` is required for universal sanitization.
**Prevention:** Use `lib/security.ts` (wrapping `isomorphic-dompurify`) for all HTML rendering.
