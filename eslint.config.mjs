import js from "@eslint/js";
import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";
import tseslint from "typescript-eslint";
import eslintConfig from "./config/eslint.mjs";

export default [
  ...eslintConfig(powerbiVisualsConfigs, js, tseslint, { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname }),
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
