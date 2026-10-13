import js from "@eslint/js";
import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";
import tseslint from "typescript-eslint";
import eslintConfig from "./config/eslint.mjs";

export default eslintConfig(powerbiVisualsConfigs, js, tseslint, { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname });
