import js from "@eslint/js";
import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";
import tseslint from "typescript-eslint";
import eslintConfig from "./config/eslint.mjs";

// Source files resolve to the strict program first, so the type-aware rules see noUncheckedIndexedAccess
export default [
  ...eslintConfig(powerbiVisualsConfigs, js, tseslint, { project: ["./tsconfig.json", "./tsconfig.test.json"], tsconfigRootDir: import.meta.dirname }),
  {
    files: ["src/**/*.ts"],
    rules: {
      // With noUncheckedIndexedAccess on, a check the compiler can prove redundant is noise
      "@typescript-eslint/no-unnecessary-condition": "error"
    }
  },
  {
    files: ["src/frontends/headless.ts", "src/frontends/interactive.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{
          allowTypeImports: true,
          regex: "^\\.\\.?/.+/|^\\./.",
          message: "These bundle separately and read Core from the ccCore global, which has only what Core's index modules export."
        }]
      }]
    }
  }
];
