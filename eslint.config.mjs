import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "public/**",
      ".cursor/**",
      ".github/**",
      ".agent/**",
      ".agents/**",
      ".augment/**",
      ".claude/**",
      ".factory/**",
      ".gstack/**",
      ".impeccable/**",
      ".jules/**",
      ".kilocode/**",
      ".mission-readiness/**",
      ".superpowers/**",
      ".superset/**",
      ".trae/**",
      ".vercel/**",
      ".vscode/**",
      ".windsurf/**",
      ".worktrees/**",
      "actions/**",
      "agents/**",
      "archived/**",
      "artifacts/**",
      "bot/**",
      "coverage/**",
      "curriculum/**",
      "data/**",
      "examples/**",
      "plans/**",
      "research/**",
      "scrape/**",
      "scratch/**",
      "skills/**",
      ".tmp*",
      "test-*.js",
      "*.xlsx",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
    settings: {
      next: {
        rootDir: ["./"],
      },
    },
  },
  // Guide content is server-only: client islands get only their block's JSON as props
  // (docs/features/radar-guides-in-code.md 1.1). Client chrome uses lib/radar-guides/index.ts.
  // ESLint cannot see "use client", so this covers all of components/radar; server components
  // there import content through lib/radar-guides/registry.server only from app/ routes.
  {
    files: ["components/radar/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/radar-guides/*/pages/*",
                "@/lib/radar-guides/*/guide",
                "@/lib/radar-guides/*/facts",
                "@/lib/radar-guides/registry.server",
              ],
              message:
                "Guide content is server-only. Pass the block's data as props, or use @/lib/radar-guides (index) for metadata.",
            },
          ],
        },
      ],
    },
  },
];
