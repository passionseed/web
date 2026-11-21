/**
 * Elemental's pure core, shared by the Discord bot (bot/src/elemental) and the
 * web. No dependencies and no '@/' imports: the bot container ships only the
 * files bot/deploy.sh lists, and its image has no zod or Next.js.
 * lib/elemental/__tests__/imports.test.ts enforces this.
 */
export * from "./elements";
export * from "./pii";
export * from "./time";
