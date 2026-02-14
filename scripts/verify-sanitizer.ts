
import { sanitizeHtml } from "../lib/security/sanitize-html";

const tests = [
  {
    name: "Basic allowed tag",
    input: "<p>Hello world</p>",
    expected: "<p>Hello world</p>",
  },
  {
    name: "Disallowed tag (script)",
    input: "<script>alert('xss')</script>",
    expected: "",
  },
  {
    name: "Disallowed tag (iframe)",
    input: "<iframe></iframe>",
    expected: "",
  },
  {
    name: "Attribute cleaning (onerror)",
    input: '<img src="x" onerror="alert(1)">',
    expected: '<img src="x" loading="lazy">', // Current imp might put lazy at end or beginning, need to check
  },
  {
    name: "Target blank enforcement",
    input: '<a href="http://example.com" target="_blank">Link</a>',
    expected: '<a href="http://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
  },
  {
    name: "Image loading lazy enforcement",
    input: '<img src="cat.jpg">',
    expected: '<img src="cat.jpg" loading="lazy">',
  },
  {
    name: "Nested allowed tags",
    input: "<div><p>Test</p></div>", // div is NOT in allowed tags list in current impl
    expected: "<p>Test</p>", // div should be stripped? Or maybe div is disallowed.
  },
];

// Note: exact output might differ slightly (e.g. order of attributes, closing slash for void elements).
// We will do flexible matching or log the output.

console.log("Running sanitizer verification...");

let failed = 0;

tests.forEach((t) => {
  try {
    const result = sanitizeHtml(t.input);
    // loose check for attributes presence
    const passed =
      result === t.expected ||
      (t.name.includes("Attribute") && result.includes('src="x"') && !result.includes("onerror")) ||
      (t.name.includes("Target") && result.includes('rel="noopener noreferrer"')) ||
      (t.name.includes("Image") && result.includes('loading="lazy"'));

    if (!passed) {
      console.error(`❌ ${t.name} FAILED`);
      console.error(`   Input:    ${t.input}`);
      console.error(`   Expected: ${t.expected}`);
      console.error(`   Actual:   ${result}`);
      failed++;
    } else {
      console.log(`✅ ${t.name} PASSED`);
    }
  } catch (e) {
    console.error(`❌ ${t.name} CRASHED`, e);
    failed++;
  }
});

if (failed > 0) {
  console.error(`\n${failed} tests failed.`);
  process.exit(1);
} else {
  console.log("\nAll tests passed!");
}
