import fs from 'fs';
import path from 'path';

const middlewarePath = path.join(process.cwd(), 'middleware.ts');

if (!fs.existsSync(middlewarePath)) {
  console.error('❌ middleware.ts not found! It is critical for security.');
  process.exit(1);
}

const content = fs.readFileSync(middlewarePath, 'utf-8');

if (!content.includes('export async function middleware') && !content.includes('export default async function middleware') && !content.includes('export default function middleware')) {
  console.error('❌ middleware.ts does not export "middleware" function properly.');
  process.exit(1);
}

if (!content.includes('updateSession')) {
  console.error('❌ middleware.ts does not seem to call updateSession.');
  process.exit(1);
}

console.log('✅ middleware.ts is correctly configured.');
