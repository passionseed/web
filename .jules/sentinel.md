## 2025-02-12 - Secure Markdown Rendering with Prism.js Support
**Vulnerability:** Multiple XSS vulnerabilities found where `marked.parse()` output was rendered via `dangerouslySetInnerHTML` without sanitization.
**Learning:** `marked` v16+ defaults to returning a Promise, which can crash React components expecting a string. Also, standard sanitization strips syntax highlighting classes.
**Prevention:** Use a centralized `sanitizeHtml` utility configured to allow `span` tags and `class` attributes (for Prism.js). Explicitly call `marked.parse(text, { async: false })` in synchronous React components.
