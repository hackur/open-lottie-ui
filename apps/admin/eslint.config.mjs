// @ts-check
/**
 * Flat-config ESLint setup for the admin app.
 *
 * Goals (per docs/architecture/mvp.md, M1):
 *   - No errors on the existing app code.
 *   - Catch common React mistakes (missing hook deps, conditional hooks, etc.)
 *     as warnings, not errors.
 *   - `pnpm --filter @open-lottie/admin lint` exits 0.
 *
 * We pin opinionated rules to "warn" rather than "error" so the lint script
 * stays green during M1 build-out; we'll tighten in a later milestone.
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // Ignore generated / vendored output.
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },

  // Base JS recommended.
  js.configs.recommended,

  // TypeScript recommended (non-type-checked — fast, no project graph needed).
  ...tseslint.configs.recommended,

  // App-wide rules.
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // --- React hooks: catch the truly broken stuff as errors, the merely
      // sloppy stuff as warnings.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // --- React: keep modern JSX-runtime happy and don't bikeshed prop-types
      // (we use TypeScript).
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",
      // The escape rule fires noisily on em dashes / quotes in copy. Off.
      "react/no-unescaped-entities": "off",

      // --- @next/next: pull in the recommended Next 15 rules as warnings.
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // <img> bans bite us in M1 because we serve user-supplied animations
      // and don't want the next/image pipeline yet. Downgrade to warn.
      "@next/next/no-img-element": "warn",

      // --- TypeScript: relax a couple of rules that fire on existing code.
      // We use `unknown` heavily for Lottie JSON; explicit-any is opt-in.
      "@typescript-eslint/no-explicit-any": "warn",
      // The codebase intentionally leaves some `_var` placeholders; ignore
      // underscore-prefixed and let the rest fire as warnings.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `as` casts on Lottie JSON are pervasive in M1; treat shape coercion
      // as the author's intent, not a bug.
      "@typescript-eslint/no-non-null-assertion": "warn",
      // `void promise` is a common idiom in this codebase for fire-and-forget;
      // we don't want to fail lint on it.
      "no-empty": ["warn", { allowEmptyCatch: true }],
      // Some narrow `try` blocks intentionally rebind to `as` for shape
      // coercion. Down-grade to warn so M1 stays green.
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },

  // Config file itself: skip type-aware rules.
  {
    files: ["eslint.config.mjs", "*.config.{js,mjs,cjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
