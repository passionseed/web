import fs from 'fs';
import path from 'path';

const middlewarePath = path.join(process.cwd(), 'middleware.ts');
const proxyPath = path.join(process.cwd(), 'proxy.ts');

console.log('🔍 Verifying Middleware Configuration...');

// Check if middleware.ts exists
if (fs.existsSync(middlewarePath)) {
  console.log('✅ middleware.ts found.');

  const content = fs.readFileSync(middlewarePath, 'utf-8');

  // Check for export function middleware or export default function middleware
  const hasMiddlewareExport = /export\s+(async\s+)?function\s+middleware/.test(content) ||
                              /export\s+default\s+(async\s+)?function(\s+middleware)?/.test(content);

  if (hasMiddlewareExport) {
    console.log('✅ Middleware function exported correctly.');
    process.exit(0);
  } else {
    console.error('❌ middleware.ts exists but does not export a middleware function.');
    process.exit(1);
  }
} else {
  console.error('❌ middleware.ts NOT found.');

  if (fs.existsSync(proxyPath)) {
    console.log('⚠️  Found proxy.ts instead. This file is likely inactive middleware.');
  }

  process.exit(1);
}
