import { sanitizeHtml } from '../lib/security/sanitize-html';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function run() {
  console.log('Running sanitizeHtml verification...');

  // Test 1: Basic tags
  const input1 = '<p>Hello <strong>World</strong></p>';
  const output1 = sanitizeHtml(input1);
  assert(output1 === input1, 'Basic tags should be preserved');

  // Test 2: Script tags
  const input2 = '<script>alert(1)</script>';
  const output2 = sanitizeHtml(input2);
  assert(output2 === '', 'Script tags should be removed');

  // Test 3: Unknown attributes
  const input3 = '<div onclick="alert(1)">Click me</div>';
  const output3 = sanitizeHtml(input3);
  assert(!output3.includes('onclick'), 'onclick attribute should be removed');
  assert(output3.includes('<div>Click me</div>'), 'Content should remain');

  // Test 4: Premature tag closing
  const input4 = '<a title=">"><img src="x" onerror="alert(1)"></a>';
  const output4 = sanitizeHtml(input4);
  console.log('Premature tag closing output:', output4);
  // Expect safe output.
  // With DOMPurify, <a title=">"> is valid.
  // The inner <img src="x" onerror="alert(1)"> is also sanitized.
  // onerror should be gone.
  assert(!output4.includes('onerror'), 'onerror should be removed');

  // Test 5: target="_blank" hook
  const input5 = '<a href="https://example.com" target="_blank">Link</a>';
  const output5 = sanitizeHtml(input5);
  console.log('Target blank output:', output5);
  assert(output5.includes('rel="noopener noreferrer"'), 'target="_blank" should add rel="noopener noreferrer"');

  console.log('🎉 All security checks passed!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
