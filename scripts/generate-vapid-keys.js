#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push notifications.
 * Run once, then add the output to your .env file.
 *
 * Usage: node scripts/generate-vapid-keys.js
 */
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("Add these to your environment variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
