import { sanitizeHtml, markdownToSafeHtml } from "../lib/security/sanitize-html";
import assert from "assert";

console.log("Running sanitization verification...");

try {
  // 1. Basic allowed HTML
  const allowed = "<p>Hello <strong>World</strong></p>";
  const result1 = sanitizeHtml(allowed);
  assert.strictEqual(result1, allowed, "Allowed HTML should be preserved");
  console.log("✅ Basic allowed HTML preserved");

  // 2. Disallowed HTML
  const disallowed = "<script>alert(1)</script><p>Safe</p>";
  const result2 = sanitizeHtml(disallowed);
  assert.strictEqual(result2, "<p>Safe</p>", "Script tag should be removed");
  console.log("✅ Disallowed HTML removed");

  // 3. Markdown rendering
  const markdown = "# Hello\n\n- item 1";
  const result3 = markdownToSafeHtml(markdown);
  // marked might output slightly different HTML (newlines), so we check for key parts
  assert.ok(result3.includes("<h1>Hello</h1>"), "Markdown H1 rendered");
  assert.ok(result3.includes("<ul>"), "Markdown list rendered");
  console.log("✅ Markdown rendering works");

  // 4. Link handling
  const link = '<a href="https://example.com" target="_blank">Link</a>';
  const result4 = sanitizeHtml(link);
  assert.ok(result4.includes('rel="noopener noreferrer"'), "rel attribute added to target=_blank");
  console.log("✅ Link rel attribute added");

  // 5. Img handling
  const img = '<img src="image.png" alt="Test">';
  const result5 = sanitizeHtml(img);
  assert.ok(result5.includes('loading="lazy"'), "loading=lazy added to img");
  console.log("✅ Img loading attribute added");

  console.log("🎉 All sanitization tests passed!");
} catch (error) {
  console.error("❌ Test failed:", error);
  process.exit(1);
}
