## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2026-03-16 - SVG Data XSS in dangerouslySetInnerHTML
**Vulnerability:** User-controlled SVG data (`avatar.svg_data`) was directly passed to `dangerouslySetInnerHTML` in `components/seeds/npc-avatars/NPCAvatarSettings.tsx` without sanitization. SVGs can embed `<script>` tags or use `onload` attributes, leading to XSS vulnerabilities.
**Learning:** Even if the input is expected to be an SVG rather than full HTML, treating it as raw HTML and passing it to `dangerouslySetInnerHTML` is extremely risky because SVG supports executable scripts.
**Prevention:** Always sanitize any user-controlled raw HTML or SVG code with a library like `isomorphic-dompurify` (using an SVG-compatible allowlist config) before injecting it into the DOM.
