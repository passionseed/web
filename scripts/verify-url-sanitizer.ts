import { isSafeUrl } from "../lib/security/url-validation";

const testCases = [
  { url: "https://example.com", expected: true },
  { url: "http://example.com", expected: true },
  { url: "/relative/path", expected: true },
  { url: "#anchor", expected: true },
  { url: "mailto:user@example.com", expected: true },
  { url: "tel:+1234567890", expected: true },
  { url: "javascript:alert(1)", expected: false },
  { url: "vbscript:alert(1)", expected: false },
  { url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", expected: false },
  { url: "file:///etc/passwd", expected: false },
  { url: "", expected: false },
  { url: null as any, expected: false },
  { url: undefined as any, expected: false },
];

let failed = false;

console.log("Running URL Sanitizer Verification...");

testCases.forEach(({ url, expected }) => {
  const result = isSafeUrl(url);
  if (result !== expected) {
    console.error(`❌ Failed: URL "${url}" | Expected: ${expected} | Got: ${result}`);
    failed = true;
  } else {
    console.log(`✅ Passed: URL "${url}" -> ${result}`);
  }
});

if (failed) {
  console.error("Verification FAILED.");
  process.exit(1);
} else {
  console.log("Verification PASSED.");
  process.exit(0);
}
