## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-02-18 - Prism.highlight XSS & Safe Attributes
**Vulnerability:** The output of `Prism.highlight` was injected directly into `dangerouslySetInnerHTML` in `OrderCodeActivity.tsx`. While Prism safely escapes typical HTML entities (`<`, `>`), passing its output through a dedicated sanitizer like `sanitize-html` provides necessary defense-in-depth against evolving attack vectors.
**Learning:** When applying `sanitize-html` to the output of syntax highlighters like Prism, you must explicitly add `"span"` to `ALLOWED_TAGS` AND ensure the `class` attribute is permitted on spans in `ALLOWED_ATTR`. Otherwise, the sanitizer strips the classes, destroying the syntax highlighting colors and breaking the component's visual functionality.
**Prevention:** Always test UI rendering (visually) after applying security sanitization to third-party output to ensure benign attributes required for styling (like `class` or `style`) haven't been aggressively stripped.
