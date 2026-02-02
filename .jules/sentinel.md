# Sentinel's Journal

## 2024-05-23 - Unsanitized Markdown Rendering
**Vulnerability:** Multiple instances of Cross-Site Scripting (XSS) were found where user-generated markdown content was parsed using `marked` and rendered via `dangerouslySetInnerHTML` without sanitization.
**Learning:** The `marked` library does not sanitize output by default. Developers might assume it's safe or forget to add a sanitization layer, leading to widespread XSS vulnerabilities.
**Prevention:** Created a centralized `sanitizeHtml` function in `lib/security.ts` using `isomorphic-dompurify`. All markdown rendering must now pass through this sanitizer.
