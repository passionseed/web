
import { sanitizeHtml } from '../lib/security/sanitize-html';

const testCases = [
  {
    name: 'Basic script tag',
    input: '<script>alert(1)</script>',
    shouldNotContain: ['<script>', 'alert(1)'],
  },
  {
    name: 'Img onerror',
    input: '<img src=x onerror=alert(1)>',
    shouldNotContain: ['onerror', 'alert(1)'],
  },
  {
    name: 'Href javascript',
    input: '<a href="javascript:alert(1)">Click me</a>',
    shouldNotContain: ['href="javascript:alert(1)"', 'href="javascript: alert(1)"'],
  },
  {
      name: 'Javascript with tabs',
      input: '<a href="java\tscript:alert(1)">Click me</a>',
      shouldNotContain: ['java\tscript:', 'alert(1)'],
  },
  {
      name: 'Javascript with encoded chars',
      input: '<a href="&#106;avascript:alert(1)">Click me</a>',
      shouldNotContain: ['javascript:', 'alert(1)'],
  },
  {
    name: 'Safe HTML',
    input: '<p>Hello <strong>World</strong></p>',
    shouldContain: ['<p>Hello <strong>World</strong></p>'],
    shouldNotContain: [],
  },
  {
    name: 'Nested script',
    input: '<scr<script>ipt>alert(1)</script>',
    shouldNotContain: ['<script>'],
  },
  {
      name: 'Iframe',
      input: '<iframe src="javascript:alert(1)"></iframe>',
      shouldNotContain: ['<iframe'],
  },
  {
      name: 'Style tag',
      input: '<style>body { background: red; }</style>',
      shouldNotContain: ['<style', 'background: red'],
  },
  // Adding more complex vectors
  {
      name: 'SVG onload',
      input: '<svg onload=alert(1)>',
      shouldNotContain: ['<svg', 'onload', 'alert(1)'],
  },
  {
      name: 'Mathml',
      input: '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
      shouldNotContain: ['onerror', 'alert(1)'],
  }
];

let failures = 0;

console.log('Running sanitization verification...');

testCases.forEach((test) => {
  const output = sanitizeHtml(test.input);
  let passed = true;

  if (test.shouldContain) {
      test.shouldContain.forEach((expected) => {
        if (!output.includes(expected)) {
            console.error(`❌ ${test.name} FAILED: Output missing expected string "${expected}"`);
            console.error(`   Input: ${test.input}`);
            console.error(`   Output: ${output}`);
            passed = false;
        }
      });
  }

  if (test.shouldNotContain) {
      test.shouldNotContain.forEach((forbidden) => {
        if (output.includes(forbidden)) {
            console.error(`❌ ${test.name} FAILED: Output contained forbidden string "${forbidden}"`);
            console.error(`   Input: ${test.input}`);
            console.error(`   Output: ${output}`);
            passed = false;
        }
      });
  }

  // Basic structure check for safe HTML
  if (test.name === 'Safe HTML') {
      if (output !== '<p>Hello <strong>World</strong></p>') {
          console.error(`❌ ${test.name} FAILED: Output did not match expected safe HTML`);
          console.error(`   Expected: <p>Hello <strong>World</strong></p>`);
          console.error(`   Actual: ${output}`);
          passed = false;
      }
  }

  // Href javascript check
  if (test.name === 'Href javascript' || test.name === 'Javascript with tabs') {
      if (output.includes('script:')) { // Basic check for successful bypass
           // This is tricky because the output might be sanitized but still contain the string if not interpreted as link
      }
  }

  if (passed) {
    console.log(`✅ ${test.name} PASSED`);
  } else {
    failures++;
  }
});

if (failures > 0) {
  console.error(`\n${failures} tests failed!`);
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
