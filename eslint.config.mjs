import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated code (Prisma client) — do not lint
    "src/generated/**",
    // GSD framework legacy files (CommonJS)
    "bin/**",
    "hooks/**",
    "scripts/**",
    "agents/**",
    "commands/**",
    "get-shit-done/**",
  ]),
]);

export default eslintConfig;
