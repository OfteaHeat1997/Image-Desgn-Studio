import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TypeScript strict rules
  ...tseslint.configs.recommended,
  // React Hooks plugin
  {
    plugins: {
      "react-hooks": reactHooks,
    },
  },
  // Custom strict rules
  {
    rules: {
      // Security
      "no-eval": "error",
      "no-implied-eval": "error",

      // Code quality — TypeScript
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Logging
      "no-console": ["warn", { "allow": ["error", "warn"] }],

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Best practices
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-throw-literal": "error",
    },
  },
  // Ignore patterns
  globalIgnores([
    "node_modules/",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/",
    "coverage/",
  ]),
]);

export default eslintConfig;
