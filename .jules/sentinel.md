## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-03-08 - Unsafe SVG Rendering via dangerouslySetInnerHTML
**Vulnerability:** User-controlled SVG strings (`avatar.svg_data`) were being injected directly into the DOM using `dangerouslySetInnerHTML`. An attacker could inject an SVG containing embedded malicious `<script>` tags or `onload` event handlers, leading to Stored Cross-Site Scripting (XSS).
**Learning:** Rendering raw SVGs inline is inherently dangerous. SVGs are essentially XML documents capable of embedding JavaScript.
**Prevention:** When you need to display user-provided SVGs and you don't need to manipulate their internal paths via CSS/JS, do not use `dangerouslySetInnerHTML`. Instead, render the SVG securely by encoding it as a data URI (`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`) and using it as the `src` attribute of a standard `<img>` tag. This forces the browser to treat the SVG strictly as an image, entirely disabling any embedded script execution.